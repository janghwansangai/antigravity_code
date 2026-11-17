/**
 * 문서 스캔 도우미 (라이브러리 없이 캔버스로 처리)
 *
 * 1) detectDocumentCorners: 책상 위 하얀 종이처럼 '배경보다 밝은 큰 사각형'의 네 모서리를 찾습니다.
 * 2) warpDocument: 네 모서리를 반듯한 직사각형으로 펴 줍니다(원근 보정).
 * 3) enhanceDocument: 그림자를 지우고 글씨를 또렷하게 합니다.
 *
 * 모서리 좌표는 모두 원본 캔버스 픽셀 기준 [{x,y} × 4] (왼쪽 위 → 오른쪽 위 → 오른쪽 아래 → 왼쪽 아래).
 */

const WORK_SIDE = 320; // 모서리 찾기는 작게 줄인 그림으로 빠르게

function defaultCorners(w, h) {
  const mx = w * 0.08;
  const my = h * 0.08;
  return [
    { x: mx, y: my },
    { x: w - mx, y: my },
    { x: w - mx, y: h - my },
    { x: mx, y: h - my }
  ];
}

/** Otsu 방법으로 밝기 기준값 찾기 */
function otsu(gray) {
  const hist = new Array(256).fill(0);
  for (const v of gray) hist[v]++;
  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let thr = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) {
      best = between;
      thr = t;
    }
  }
  return thr;
}

/**
 * 문서 네 모서리 자동 찾기. 못 찾으면 안쪽으로 조금 들어간 사각형을 돌려줍니다.
 * @returns {{ corners, found: boolean }}
 */
export function detectDocumentCorners(canvas) {
  const W = canvas.width;
  const H = canvas.height;
  const scale = Math.min(1, WORK_SIDE / Math.max(W, H));
  const w = Math.max(8, Math.round(W * scale));
  const h = Math.max(8, Math.round(H * scale));
  const small = document.createElement('canvas');
  small.width = w;
  small.height = h;
  const sctx = small.getContext('2d', { willReadFrequently: true });
  sctx.drawImage(canvas, 0, 0, w, h);
  const { data } = sctx.getImageData(0, 0, w, h);
  const gray = new Uint8Array(w * h);
  for (let i = 0, j = 0; i < gray.length; i++, j += 4) gray[i] = (data[j] * 299 + data[j + 1] * 587 + data[j + 2] * 114) / 1000;
  const thr = otsu(gray);

  // 밝은 영역 중 가장 큰 덩어리(4방향 연결)
  const label = new Int32Array(w * h).fill(-1);
  let bestId = -1;
  let bestSize = 0;
  const stack = new Int32Array(w * h);
  let id = 0;
  for (let start = 0; start < gray.length; start++) {
    if (gray[start] <= thr || label[start] !== -1) continue;
    let top = 0;
    stack[top++] = start;
    label[start] = id;
    let size = 0;
    while (top) {
      const p = stack[--top];
      size++;
      const x = p % w;
      const y = (p / w) | 0;
      const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
      for (const q of nb) {
        if (q >= 0 && label[q] === -1 && gray[q] > thr) {
          label[q] = id;
          stack[top++] = q;
        }
      }
    }
    if (size > bestSize) {
      bestSize = size;
      bestId = id;
    }
    id++;
  }

  const area = w * h;
  if (bestId < 0 || bestSize < area * 0.12 || bestSize > area * 0.97) {
    return { corners: defaultCorners(W, H), found: false };
  }
  // 네 모서리 = (x+y) 최소·최대, (x−y) 최대·최소인 점
  let tl = null;
  let br = null;
  let tr = null;
  let bl = null;
  let minS = Infinity;
  let maxS = -Infinity;
  let maxD = -Infinity;
  let minD = Infinity;
  for (let p = 0; p < label.length; p++) {
    if (label[p] !== bestId) continue;
    const x = p % w;
    const y = (p / w) | 0;
    const s = x + y;
    const d = x - y;
    if (s < minS) (minS = s), (tl = { x, y });
    if (s > maxS) (maxS = s), (br = { x, y });
    if (d > maxD) (maxD = d), (tr = { x, y });
    if (d < minD) (minD = d), (bl = { x, y });
  }
  const up = (pt) => ({ x: Math.min(W, Math.max(0, (pt.x + 0.5) / scale)), y: Math.min(H, Math.max(0, (pt.y + 0.5) / scale)) });
  return { corners: [up(tl), up(tr), up(br), up(bl)], found: true };
}

/** 4점 → 4점 원근 변환 행렬(호모그래피) 계산: dst 좌표를 src 좌표로 보내는 행렬 */
function homography(dst, src) {
  // 8개 미지수 선형 방정식 (가우스 소거)
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = dst[i];
    const { x: u, y: v } = src[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  const n = 8;
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    [A[c], A[piv]] = [A[piv], A[c]];
    [b[c], b[piv]] = [b[piv], b[c]];
    const d = A[c][c] || 1e-12;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = A[r][c] / d;
      if (!f) continue;
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  const h = b.map((v, i) => v / A[i][i]);
  return [...h, 1];
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** 네 모서리 안쪽을 반듯한 직사각형 캔버스로 펴서 돌려줍니다. */
export function warpDocument(canvas, corners, maxSide = 2000) {
  const [tl, tr, br, bl] = corners;
  let outW = Math.max(dist(tl, tr), dist(bl, br));
  let outH = Math.max(dist(tl, bl), dist(tr, br));
  const s = Math.min(1, maxSide / Math.max(outW, outH));
  outW = Math.max(16, Math.round(outW * s));
  outH = Math.max(16, Math.round(outH * s));

  const sctx = canvas.getContext('2d', { willReadFrequently: true });
  const src = sctx.getImageData(0, 0, canvas.width, canvas.height);
  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  const octx = out.getContext('2d');
  const dst = octx.createImageData(outW, outH);
  const H = homography(
    [
      { x: 0, y: 0 },
      { x: outW - 1, y: 0 },
      { x: outW - 1, y: outH - 1 },
      { x: 0, y: outH - 1 }
    ],
    corners
  );
  const sw = src.width;
  const sh = src.height;
  const sd = src.data;
  const dd = dst.data;
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const z = H[6] * x + H[7] * y + H[8];
      const u = (H[0] * x + H[1] * y + H[2]) / z;
      const v = (H[3] * x + H[4] * y + H[5]) / z;
      const o = (y * outW + x) * 4;
      if (u < 0 || v < 0 || u >= sw - 1 || v >= sh - 1) {
        dd[o] = dd[o + 1] = dd[o + 2] = 255;
        dd[o + 3] = 255;
        continue;
      }
      const x0 = u | 0;
      const y0 = v | 0;
      const fx = u - x0;
      const fy = v - y0;
      const i00 = (y0 * sw + x0) * 4;
      const i10 = i00 + 4;
      const i01 = i00 + sw * 4;
      const i11 = i01 + 4;
      for (let c = 0; c < 3; c++) {
        const top = sd[i00 + c] * (1 - fx) + sd[i10 + c] * fx;
        const bot = sd[i01 + c] * (1 - fx) + sd[i11 + c] * fx;
        dd[o + c] = top * (1 - fy) + bot * fy;
      }
      dd[o + 3] = 255;
    }
  }
  octx.putImageData(dst, 0, 0);
  return out;
}

/** 큰 상자 흐림(배경 밝기 추정용) */
function boxBlurGray(gray, w, h, r) {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    let acc = 0;
    const row = y * w;
    for (let x = -r; x <= r; x++) acc += gray[row + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = acc / (2 * r + 1);
      acc += gray[row + Math.min(w - 1, x + r + 1)] - gray[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / (2 * r + 1);
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

/**
 * 문서를 또렷하게: 'color'(그림자 지우고 선명한 색) | 'gray'(흑백 문서) | 'none'
 * 캔버스를 직접 고칩니다.
 */
export function enhanceDocument(canvas, mode = 'color') {
  if (mode === 'none') return canvas;
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const gray = new Float32Array(w * h);
  for (let i = 0, j = 0; i < gray.length; i++, j += 4) gray[i] = d[j] * 0.299 + d[j + 1] * 0.587 + d[j + 2] * 0.114;
  const bg = boxBlurGray(gray, w, h, Math.max(8, Math.round(Math.max(w, h) / 40)));
  for (let i = 0, j = 0; i < gray.length; i++, j += 4) {
    const k = 245 / Math.max(40, bg[i]); // 종이 배경을 흰색으로 맞추는 비율 (그림자 제거)
    if (mode === 'gray') {
      let v = gray[i] * k;
      v = (v - 40) * 1.35; // 대비 높이기
      v = v < 0 ? 0 : v > 255 ? 255 : v;
      d[j] = d[j + 1] = d[j + 2] = v;
    } else {
      for (let c = 0; c < 3; c++) {
        let v = d[j + c] * k;
        v = (v - 18) * 1.12;
        d[j + c] = v < 0 ? 0 : v > 255 ? 255 : v;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
