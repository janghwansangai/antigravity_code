/**
 * 사진 고치기 창
 *   ↺ ↻ 돌리기 · ✂️ 자르기 · 📄 문서 반듯하게(스캔) · ▦ 모자이크 · 😊 스티커 · ↩ 되돌리기
 *
 * - 활동 사진에서 원하지 않는 사람(얼굴)은 모자이크나 스티커로 가립니다.
 * - 저장하면 고친 결과만 새 사진으로 저장되고, 원래 사진은 저장소에서 지워집니다.
 *
 *   openPhotoEditor(src, { tool, type }) → Promise<{ blob, width, height } | null>  (취소하면 null)
 *     src  : 사진 주소(blob:/data:) 또는 Blob
 *     tool : 처음 고른 도구 'mosaic' | 'sticker' | 'crop' | 'scan'
 *     type : 원래 사진 형식(투명 배경 유지 여부 판단)
 */
import { canvasToBlob, loadImage, mayHaveAlpha } from '../utils/files.js';
import { detectDocumentCorners, enhanceDocument, warpDocument } from '../utils/scan.js';

const STICKERS = ['😊', '🙂', '😎', '⭐', '🌸', '🐻', '🐰', '❤️', '🍀', '🎈'];
const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif';
const MAX_UNDO = 10;
const RATIOS = [
  ['free', '자유'],
  ['1', '1:1'],
  ['1.3333', '4:3'],
  ['0.75', '3:4'],
  ['1.7778', '16:9']
];
const HINTS = {
  mosaic: '가리고 싶은 얼굴을 손가락이나 마우스로 문지르면 모자이크가 돼요.',
  sticker: '스티커를 고른 뒤, 가리고 싶은 곳을 누르면 붙어요.',
  crop: '네모의 모서리를 끌어 남길 부분을 정한 뒤 ‘자르기’를 누르세요.',
  scan: '문서의 네 모서리에 동그라미를 맞추고 ‘반듯하게 펴기’를 누르세요. (자동으로 찾아 놓았어요)'
};

function copyCanvas(src) {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}

/** 사진 전체를 모자이크(큰 네모 픽셀)로 만든 캔버스 */
function pixelate(src) {
  const block = Math.max(8, Math.round(Math.max(src.width, src.height) / 45));
  const small = document.createElement('canvas');
  small.width = Math.max(1, Math.ceil(src.width / block));
  small.height = Math.max(1, Math.ceil(src.height / block));
  small.getContext('2d').drawImage(src, 0, 0, small.width, small.height);
  const big = document.createElement('canvas');
  big.width = src.width;
  big.height = src.height;
  const ctx = big.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, big.width, big.height);
  return big;
}

export function openPhotoEditor(src, { tool: firstTool = 'mosaic', type = '' } = {}) {
  return new Promise((resolve) => {
    const ownUrl = src instanceof Blob ? URL.createObjectURL(src) : null;
    const srcUrl = ownUrl || src;
    const keepAlpha = mayHaveAlpha(type || (src instanceof Blob ? src.type : String(src).slice(0, 30)));

    const root = document.createElement('div');
    root.className = 'modal photo-editor';
    root.innerHTML = `
      <div class="modal-card pe-card" role="dialog" aria-modal="true" aria-labelledby="pe-title">
        <div class="modal-head">
          <h2 id="pe-title">✏️ 사진 고치기</h2>
          <button type="button" class="btn btn-ghost btn-sm" data-pe="cancel" aria-label="닫기">✕</button>
        </div>
        <div class="pe-tools" role="toolbar" aria-label="사진 고치기 도구">
          <button type="button" class="pe-btn" data-pe="rotate-left" title="왼쪽으로 돌리기">↺<span>왼쪽</span></button>
          <button type="button" class="pe-btn" data-pe="rotate-right" title="오른쪽으로 돌리기">↻<span>오른쪽</span></button>
          <span class="pe-sep" aria-hidden="true"></span>
          <button type="button" class="pe-btn" data-pe="tool" data-tool="crop">✂️<span>자르기</span></button>
          <button type="button" class="pe-btn" data-pe="tool" data-tool="scan">📄<span>문서 스캔</span></button>
          <button type="button" class="pe-btn" data-pe="tool" data-tool="mosaic">▦<span>모자이크</span></button>
          <button type="button" class="pe-btn" data-pe="tool" data-tool="sticker">😊<span>스티커</span></button>
          <span class="pe-sep" aria-hidden="true"></span>
          <button type="button" class="pe-btn" data-pe="undo" title="되돌리기" disabled>↩<span>되돌리기</span></button>
        </div>
        <div class="pe-options">
          <label class="pe-size" data-for="mosaic sticker">크기 <input type="range" min="2" max="20" value="9" data-pe="size" aria-label="붓·스티커 크기" /></label>
          <div class="pe-stickers" data-for="sticker">${STICKERS.map(
            (s, i) => `<button type="button" class="pe-sticker${i === 0 ? ' is-on' : ''}" data-pe="sticker" data-s="${s}">${s}</button>`
          ).join('')}</div>
          <div class="pe-ratios" data-for="crop">${RATIOS.map(
            ([v, l], i) => `<button type="button" class="pe-chip${i === 0 ? ' is-on' : ''}" data-pe="ratio" data-r="${v}">${l}</button>`
          ).join('')}<button type="button" class="btn btn-primary btn-sm" data-pe="apply-crop">✂️ 자르기</button></div>
          <div class="pe-scan" data-for="scan">
            <button type="button" class="pe-chip" data-pe="detect">🔍 자동 찾기</button>
            <select class="select pe-filter" data-pe="filter" aria-label="스캔 효과">
              <option value="color">선명한 색</option>
              <option value="gray">흑백 문서</option>
              <option value="none">원래 색</option>
            </select>
            <button type="button" class="btn btn-primary btn-sm" data-pe="apply-scan">📄 반듯하게 펴기</button>
          </div>
        </div>
        <p class="pe-hint" data-pe-hint></p>
        <div class="pe-stage">
          <div class="pe-wrap">
            <canvas class="pe-canvas" aria-label="고칠 사진"></canvas>
            <div class="pe-overlay" aria-hidden="true"></div>
          </div>
        </div>
        <p class="pe-note">💡 저장하면 원래 사진은 지워지고, 고친 사진만 남아요.</p>
        <div class="pe-actions">
          <button type="button" class="btn" data-pe="cancel">취소</button>
          <button type="button" class="btn btn-primary" data-pe="save">✓ 저장</button>
        </div>
      </div>`;
    document.body.appendChild(root);

    const canvas = root.querySelector('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const overlay = root.querySelector('.pe-overlay');
    const undoBtn = root.querySelector('[data-pe="undo"]');
    const sizeInput = root.querySelector('[data-pe="size"]');
    const hint = root.querySelector('[data-pe-hint]');
    const filterSel = root.querySelector('[data-pe="filter"]');
    const undo = [];
    let edits = 0;
    let tool = firstTool;
    let sticker = STICKERS[0];
    let ratio = 0; // 0 = 자유
    let pixels = null;
    let drawing = false;
    let last = null;
    let crop = null; // { x, y, w, h } (사진 픽셀)
    let corners = null; // 문서 네 모서리
    let drag = null;
    root.querySelectorAll('[data-for]').forEach((el) => (el.hidden = true));

    const brushRadius = () => (Math.max(canvas.width, canvas.height) * Number(sizeInput.value)) / 200;
    const displayScale = () => canvas.getBoundingClientRect().width / (canvas.width || 1);

    function pushUndo() {
      undo.push(copyCanvas(canvas));
      if (undo.length > MAX_UNDO) undo.shift();
      undoBtn.disabled = false;
      edits++;
    }

    function point(e) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: Math.min(canvas.width, Math.max(0, ((e.clientX - rect.left) / rect.width) * canvas.width)),
        y: Math.min(canvas.height, Math.max(0, ((e.clientY - rect.top) / rect.height) * canvas.height))
      };
    }

    /* ---------- 자르기·스캔 손잡이 그리기 ---------- */
    function resetCrop() {
      const mx = canvas.width * 0.06;
      const my = canvas.height * 0.06;
      crop = { x: mx, y: my, w: canvas.width - 2 * mx, h: canvas.height - 2 * my };
      if (ratio) fitRatio('br');
    }

    function fitRatio(anchor) {
      if (!ratio || !crop) return;
      let { x, y, w, h } = crop;
      h = w / ratio;
      if (y + h > canvas.height) {
        h = canvas.height - y;
        w = h * ratio;
      }
      if (x + w > canvas.width) {
        w = canvas.width - x;
        h = w / ratio;
      }
      if (anchor === 'tl' || anchor === 'tr') y = crop.y + crop.h - h;
      if (anchor === 'tl' || anchor === 'bl') x = crop.x + crop.w - w;
      crop = { x: Math.max(0, x), y: Math.max(0, y), w, h };
    }

    function drawOverlay() {
      const k = displayScale();
      if (tool === 'crop' && crop) {
        const { x, y, w, h } = crop;
        overlay.innerHTML = `
          <div class="pe-crop" data-h="move" style="left:${x * k}px;top:${y * k}px;width:${w * k}px;height:${h * k}px">
            <i class="pe-grip" data-h="tl"></i><i class="pe-grip" data-h="tr"></i><i class="pe-grip" data-h="br"></i><i class="pe-grip" data-h="bl"></i>
          </div>`;
      } else if (tool === 'scan' && corners) {
        const pts = corners.map((p) => `${p.x * k},${p.y * k}`).join(' ');
        overlay.innerHTML = `
          <svg class="pe-poly" width="100%" height="100%"><polygon points="${pts}" /></svg>
          ${corners.map((p, i) => `<i class="pe-dot" data-h="c${i}" style="left:${p.x * k}px;top:${p.y * k}px"></i>`).join('')}`;
      } else {
        overlay.innerHTML = '';
      }
      overlay.classList.toggle('is-active', tool === 'crop' || tool === 'scan');
    }

    function setTool(next) {
      tool = next;
      root.querySelectorAll('[data-pe="tool"]').forEach((b) => {
        const on = b.dataset.tool === tool;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', String(on));
      });
      root.querySelectorAll('[data-for]').forEach((el) => {
        el.hidden = !el.dataset.for.split(' ').includes(tool);
      });
      hint.textContent = HINTS[tool] || '';
      if (tool === 'crop') resetCrop();
      if (tool === 'scan') corners = detectDocumentCorners(canvas).corners;
      canvas.classList.toggle('is-brush', tool === 'mosaic' || tool === 'sticker');
      drawOverlay();
    }

    function replaceCanvas(next) {
      canvas.width = next.width;
      canvas.height = next.height;
      ctx.drawImage(next, 0, 0);
    }

    function rotate(dir) {
      pushUndo();
      const src2 = copyCanvas(canvas);
      canvas.width = src2.height;
      canvas.height = src2.width;
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((dir * Math.PI) / 2);
      ctx.drawImage(src2, -src2.width / 2, -src2.height / 2);
      ctx.restore();
      if (tool === 'crop') resetCrop();
      if (tool === 'scan') corners = detectDocumentCorners(canvas).corners;
      requestAnimationFrame(drawOverlay);
    }

    function applyCrop() {
      if (!crop || crop.w < 4 || crop.h < 4) return;
      pushUndo();
      const out = document.createElement('canvas');
      out.width = Math.round(crop.w);
      out.height = Math.round(crop.h);
      out.getContext('2d').drawImage(canvas, crop.x, crop.y, crop.w, crop.h, 0, 0, out.width, out.height);
      replaceCanvas(out);
      setTool('mosaic');
      hint.textContent = '✂️ 잘랐어요. 더 고칠 게 없으면 ‘저장’을 누르세요.';
    }

    function applyScan() {
      if (!corners) return;
      pushUndo();
      const flat = warpDocument(canvas, corners);
      enhanceDocument(flat, filterSel.value);
      replaceCanvas(flat);
      setTool('mosaic');
      hint.textContent = '📄 반듯하게 폈어요. 더 고칠 게 없으면 ‘저장’을 누르세요.';
    }

    /* ---------- 모자이크·스티커 ---------- */
    function dab(p) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, brushRadius(), 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(pixels, 0, 0);
      ctx.restore();
    }

    function strokeTo(p) {
      const step = Math.max(2, brushRadius() / 3);
      const dx = p.x - last.x;
      const dy = p.y - last.y;
      const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / step));
      for (let i = 1; i <= n; i++) dab({ x: last.x + (dx * i) / n, y: last.y + (dy * i) / n });
      last = p;
    }

    canvas.addEventListener('pointerdown', (e) => {
      if (!canvas.width || (tool !== 'mosaic' && tool !== 'sticker')) return;
      e.preventDefault();
      const p = point(e);
      pushUndo();
      if (tool === 'sticker') {
        const size = brushRadius() * 2.6;
        ctx.save();
        ctx.font = `${size}px ${EMOJI_FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sticker, p.x, p.y);
        ctx.restore();
        return;
      }
      pixels = pixelate(canvas);
      drawing = true;
      last = p;
      dab(p);
      canvas.setPointerCapture?.(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (drawing) strokeTo(point(e));
    });
    const endStroke = () => {
      drawing = false;
      pixels = null;
    };
    canvas.addEventListener('pointerup', endStroke);
    canvas.addEventListener('pointercancel', endStroke);

    /* ---------- 손잡이 끌기 (자르기·스캔) ---------- */
    overlay.addEventListener('pointerdown', (e) => {
      const h = e.target.closest('[data-h]');
      if (!h) return;
      e.preventDefault();
      drag = { h: h.dataset.h, start: point(e), crop: crop && { ...crop } };
      overlay.setPointerCapture?.(e.pointerId);
    });
    overlay.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const p = point(e);
      if (drag.h.startsWith('c')) {
        corners[Number(drag.h.slice(1))] = p;
      } else if (drag.h === 'move') {
        const c = drag.crop;
        crop = {
          ...c,
          x: Math.min(canvas.width - c.w, Math.max(0, c.x + p.x - drag.start.x)),
          y: Math.min(canvas.height - c.h, Math.max(0, c.y + p.y - drag.start.y))
        };
      } else {
        const c = drag.crop;
        let x1 = c.x;
        let y1 = c.y;
        let x2 = c.x + c.w;
        let y2 = c.y + c.h;
        if (drag.h.includes('l')) x1 = Math.min(p.x, x2 - 16);
        if (drag.h.includes('r')) x2 = Math.max(p.x, x1 + 16);
        if (drag.h.includes('t')) y1 = Math.min(p.y, y2 - 16);
        if (drag.h.includes('b')) y2 = Math.max(p.y, y1 + 16);
        crop = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
        fitRatio(drag.h);
      }
      drawOverlay();
    });
    const endDrag = () => (drag = null);
    overlay.addEventListener('pointerup', endDrag);
    overlay.addEventListener('pointercancel', endDrag);
    const onResize = () => drawOverlay();
    window.addEventListener('resize', onResize);

    /* ---------- 열기·닫기 ---------- */
    function close(result) {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      root.remove();
      if (ownUrl) URL.revokeObjectURL(ownUrl);
      resolve(result);
    }

    function onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (!edits || confirm('고친 내용을 버리고 닫을까요?')) close(null);
      }
    }
    document.addEventListener('keydown', onKey);

    root.addEventListener('click', async (e) => {
      if (e.target === root) return;
      const el = e.target.closest('[data-pe]');
      if (!el) return;
      const act = el.dataset.pe;
      if (act === 'cancel') {
        if (!edits || confirm('고친 내용을 버리고 닫을까요?')) close(null);
      } else if (act === 'save') {
        if (!edits) return close(null);
        el.disabled = true;
        try {
          const blob = await canvasToBlob(canvas, keepAlpha);
          close({ blob, width: canvas.width, height: canvas.height });
        } catch {
          el.disabled = false;
        }
      } else if (act === 'rotate-left') rotate(-1);
      else if (act === 'rotate-right') rotate(1);
      else if (act === 'tool') setTool(el.dataset.tool);
      else if (act === 'sticker') {
        sticker = el.dataset.s;
        root.querySelectorAll('.pe-sticker').forEach((b) => b.classList.toggle('is-on', b === el));
      } else if (act === 'ratio') {
        ratio = el.dataset.r === 'free' ? 0 : Number(el.dataset.r);
        root.querySelectorAll('[data-pe="ratio"]').forEach((b) => b.classList.toggle('is-on', b === el));
        resetCrop();
        drawOverlay();
      } else if (act === 'apply-crop') applyCrop();
      else if (act === 'detect') {
        const r = detectDocumentCorners(canvas);
        corners = r.corners;
        hint.textContent = r.found ? '🔍 문서를 찾았어요. 모서리가 맞는지 확인하세요.' : '문서를 찾지 못했어요. 동그라미를 직접 문서 모서리로 옮겨 주세요.';
        drawOverlay();
      } else if (act === 'apply-scan') applyScan();
      else if (act === 'undo' && undo.length) {
        replaceCanvas(undo.pop());
        undoBtn.disabled = undo.length === 0;
        edits--;
        if (tool === 'crop') resetCrop();
        if (tool === 'scan') corners = detectDocumentCorners(canvas).corners;
        drawOverlay();
      }
    });

    loadImage(srcUrl)
      .then((img) => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        setTool(firstTool);
        requestAnimationFrame(drawOverlay);
      })
      .catch(() => {
        hint.textContent = '사진을 열 수 없어요.';
      });
    root.querySelector('[data-pe="save"]').focus();
  });
}
