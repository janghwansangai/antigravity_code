/**
 * 🚀 갤러리에 공유하기: 올릴 파일 만들기
 *
 *   PDF (추천)  — 쪽마다 그림으로 그린 A4 PDF. 가볍고 어느 기기에서나 빨리 열림. 동영상은 썸네일.
 *   웹페이지 ZIP — 디자인·분류 버튼·동영상 재생 그대로. 사진은 긴 변 1280px로 줄이고,
 *                 큰 동영상·첨부파일은 빼서(썸네일·안내만) 갤러리에서 빨리 열리게 함.
 *   썸네일      — 갤러리 카드에 보일 작은 그림(대표 사진, 없으면 제목 카드)
 *
 * 화면에 보이는 포트폴리오(디자인 15종)와 똑같이 그리는 것은 '웹페이지 ZIP'이고,
 * PDF는 같은 글·사진을 A4에 깔끔하게 정리한 공유용 문서입니다(고른 디자인의 색을 씀).
 */
import { getTemplateMeta, getWorkVisuals } from '../templates/portfolioRenderer.js';
import { dataUrlToBlob, safeFileName, shrinkImage } from '../utils/files.js';
import { walkMedia } from '../media/model.js';
import { buildJpegPdf } from '../utils/pdfWriter.js';

/* ================================================================== */
/* 공유용 PDF                                                          */
/* ================================================================== */
const W = 1240; // A4 150dpi
const H = 1754;
const M = 100; // 여백
const FOOT = 80; // 아래 쪽 번호 칸
const CW = W - M * 2;
const FONT = "'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Nanum Gothic', sans-serif";
const MAX_PAGES = 80;
const TEXT = '#1F2937';
const MUTED = '#6B7280';

const font = (size, weight = 400) => `${weight} ${size}px ${FONT}`;

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return [30, 58, 95];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;

/** 한국어 줄바꿈: 띄어쓰기 단위로, 너무 긴 낱말은 글자 단위로 */
function wrapText(ctx, text, maxW) {
  const lines = [];
  const breakLong = (word) => {
    const out = [];
    let part = '';
    for (const ch of word) {
      if (part && ctx.measureText(part + ch).width > maxW) {
        out.push(part);
        part = ch;
      } else part += ch;
    }
    return { full: out, rest: part };
  };
  for (const para of String(text || '').split(/\r?\n/)) {
    if (!para.trim()) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of para.split(/(\s+)/)) {
      if (!word) continue;
      const test = line + word;
      if (ctx.measureText(test).width <= maxW) {
        line = test;
        continue;
      }
      if (/^\s+$/.test(word)) continue; // 줄 끝 띄어쓰기는 버림
      if (line.trim()) lines.push(line.trimEnd());
      line = '';
      if (ctx.measureText(word).width > maxW) {
        const { full, rest } = breakLong(word);
        lines.push(...full);
        line = rest;
      } else line = word;
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

async function bitmapOf(media) {
  const blob = media?.blob || (media?.dataUrl ? dataUrlToBlob(media.dataUrl) : null);
  if (!blob) return null;
  try {
    return await createImageBitmap(blob);
  } catch {
    // 일부 브라우저: <img>로 대신 읽기
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } catch {
      return null;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

const sizeOf = (img) => ({ w: img.width || img.naturalWidth, h: img.height || img.naturalHeight });

/** 꽉 채워 자르기(object-fit: cover) */
function drawCover(ctx, img, x, y, w, h, r = 18) {
  ctx.save();
  roundRectPath(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.fillStyle = '#EEF0F3';
  ctx.fillRect(x, y, w, h);
  if (img) {
    const { w: iw, h: ih } = sizeOf(img);
    const s = Math.max(w / iw, h / ih);
    const sw = w / s;
    const sh = h / s;
    ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
  }
  ctx.restore();
}

function drawPlay(ctx, cx, cy, r) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.32, cy - r * 0.45);
  ctx.lineTo(cx + r * 0.5, cy);
  ctx.lineTo(cx - r * 0.32, cy + r * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function ellipsis(ctx, text, maxW) {
  let t = String(text || '');
  if (ctx.measureText(t).width <= maxW) return t;
  while (t && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t}…`;
}

/** 쪽 넘김을 알아서 하는 그리기 도구 */
class Pager {
  constructor({ footerText, onPage }) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = this.canvas.getContext('2d');
    this.footerText = footerText;
    this.onPage = onPage;
    this.pages = [];
    this.y = M;
    this.open = false;
  }

  get room() {
    return H - FOOT - this.y;
  }

  start() {
    const { ctx } = this;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);
    this.y = M;
    this.open = true;
  }

  async newPage() {
    if (this.open) await this.finish();
    if (this.pages.length >= MAX_PAGES) throw new Error('too many pages');
    this.start();
  }

  async ensure(h) {
    if (!this.open) this.start();
    if (h > this.room && this.y > M) await this.newPage();
  }

  async finish() {
    if (!this.open) return;
    const { ctx } = this;
    const n = this.pages.length + 1;
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(M, H - FOOT + 14);
    ctx.lineTo(W - M, H - FOOT + 14);
    ctx.stroke();
    ctx.font = font(20);
    ctx.fillStyle = MUTED;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillText(ellipsis(ctx, this.footerText, CW - 120), M, H - FOOT / 2 + 12);
    ctx.textAlign = 'right';
    ctx.fillText(String(n), W - M, H - FOOT / 2 + 12);
    ctx.textAlign = 'left';
    const blob = await new Promise((r) => this.canvas.toBlob(r, 'image/jpeg', 0.84));
    this.pages.push({ bytes: new Uint8Array(await blob.arrayBuffer()), width: W, height: H });
    this.open = false;
    this.onPage?.(n);
  }

  /** 여러 줄 글 (줄마다 쪽 넘김 확인) */
  async text(str, { size = 28, weight = 400, color = TEXT, lineH = Math.round(size * 1.7), x = M, maxW = CW, bar = null } = {}) {
    const { ctx } = this;
    ctx.font = font(size, weight);
    const lines = wrapText(ctx, str, maxW);
    for (const line of lines) {
      await this.ensure(lineH);
      ctx.font = font(size, weight);
      ctx.fillStyle = color;
      ctx.textBaseline = 'alphabetic';
      if (bar) {
        ctx.save();
        ctx.fillStyle = bar;
        ctx.fillRect(x - 26, this.y, 6, lineH);
        ctx.restore();
      }
      ctx.fillText(line, x, this.y + Math.round(lineH * 0.72));
      this.y += lineH;
    }
  }
}

/** 사진·동영상 격자 */
async function drawVisuals(pg, work, visuals) {
  if (!visuals.length) return;
  const { ctx } = pg;
  const layout = String(work.photoLayout || 'auto');
  const n = visuals.length;
  const cols = /^[234]$/.test(layout) ? Math.min(Number(layout), n) : n === 1 ? 1 : n <= 4 ? 2 : 3;
  const gap = 22;
  const cellW = (CW - gap * (cols - 1)) / cols;
  const portrait = visuals.filter((v) => (v.height || 0) > (v.width || 0)).length > n / 2;
  const capH = visuals.some((v) => String(v.caption || '').trim()) ? 40 : 0;
  for (let i = 0; i < n; i += cols) {
    const row = visuals.slice(i, i + cols);
    let cellH;
    if (cols === 1) {
      const v = row[0];
      const ratio = v.width > 0 && v.height > 0 ? v.height / v.width : 0.75;
      cellH = Math.min(Math.round(cellW * ratio), 980);
    } else cellH = Math.round(cellW * (portrait ? 4 / 3 : 3 / 4));
    await pg.ensure(cellH + capH + gap);
    for (const [j, v] of row.entries()) {
      const x = M + j * (cellW + gap);
      const img = await bitmapOf(v.kind === 'video' ? v.poster : v);
      if (cols === 1 && img) {
        // 한 장일 때는 자르지 않고 비율대로 (가운데 정렬)
        const { w: iw, h: ih } = sizeOf(img);
        const s = Math.min(cellW / iw, cellH / ih);
        const dw = iw * s;
        const dh = ih * s;
        drawCover(ctx, img, x + (cellW - dw) / 2, pg.y, dw, dh);
        if (v.kind === 'video') drawPlay(ctx, x + cellW / 2, pg.y + dh / 2, 48);
      } else {
        drawCover(ctx, img, x, pg.y, cellW, cellH);
        if (v.kind === 'video') drawPlay(ctx, x + cellW / 2, pg.y + cellH / 2, Math.min(48, cellW / 6));
      }
      img?.close?.();
      const cap = String(v.caption || '').trim();
      if (cap) {
        ctx.font = font(22);
        ctx.fillStyle = MUTED;
        ctx.fillText(ellipsis(ctx, cap, cellW), x, pg.y + cellH + 30);
      }
    }
    pg.y += cellH + capH + gap;
  }
}

/** PDF 자료의 고른 쪽 그림 */
async function drawDocs(pg, attachments) {
  const { ctx } = pg;
  for (const a of attachments) {
    const pages = Array.isArray(a.pages) ? a.pages : [];
    const pick = (Array.isArray(a.docPages) ? a.docPages : []).map((i) => pages[i]).filter(Boolean);
    if (!pick.length) continue;
    const cols = Math.min(Math.max(Number(a.docCols) || 2, 1), 3, pick.length);
    const gap = 18;
    const cellW = (CW - gap * (cols - 1)) / cols;
    // 제목이 쪽 끝에 혼자 남지 않게: 제목 + 첫 줄이 들어갈 자리를 먼저 확인
    const firstH = Math.max(...pick.slice(0, cols).map((p) => (p.width > 0 ? (p.height / p.width) * cellW : cellW * 1.41)));
    await pg.ensure(Math.min(40 + firstH, H - FOOT - M));
    await pg.text(`자료: ${a.name || 'PDF'}`, { size: 22, weight: 700, color: MUTED, lineH: 40 });
    for (let i = 0; i < pick.length; i += cols) {
      const row = pick.slice(i, i + cols);
      const cellH = Math.round(Math.max(...row.map((p) => (p.width > 0 ? (p.height / p.width) * cellW : cellW * 1.41))));
      await pg.ensure(Math.min(cellH, H - FOOT - M) + gap);
      const h = Math.min(cellH, pg.room);
      for (const [j, p] of row.entries()) {
        const x = M + j * (cellW + gap);
        const img = await bitmapOf(p);
        if (img) {
          const { w: iw, h: ih } = sizeOf(img);
          const s = Math.min(cellW / iw, h / ih);
          ctx.drawImage(img, x, pg.y, iw * s, ih * s);
          ctx.strokeStyle = '#D1D5DB';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, pg.y, iw * s, ih * s);
          img.close?.();
        }
      }
      pg.y += h + gap;
    }
  }
}

function allText(state) {
  const p = state.profile || {};
  return [
    ...Object.values(p),
    ...(state.works || []).flatMap((w) => [w.title, w.subject, w.projectName, w.content, w.reflection, w.semester, w.month, ...(w.attachments || []).map((a) => a.name)]),
    '0123456789 포트폴리오 차례 나를 소개합니다 배우고 느낀 점 자료 첨부파일 이름 학교 학년·반 학년도 맡은 역할 함께한 과목 프로젝트 교과'
  ].join(' ');
}

/** 구글 글꼴(Noto Sans KR)이 쓸 글자 조각을 미리 받아 둠 (인터넷이 없으면 기본 글꼴) */
async function loadFonts(state) {
  if (!document.fonts?.load) return;
  const sample = allText(state);
  const jobs = [400, 700, 800].map((w) => document.fonts.load(`${w} 30px 'Noto Sans KR'`, sample).catch(() => null));
  await Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, 5000))]);
}

function firstCoverVisual(state) {
  for (const w of state.works || []) {
    const v = getWorkVisuals(w)[0];
    if (v) return v.kind === 'video' ? v.poster : v;
  }
  return null;
}

const tagOf = (w) => (w.entryType === 'project' ? `프로젝트 · ${w.projectName || ''}` : w.subject || '교과');

/**
 * @param {object} state
 * @param {(text:string)=>void} onProgress
 * @returns {Promise<Blob>} application/pdf
 */
export async function buildSharePdf(state, onProgress = () => {}) {
  const tpl = getTemplateMeta(state.selectedTemplate);
  const accentHex = tpl.colors.printAccent || (tpl.id === 'showcase' ? '#0F766E' : tpl.colors.accent);
  const accent = hexToRgb(accentHex);
  const ac = rgba(accent, 1);
  const soft = rgba(accent, 0.09);
  const p = state.profile || {};
  const works = state.works || [];
  onProgress('글꼴 준비 중…');
  await loadFonts(state);

  const pg = new Pager({
    footerText: [p.studentName, p.portfolioTitle || '나의 포트폴리오'].filter(Boolean).join(' · '),
    onPage: (n) => onProgress(`PDF 만드는 중… ${n}쪽`)
  });
  const { ctx } = pg;

  /* ---------- 표지 ---------- */
  pg.start();
  ctx.fillStyle = soft;
  ctx.fillRect(0, 0, W, 16);
  ctx.fillStyle = ac;
  ctx.fillRect(0, 0, W * 0.35, 16);
  pg.y = M + 10;
  await pg.text(`${p.academicYear || ''} 포트폴리오`.trim(), { size: 28, weight: 700, color: ac, lineH: 50 });
  pg.y += 6;
  await pg.text(p.portfolioTitle || '나의 포트폴리오', { size: 62, weight: 800, lineH: 84 });
  if (p.subtitle) {
    pg.y += 6;
    await pg.text(p.subtitle, { size: 30, color: MUTED, lineH: 48 });
  }
  pg.y += 30;
  const cover = await bitmapOf(firstCoverVisual(state));
  if (cover) {
    const { w: iw, h: ih } = sizeOf(cover);
    const h = Math.min(Math.round((CW * ih) / iw), 640);
    await pg.ensure(h + 30);
    drawCover(ctx, cover, M, pg.y, CW, h, 28);
    cover.close?.();
    pg.y += h + 36;
  }
  const info = [
    ['이름', p.studentName],
    ['학교', p.schoolName],
    ['학년·반', p.gradeClass]
  ].filter(([, v]) => v);
  if (info.length) {
    const boxH = 40 + info.length * 50;
    await pg.ensure(boxH + 30);
    ctx.fillStyle = soft;
    roundRectPath(ctx, M, pg.y, CW, boxH, 20);
    ctx.fill();
    info.forEach(([k, v], i) => {
      const ty = pg.y + 55 + i * 50;
      ctx.font = font(26, 700);
      ctx.fillStyle = ac;
      ctx.fillText(k, M + 34, ty);
      ctx.font = font(28);
      ctx.fillStyle = TEXT;
      ctx.fillText(ellipsis(ctx, v, CW - 220), M + 190, ty);
    });
    pg.y += boxH + 36;
  }
  if (p.introText) {
    await pg.text('나를 소개합니다', { size: 32, weight: 800, color: ac, lineH: 56 });
    await pg.text(p.introText, { size: 28, lineH: 48 });
    pg.y += 26;
  }
  if (works.length) {
    await pg.ensure(140);
    await pg.text('차례', { size: 32, weight: 800, color: ac, lineH: 56 });
    for (const [i, w] of works.entries()) {
      await pg.ensure(48);
      ctx.font = font(26, 700);
      ctx.fillStyle = ac;
      ctx.fillText(String(i + 1).padStart(2, '0'), M, pg.y + 34);
      ctx.font = font(26);
      ctx.fillStyle = TEXT;
      const tag = tagOf(w);
      ctx.fillText(ellipsis(ctx, w.title || '제목 없는 활동', CW - 360), M + 64, pg.y + 34);
      ctx.fillStyle = MUTED;
      ctx.textAlign = 'right';
      ctx.fillText(ellipsis(ctx, tag, 280), W - M, pg.y + 34);
      ctx.textAlign = 'left';
      pg.y += 48;
    }
  }

  /* ---------- 활동마다 새 쪽 ---------- */
  for (const [i, w] of works.entries()) {
    onProgress(`PDF 만드는 중… 활동 ${i + 1}/${works.length}`);
    await pg.newPage();
    // 번호 동그라미 + 분류 + 제목
    ctx.fillStyle = ac;
    ctx.beginPath();
    ctx.arc(M + 36, pg.y + 36, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = font(30, 800);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1).padStart(2, '0'), M + 36, pg.y + 47);
    ctx.textAlign = 'left';
    const meta = [tagOf(w), [w.semester, w.month].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
    const top = pg.y;
    pg.y = top + 2;
    await pg.text(meta, { size: 24, weight: 700, color: ac, x: M + 100, maxW: CW - 100, lineH: 38 });
    await pg.text(w.title || '제목 없는 활동', { size: 44, weight: 800, x: M + 100, maxW: CW - 100, lineH: 60 });
    const role = w.entryType === 'project' ? [w.projectRole && `맡은 역할: ${w.projectRole}`, w.linkedSubjects && `함께한 과목: ${w.linkedSubjects}`].filter(Boolean).join(' · ') : '';
    if (role) await pg.text(role, { size: 24, color: MUTED, x: M + 100, maxW: CW - 100, lineH: 38 });
    pg.y = Math.max(pg.y, top + 80) + 18;
    ctx.fillStyle = soft;
    ctx.fillRect(M, pg.y, CW, 4);
    pg.y += 30;

    await drawVisuals(pg, w, getWorkVisuals(w));
    if (w.content) {
      pg.y += 6;
      await pg.text(w.content, { size: 28, lineH: 50 });
      pg.y += 18;
    }
    if (w.reflection) {
      await pg.ensure(110);
      await pg.text('배우고 느낀 점', { size: 28, weight: 800, color: ac, x: M + 26, maxW: CW - 26, lineH: 48, bar: ac });
      await pg.text(w.reflection, { size: 27, x: M + 26, maxW: CW - 26, lineH: 48, bar: soft });
      pg.y += 22;
    }
    await drawDocs(pg, w.attachments || []);
    const files = (w.attachments || []).map((a) => a.name).filter(Boolean);
    if (files.length) await pg.text(`첨부파일: ${files.join(', ')}`, { size: 22, color: MUTED, lineH: 38 });
  }
  await pg.finish();
  onProgress(`PDF 만드는 중… ${pg.pages.length}쪽 완성`);
  return buildJpegPdf(pg.pages, { title: p.portfolioTitle || '나의 포트폴리오', author: p.studentName || '' });
}

/* ================================================================== */
/* 공유용 가벼운 웹페이지 ZIP                                          */
/* ================================================================== */
const SHARE_VIDEO_EACH = 10 * 1024 * 1024; // 동영상 하나 10MB까지
const SHARE_BIG_TOTAL = 15 * 1024 * 1024; // 동영상·첨부파일 합쳐 15MB까지
const SHARE_FILE_EACH = 5 * 1024 * 1024; // 첨부파일 하나 5MB까지

export async function buildShareZip(state, onProgress = () => {}) {
  const { buildPortfolioZip } = await import('./zipExporter.js');
  const copy = structuredClone(state);
  // 사진은 긴 변 1280px로 (화면에서는 차이가 거의 없고 용량은 1/2~1/4)
  const photos = [];
  walkMedia(copy, (m, w, bucket) => {
    if (bucket === 'images' || bucket === 'activityPhotos') photos.push(m);
  });
  for (const [i, m] of photos.entries()) {
    onProgress(`사진 가볍게 만드는 중… ${i + 1}/${photos.length}`);
    const blob = m.blob || (m.dataUrl ? dataUrlToBlob(m.dataUrl) : null);
    if (!blob || /svg|gif/.test(blob.type)) continue;
    const r = await shrinkImage(blob, 1280, 0.78).catch(() => null);
    if (r) Object.assign(m, { blob: r.blob, dataUrl: '', width: r.width, height: r.height });
  }
  // 큰 동영상·첨부파일은 작은 것부터 예산 안에서만
  const big = [];
  walkMedia(copy, (m, w, bucket) => {
    if (bucket !== 'videos' && bucket !== 'attachments') return;
    const size = m.blob?.size || (m.dataUrl ? Math.round(m.dataUrl.length * 0.75) : 0);
    big.push({ id: m.id, bucket, size });
  });
  big.sort((a, b) => a.size - b.size);
  const allowed = new Set();
  let total = 0;
  for (const b of big) {
    const each = b.bucket === 'videos' ? SHARE_VIDEO_EACH : SHARE_FILE_EACH;
    if (b.size <= each && total + b.size <= SHARE_BIG_TOTAL) {
      allowed.add(b.id);
      total += b.size;
    }
  }
  const skipped = big.filter((b) => !allowed.has(b.id)).length;
  onProgress('웹페이지 묶는 중…');
  const blob = await buildPortfolioZip(copy, {
    include: (m, bucket) => (bucket === 'videos' || bucket === 'attachments' ? allowed.has(m.id) : true),
    notes: {
      video: '동영상은 용량이 커서 갤러리에는 썸네일만 올렸어요.',
      file: '용량이 커서 갤러리용 파일에는 넣지 않았어요'
    }
  });
  return { blob, skipped };
}

/* ================================================================== */
/* 갤러리 카드 썸네일                                                  */
/* ================================================================== */
export async function buildShareThumb(state) {
  const tw = 400;
  const th = 300;
  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext('2d');
  const img = await bitmapOf(firstCoverVisual(state));
  if (img) {
    drawCover(ctx, img, 0, 0, tw, th, 0);
    img.close?.();
  } else {
    // 사진이 없으면 디자인 색으로 제목 카드
    const tpl = getTemplateMeta(state.selectedTemplate);
    const accent = hexToRgb(tpl.colors.printAccent || tpl.colors.accent);
    ctx.fillStyle = rgba(accent, 0.15);
    ctx.fillRect(0, 0, tw, th);
    ctx.fillStyle = rgba(accent, 1);
    ctx.fillRect(0, 0, tw, 10);
    ctx.font = font(30, 800);
    ctx.fillStyle = TEXT;
    const lines = wrapText(ctx, state.profile?.portfolioTitle || '나의 포트폴리오', tw - 60).slice(0, 4);
    lines.forEach((l, i) => ctx.fillText(l, 30, 80 + i * 44));
  }
  for (const q of [0.72, 0.55, 0.4]) {
    const url = canvas.toDataURL('image/jpeg', q);
    if (url.length <= 44000) return url;
  }
  return '';
}

export function shareFileBase(state) {
  const p = state.profile || {};
  return `${safeFileName(p.studentName || '나의')}_${safeFileName(p.portfolioTitle || '포트폴리오').slice(0, 40)}`;
}
