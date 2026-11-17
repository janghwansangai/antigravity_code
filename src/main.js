/**
 * 학생 포트폴리오 메이커 - 편집 화면
 *
 * 화면 구성
 *   위: 이름표(누구의 포트폴리오인지 · 바꾸기) · 저장 상태 · 완성하기
 *   왼쪽: 3단계 편집 (① 내 소개 → ② 활동 기록 → ③ 꾸미기·저장)
 *   오른쪽: 실시간 미리보기 (PC / 휴대폰 / PDF)
 *   좁은 화면(태블릿·휴대폰): 아래쪽 버튼으로 편집 ↔ 미리보기 전환
 *
 * 이벤트는 #app 하나에서 data-action / data-field 속성으로 처리합니다.
 */
import './style.css';
import { portfolioStore as store, isWorkEmpty, SCHOOL_YEAR_MONTHS } from './state/store.js';
import { DESIGN_TEMPLATES, SCHOOL_LEVEL_SUBJECTS } from './data/sampleData.js';
import {
  escapeHtml as esc,
  getPortfolioTemplatesCss,
  getPrintDocumentCss,
  getTemplateMeta,
  getWorkPhotos,
  getWorkVisuals,
  isPdfFile,
  renderPortfolioHtml,
  renderPrintDocumentHtml
} from './templates/portfolioRenderer.js';
import { attachPortfolioInteractions } from './templates/portfolioRuntime.js';
import { exportSingleHtmlFile } from './export/htmlExporter.js';
import { generatePortfolioZip } from './export/zipExporter.js';
import { triggerPdfPrint } from './export/pdfExporter.js';
import { PHOTO_SIZES, dataUrlToBlob, formatBytes, getImageSize, isImageFile, rotateImage, shrinkImage, uid } from './utils/files.js';
import { openPhotoEditor } from './editor/photoEditor.js';
import { openCamera } from './editor/camera.js';
import { ingestFiles, estimateStoredBytes } from './media/ingest.js';
import { VIDEO_SIZES, DEFAULT_VIDEO_SIDE, canCompressVideo, compressVideo, renameForType } from './utils/videoCompress.js';
import { mediaMime, totalMediaBytes, walkMedia } from './media/model.js';
import { PROJECT_EXT, canSaveInPlace, readProjectFile, saveProjectFile, savedFileName } from './project/projectFile.js';

const app = document.getElementById('app');
const $ = (sel) => app.querySelector(sel);

const STEPS = [
  { id: 'profile', icon: '🙋', label: '내 소개' },
  { id: 'works', icon: '✏️', label: '활동 기록' },
  { id: 'design', icon: '🎨', label: '꾸미기·저장' }
];
const SCHOOL_LEVEL_LABELS = { elementary: '초등학교', middle: '중학교', high: '고등학교' };
const EMPTY_PREVIEW_MESSAGE = '아직 활동 기록이 없어요. 왼쪽 ‘활동 기록’에서 첫 활동을 추가해 보세요.';
const UPLOAD_KINDS = {
  art: { icon: '🎨', label: '작품 사진', sub: '그림·만들기·글', bucket: 'images', accept: 'image/*' },
  activity: { icon: '📸', label: '활동 사진', sub: '수업·체험 모습', bucket: 'activityPhotos', accept: 'image/*' },
  video: { icon: '🎬', label: '동영상', sub: '발표·공연·실험', bucket: 'images', accept: 'video/*' },
  file: { icon: '📄', label: 'PDF·파일', sub: '내용이 보여요', bucket: 'images', accept: '' }
};
const PHOTO_LAYOUT_OPTIONS = [
  ['auto', '자동 맞춤'],
  ['2', '가로 2장씩'],
  ['3', '가로 3장씩'],
  ['4', '가로 4장씩']
];
const DOC_PRESETS = [
  ['none', '파일로만 (내용 안 보임)'],
  ['1x1', '첫 쪽만 크게'],
  ['2x1', '2쪽 (가로 2장)'],
  ['2x2', '4쪽 (2×2)'],
  ['3x2', '6쪽 (3×2)'],
  ['3x3', '9쪽 (3×3)'],
  ['all2', '모든 쪽 (가로 2장씩)'],
  ['all3', '모든 쪽 (가로 3장씩)'],
  ['custom', '직접 고른 쪽']
];

const ui = {
  step: 'profile', // 'profile' | 'works' | 'design'
  editingId: null, // 활동 기록 단계에서 편집 중인 활동 id (없으면 목록)
  previewMode: 'desktop', // 'desktop' | 'mobile' | 'pdf'
  mobileView: 'edit', // 좁은 화면에서 보이는 쪽: 'edit' | 'preview'
  uploading: 0
};

/* ------------------------------------------------------------------ */
/* 미디어 주소 캐시: 파일(Blob)·data URL을 짧은 blob: 주소로 바꿔 화면을 그립니다. */
/* (사진·동영상이 많아도 글자를 입력할 때 미리보기가 느려지지 않도록)            */
/* ------------------------------------------------------------------ */
const blobCache = new Map(); // id → { src, url }

function displayUrl(item) {
  if (!item) return '';
  const src = item.blob || item.dataUrl;
  if (!src) return '';
  if (typeof src === 'string' && !src.startsWith('data:')) return src;
  const hit = blobCache.get(item.id);
  if (hit && hit.src === src) return hit.url;
  if (hit) URL.revokeObjectURL(hit.url);
  try {
    const url = URL.createObjectURL(typeof src === 'string' ? dataUrlToBlob(src) : src);
    blobCache.set(item.id, { src, url });
    return url;
  } catch {
    return typeof src === 'string' ? src : '';
  }
}

/** 미리보기용 주소표 (미디어 id → blob 주소) + 쓰지 않는 주소 정리 */
function previewAssetMap(state) {
  const map = {};
  walkMedia(state, (m) => {
    map[m.id] = displayUrl(m);
  });
  blobCache.forEach((v, id) => {
    if (!(id in map)) {
      URL.revokeObjectURL(v.url);
      blobCache.delete(id);
    }
  });
  return map;
}

/* ------------------------------------------------------------------ */
/* 작은 HTML 도우미                                                     */
/* ------------------------------------------------------------------ */
function field(label, control, hint = '') {
  return `<label class="field"><span class="field-label">${label}${hint ? `<span class="field-hint"> · ${hint}</span>` : ''}</span>${control}</label>`;
}

function input(key, value, placeholder = '', list = '') {
  return `<input class="input" type="text" data-field="${key}" value="${esc(value)}" placeholder="${esc(placeholder)}"${
    list ? ` list="${list}" autocomplete="off"` : ''
  } />`;
}

function textarea(key, value, placeholder = '', rows = 5) {
  return `<textarea class="textarea" rows="${rows}" data-field="${key}" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`;
}

function selectBox(key, value, options, ariaLabel = '') {
  const opts = options
    .map(([v, label]) => `<option value="${esc(v)}"${v === value ? ' selected' : ''}>${esc(label)}</option>`)
    .join('');
  return `<select class="select" data-field="${key}"${ariaLabel ? ` aria-label="${esc(ariaLabel)}"` : ''}>${opts}</select>`;
}

function datalist(id, values) {
  return `<datalist id="${id}">${values.map((v) => `<option value="${esc(v)}"></option>`).join('')}</datalist>`;
}

/* ------------------------------------------------------------------ */
/* 화면 뼈대                                                            */
/* ------------------------------------------------------------------ */
function renderShell() {
  app.innerHTML = `
    <header class="app-header">
      <div class="brand">
        <span class="brand-logo" aria-hidden="true">🌱</span>
        <span class="brand-name">나의 포트폴리오</span>
      </div>
      <button type="button" class="who-btn" data-action="open-switcher" id="who-btn" title="다른 친구의 포트폴리오로 바꾸기"></button>
      <div class="header-right">
        <span class="save-status" id="save-status" role="status" aria-live="polite"></span>
        <button type="button" class="btn btn-primary" data-action="go-export">🎁 완성하기</button>
      </div>
    </header>
    <div class="conflict-banner" id="conflict-banner" hidden>
      ⚠️ 다른 창(탭)에서도 이 포트폴리오를 고치고 있어요. 내용이 섞이지 않도록 한 창에서만 작업해 주세요.
      <button type="button" class="btn btn-sm btn-ghost" data-action="hide-conflict">알겠어요</button>
    </div>

    <div class="workspace">
      <section class="editor" aria-label="편집">
        <nav class="steps" id="steps" aria-label="단계"></nav>
        <div class="editor-body" id="editor-body"></div>
      </section>

      <section class="preview" aria-label="미리보기">
        <div class="preview-bar">
          <span class="preview-title" id="preview-title"></span>
          <div class="segmented segmented-sm" role="group" aria-label="미리보기 화면">
            <button type="button" data-action="preview-mode" data-mode="desktop">💻 PC</button>
            <button type="button" data-action="preview-mode" data-mode="mobile">📱 휴대폰</button>
            <button type="button" data-action="preview-mode" data-mode="pdf">📄 PDF</button>
          </div>
        </div>
        <div class="preview-scroll"><div id="preview-mount"></div></div>
      </section>
    </div>

    <nav class="mobile-switch" aria-label="화면 전환">
      <button type="button" data-action="mobile-view" data-view="edit">✏️ 편집</button>
      <button type="button" data-action="mobile-view" data-view="preview">👀 미리보기</button>
    </nav>

    <div class="modal" id="switcher" hidden></div>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>
  `;
}

function renderWho() {
  const p = store.getState().profile;
  $('#who-btn').innerHTML = `<span class="who-face" aria-hidden="true">🙂</span><span class="who-name">${
    p.studentName ? esc(p.studentName) : '이름 없음'
  }</span><span class="who-caret" aria-hidden="true">▾</span>`;
}

function renderSteps() {
  $('#steps').innerHTML = STEPS.map(
    (s, i) => `<button type="button" class="step-btn${ui.step === s.id ? ' is-on' : ''}" data-action="go-step" data-step="${s.id}"${
      ui.step === s.id ? ' aria-current="step"' : ''
    }><span class="step-num">${i + 1}</span><span class="step-icon" aria-hidden="true">${s.icon}</span>${s.label}</button>`
  ).join('');
}

function renderEditor({ resetScroll = false } = {}) {
  const body = $('#editor-body');
  const top = body.scrollTop;
  const state = store.getState();
  const editing = ui.editingId ? store.getWork(ui.editingId) : null;
  if (ui.editingId && !editing) ui.editingId = null;

  if (ui.step === 'profile') body.innerHTML = profileStepHtml(state);
  else if (ui.step === 'works') body.innerHTML = editing ? workDetailHtml(state, editing) : worksListHtml(state);
  else body.innerHTML = designStepHtml(state);

  renderSteps();
  renderWho();
  if (ui.step === 'design') updateStorageInfo();
  if (resetScroll) {
    body.scrollTop = 0;
    if (window.matchMedia('(max-width: 1024px)').matches) window.scrollTo({ top: 0 });
  } else {
    body.scrollTop = top;
  }
}

/* ------------------------------------------------------------------ */
/* ① 내 소개                                                           */
/* ------------------------------------------------------------------ */
function sampleNoticeHtml(state) {
  if (!state.isSample) return '';
  return `
    <div class="notice">
      <p><b>👋 지금은 예시가 채워져 있어요.</b><br />오른쪽 미리보기를 구경한 뒤, 내 포트폴리오를 시작해 보세요.</p>
      <div class="notice-actions">
        <button type="button" class="btn btn-primary btn-sm" data-action="start-blank">✨ 내 포트폴리오 시작하기</button>
        <button type="button" class="btn btn-ghost btn-sm" data-action="dismiss-sample">예시를 고쳐서 쓸게요</button>
      </div>
    </div>`;
}

function profileStepHtml(state) {
  const p = state.profile;
  const levels = Object.keys(SCHOOL_LEVEL_SUBJECTS).map((k) => [k, SCHOOL_LEVEL_LABELS[k] || k]);
  return `
    ${sampleNoticeHtml(state)}
    <h2 class="pane-title">🙋 내 소개</h2>
    <p class="pane-hint">포트폴리오 표지에 들어가요. 입력하면 바로 저장돼요.</p>

    ${field('이름', input('profile.studentName', p.studentName, '예: 김하늘'))}
    <div class="row">
      ${field('학교', input('profile.schoolName', p.schoolName, '예: 한빛초등학교'))}
      ${field('학년·반·번호', input('profile.gradeClass', p.gradeClass, '예: 4학년 2반 7번'))}
    </div>
    ${field('포트폴리오 제목', input('profile.portfolioTitle', p.portfolioTitle, '예: 쑥쑥 자란 나의 1년'))}
    ${field('한 줄 소개', input('profile.subtitle', p.subtitle, '예: 그림 그리기를 좋아하는 호기심 대장'), '선택')}
    ${field(
      '나를 소개하는 글',
      textarea('profile.introText', p.introText, '좋아하는 것, 1년 동안 열심히 한 것, 앞으로의 꿈을 자유롭게 적어 보세요.', 4),
      '선택'
    )}
    <div class="row">
      ${field('학년도', input('profile.academicYear', p.academicYear, '예: 2026학년도'))}
      ${field('학교급', selectBox('schoolLevel', state.schoolLevel, levels), '과목 추천 목록')}
    </div>

    <button type="button" class="btn btn-primary btn-lg btn-block" data-action="go-step" data-step="works">다음: 활동 기록하기 →</button>
  `;
}

/* ------------------------------------------------------------------ */
/* ② 활동 기록 - 목록                                                   */
/* ------------------------------------------------------------------ */
function workCardHtml(w, i, list) {
  const isProject = w.entryType === 'project';
  const photos = getWorkPhotos(w);
  const thumb = photos[0] ? displayUrl(photos[0]) : '';
  const when = [w.semester, w.month].filter(Boolean).join(' ');
  const tag = isProject ? '프로젝트' : w.subject || '교과';
  const pdfs = w.attachments.filter(isPdfFile).length;
  const counts = [
    w.images.length && `🎨 ${w.images.length}`,
    w.activityPhotos.length && `📸 ${w.activityPhotos.length}`,
    pdfs && `📄 ${pdfs}`,
    w.attachments.length - pdfs && `📎 ${w.attachments.length - pdfs}`
  ].filter(Boolean);
  return `
    <li class="work-card">
      <button type="button" class="work-card-main" data-action="open-work" data-id="${esc(w.id)}">
        ${
          thumb
            ? `<img class="work-thumb" src="${esc(thumb)}" alt="" />`
            : `<span class="work-thumb" aria-hidden="true">${isProject ? '🚀' : '📚'}</span>`
        }
        <span class="work-card-text">
          <span class="work-card-meta"><span class="chip${isProject ? ' chip-project' : ''}">${esc(tag)}</span>${esc(when)}</span>
          <span class="work-card-title">${w.title.trim() ? esc(w.title) : '<span class="muted">제목 없음</span>'}</span>
          <span class="work-card-count">${counts.length ? counts.join(' · ') : '아직 사진이 없어요'}</span>
        </span>
      </button>
      <div class="work-card-tools">
        <button type="button" data-action="move-work" data-dir="up" data-id="${esc(w.id)}" aria-label="위로 옮기기"${i === 0 ? ' disabled' : ''}>▲</button>
        <button type="button" data-action="move-work" data-dir="down" data-id="${esc(w.id)}" aria-label="아래로 옮기기"${
          i === list.length - 1 ? ' disabled' : ''
        }>▼</button>
      </div>
    </li>`;
}

function worksListHtml(state) {
  const works = state.works;
  return `
    ${sampleNoticeHtml(state)}
    <h2 class="pane-title">✏️ 활동 기록 <span class="count">${works.length}</span></h2>
    <p class="pane-hint">수업 시간 작품이나 활동을 하나씩 추가하세요. 사진만 먼저 올리고 글은 나중에 써도 돼요.</p>

    <div class="add-row">
      <button type="button" class="btn btn-primary btn-lg" data-action="add-work">＋ 새 활동</button>
      <label class="btn btn-lg btn-outline" data-drop="new">
        🖼️ 사진부터 올리기
        <input type="file" accept="image/*,video/*,.pdf" multiple hidden data-upload="new" />
      </label>
    </div>
    <div class="quick-row">
      <button type="button" class="btn btn-sm" data-action="camera" data-mode="photo">📷 카메라로 찍기</button>
      <button type="button" class="btn btn-sm" data-action="camera" data-mode="doc">📄 문서 스캔</button>
      <button type="button" class="btn btn-sm" data-action="paste-clipboard">📋 캡처 붙여넣기</button>
    </div>

    ${
      works.length
        ? `<ol class="work-list">${works.map(workCardHtml).join('')}</ol>
           <button type="button" class="btn btn-block" data-action="go-step" data-step="design">다음: 꾸미고 저장하기 →</button>`
        : `<div class="empty">
             <div class="empty-icon" aria-hidden="true">🐣</div>
             <p><b>아직 기록이 없어요</b><br />‘새 활동’을 누르거나, 사진을 골라 바로 시작해 보세요.</p>
           </div>`
    }
  `;
}

/* ------------------------------------------------------------------ */
/* ② 활동 기록 - 한 활동 편집                                            */
/* ------------------------------------------------------------------ */
function uploadTileHtml(kind) {
  const k = UPLOAD_KINDS[kind];
  return `
    <label class="upload-tile tile-${kind}" data-drop="${kind}">
      <input type="file" multiple hidden data-upload="${kind}"${k.accept ? ` accept="${k.accept}"` : ''} />
      <span class="upload-tile-icon" aria-hidden="true">${k.icon}</span>
      <b>${k.label}</b>
      <small>${k.sub}</small>
    </label>`;
}

function coverBadge(p, i) {
  return i === 0
    ? '<span class="photo-cover is-on">★ 대표</span>'
    : `<button type="button" class="photo-cover" data-action="make-cover" data-id="${esc(p.id)}" title="맨 앞에 크게 보여 줄 대표로">☆ 대표로</button>`;
}

function photoItemHtml(p, i) {
  if (p.kind === 'video') return videoItemHtml(p, i);
  const isArt = p.kind === 'art';
  return `
    <li class="photo-item">
      <div class="photo-frame">
        <img src="${esc(displayUrl(p))}" alt="" />
        <button type="button" class="photo-kind kind-${p.kind}" data-action="toggle-kind" data-id="${esc(p.id)}" title="눌러서 작품/활동 바꾸기">${
          isArt ? '🎨 작품' : '📸 활동'
        } ⇄</button>
        <button type="button" class="photo-remove" data-action="remove-photo" data-id="${esc(p.id)}" aria-label="사진 삭제">✕</button>
        ${coverBadge(p, i)}
      </div>
      <div class="photo-tools">
        <button type="button" class="photo-tool" data-action="rotate-photo" data-id="${esc(p.id)}" title="오른쪽으로 돌리기" aria-label="사진 돌리기">↻</button>
        <button type="button" class="photo-tool" data-action="edit-photo" data-tool="crop" data-id="${esc(p.id)}" title="필요한 부분만 자르기" aria-label="사진 자르기">✂️</button>
        <button type="button" class="photo-tool" data-action="edit-photo" data-id="${esc(p.id)}" title="자르기·문서 스캔·얼굴 가리기">✏️ 고치기</button>
      </div>
      <input class="input input-sm" type="text" data-photo-caption="${esc(p.id)}" value="${esc(p.caption || '')}" placeholder="사진 설명 (선택)" />
    </li>`;
}

function videoItemHtml(v, i) {
  const mins = v.duration ? `${Math.floor(v.duration / 60)}:${String(v.duration % 60).padStart(2, '0')}` : '';
  return `
    <li class="photo-item is-video">
      <div class="photo-frame">
        <img src="${esc(displayUrl(v.poster))}" alt="" />
        <span class="photo-kind kind-video">🎬 동영상${mins ? ` · ${mins}` : ''}</span>
        <span class="video-play" aria-hidden="true">▶</span>
        <button type="button" class="photo-remove" data-action="remove-photo" data-id="${esc(v.id)}" aria-label="동영상 삭제">✕</button>
        ${coverBadge(v, i)}
      </div>
      <p class="video-meta">${esc(v.name)} <small>${esc(v.size || '')}</small></p>
      <input class="input input-sm" type="text" data-photo-caption="${esc(v.id)}" value="${esc(v.caption || '')}" placeholder="동영상 설명 (선택)" />
    </li>`;
}

/** PDF 보이기 설정의 현재 모양을 미리 정한 이름으로 */
function docPresetOf(a) {
  const sel = a.docPages || [];
  const n = (a.pages || []).length;
  const firstN = (k) => sel.length === Math.min(k, n) && sel.every((v, i) => v === i);
  if (!sel.length) return 'none';
  if (a.docCols === 1 && firstN(1)) return '1x1';
  if (a.docCols === 2 && sel.length === n && firstN(n) && n > 4) return 'all2';
  if (a.docCols === 3 && sel.length === n && firstN(n) && n > 9) return 'all3';
  if (a.docCols === 2 && firstN(2) && n >= 2 && sel.length === 2) return '2x1';
  if (a.docCols === 2 && firstN(4)) return '2x2';
  if (a.docCols === 3 && firstN(6)) return '3x2';
  if (a.docCols === 3 && firstN(9)) return '3x3';
  return 'custom';
}

function fileItemHtml(a) {
  const pdf = isPdfFile(a);
  const badge = pdf ? 'PDF' : esc((a.name.split('.').pop() || 'FILE').slice(0, 4).toUpperCase());
  const head = `<div class="file-row">
      <span class="file-badge${pdf ? ' is-pdf' : ''}">${badge}</span>
      <a class="file-name" href="${esc(displayUrl(a))}" target="_blank" rel="noopener"${pdf ? '' : ` download="${esc(a.name)}"`}>${esc(a.name)}</a>
      <small>${esc(a.size || '')}</small>
      <button type="button" class="file-remove" data-action="remove-file" data-id="${esc(a.id)}" aria-label="${esc(a.name)} 삭제">✕</button>
    </div>`;
  if (!pdf) return `<li class="file-item">${head}</li>`;
  if (!a.pages?.length) {
    return `<li class="file-item">${head}
      <button type="button" class="btn btn-sm doc-render" data-action="render-pdf" data-id="${esc(a.id)}">📄 PDF 내용을 포트폴리오에 보이게 하기</button></li>`;
  }
  const preset = docPresetOf(a);
  const chosen = new Set(a.docPages || []);
  const total = a.pageCount || a.pages.length;
  return `<li class="file-item has-doc">${head}
    <div class="doc-panel">
      <div class="row">
        <label class="field"><span class="field-label">내용 보이기</span>
          <select class="select" data-doc-preset="${esc(a.id)}">${DOC_PRESETS.filter(([v]) => v !== 'custom' || preset === 'custom')
            .map(([v, l]) => `<option value="${v}"${v === preset ? ' selected' : ''}>${l}</option>`)
            .join('')}</select></label>
        <label class="field"><span class="field-label">가로 칸 수</span>
          <select class="select" data-doc-cols="${esc(a.id)}">${[1, 2, 3, 4]
            .map((c) => `<option value="${c}"${c === a.docCols ? ' selected' : ''}>${c}장씩</option>`)
            .join('')}</select></label>
      </div>
      <p class="doc-hint">쪽을 눌러 넣거나 뺄 수 있어요 · ${total}쪽 중 ${chosen.size}쪽 선택${
        total > a.pages.length ? ` (앞 ${a.pages.length}쪽까지만 그림으로 만들었어요)` : ''
      }</p>
      <div class="doc-thumbs">${a.pages
        .map(
          (pg, i) => `<button type="button" class="doc-thumb${chosen.has(i) ? ' is-on' : ''}" data-action="toggle-doc-page" data-id="${esc(a.id)}" data-page="${i}" aria-pressed="${chosen.has(i)}">
            <img src="${esc(displayUrl(pg))}" alt="" loading="lazy" /><span>${i + 1}</span></button>`
        )
        .join('')}</div>
    </div></li>`;
}

function workDetailHtml(state, w) {
  const isProject = w.entryType === 'project';
  const photos = getWorkVisuals(w);
  const semesters = [['1학기', '1학기'], ['2학기', '2학기']];
  if (w.semester && !semesters.some(([v]) => v === w.semester)) semesters.push([w.semester, w.semester]);
  const months = [['', '월 선택'], ...SCHOOL_YEAR_MONTHS.map((m) => [m, m])];
  if (w.month && !SCHOOL_YEAR_MONTHS.includes(w.month)) months.push([w.month, w.month]);
  const hasMore = isProject ? w.projectRole || w.linkedSubjects : w.activityType;

  return `
    <div class="detail-top">
      <button type="button" class="btn btn-ghost" data-action="back-to-list">← 활동 목록</button>
      <span class="muted small">입력하면 바로 저장돼요</span>
    </div>

    <div class="segmented" role="group" aria-label="기록 종류">
      <button type="button" data-action="set-kind" data-kind="subject" class="${isProject ? '' : 'is-on'}" aria-pressed="${!isProject}">📚 교과 활동</button>
      <button type="button" data-action="set-kind" data-kind="project" class="${isProject ? 'is-on' : ''}" aria-pressed="${isProject}">🚀 프로젝트</button>
    </div>

    ${
      isProject
        ? field('프로젝트 이름', input('work.projectName', w.projectName, '예: 우리 마을 지도 만들기', 'project-options'), '같은 프로젝트는 같은 이름으로')
        : field('과목', input('work.subject', w.subject, '예: 미술 (목록에서 고르거나 직접 입력)', 'subject-options'))
    }
    <div class="field">
      <span class="field-label">언제 했나요?</span>
      <div class="row">
        ${selectBox('work.semester', w.semester, semesters, '학기')}
        ${selectBox('work.month', w.month, months, '월')}
      </div>
    </div>
    ${field('제목', input('work.title', w.title, isProject ? '예: 학교 화단 식물 관찰하기' : '예: 내가 그린 미래 도시'))}

    <div class="field">
      <span class="field-label">사진 · 파일 올리기<span class="field-hint"> · 눌러서 고르거나 끌어다 놓으세요</span></span>
      <div class="upload-tiles">${uploadTileHtml('art')}${uploadTileHtml('activity')}${uploadTileHtml('video')}${uploadTileHtml('file')}</div>
      <div class="quick-row">
        <button type="button" class="btn btn-sm" data-action="camera" data-mode="photo">📷 카메라로 찍기</button>
        <button type="button" class="btn btn-sm" data-action="camera" data-mode="doc">📄 문서 스캔</button>
        <button type="button" class="btn btn-sm" data-action="paste-clipboard">📋 캡처 붙여넣기</button>
      </div>
      <div class="row upload-options">
        <label class="field"><span class="field-label">사진 배치</span>${selectBox('work.photoLayout', w.photoLayout, PHOTO_LAYOUT_OPTIONS, '사진 배치')}</label>
        <label class="field"><span class="field-label">새로 올릴 사진 화질</span>${selectBox(
          'settings.photoMaxSide',
          String(state.settings.photoMaxSide),
          PHOTO_SIZES.map((x) => [String(x.value), x.label]),
          '사진 화질'
        )}</label>
        <label class="field"><span class="field-label">새로 올릴 동영상 크기</span>${selectBox(
          'settings.videoMaxSide',
          String(state.settings.videoMaxSide),
          VIDEO_SIZES.map((x) => [String(x.value), x.label]),
          '동영상 크기'
        )}</label>
      </div>
      <p class="upload-help">끌어다 놓기 · 여러 개 한꺼번에 · 캡처한 화면은 Ctrl+V(맥 ⌘+V)로 바로 붙여넣기<br />방향은 <b>↻</b>, 필요한 부분만 <b>✂️</b>, 얼굴 가리기·문서 반듯하게는 <b>✏️ 고치기</b></p>
      ${ui.uploading ? `<p class="uploading" data-upload-status>⏳ 올리는 중… 잠깐만 기다려 주세요</p>` : ''}
      ${photos.length ? `<ul class="photo-grid">${photos.map(photoItemHtml).join('')}</ul>` : ''}
      ${w.attachments.length ? `<ul class="file-list">${w.attachments.map(fileItemHtml).join('')}</ul>` : ''}
    </div>

    ${field('무엇을 했나요?', textarea('work.content', w.content, '활동 내용이나 내가 쓴 글을 적어 보세요.\n예: 친구들과 학교 화단에 강낭콩을 심고, 2주 동안 키를 재서 그래프로 그렸다.', 6))}
    ${field('배우고 느낀 점', textarea('work.reflection', w.reflection, '새로 알게 된 것, 어려웠던 점, 뿌듯했던 점을 적어 보세요.', 4))}

    <details class="more"${hasMore ? ' open' : ''}>
      <summary>더 적기 (선택)</summary>
      ${
        isProject
          ? field('맡은 역할', input('work.projectRole', w.projectRole, '예: 자료 조사, 발표')) +
            field('함께한 과목', input('work.linkedSubjects', w.linkedSubjects, '예: 과학 × 미술'))
          : field('활동 종류', input('work.activityType', w.activityType, '예: 그리기, 실험, 발표'))
      }
    </details>

    <div class="detail-bottom">
      <button type="button" class="btn btn-primary btn-lg" data-action="back-to-list">✓ 다 했어요</button>
      <button type="button" class="btn btn-danger-text" data-action="delete-work">이 활동 삭제</button>
    </div>

    ${datalist('subject-options', store.getSubjectSuggestions())}
    ${datalist('project-options', store.getProjectSuggestions())}
  `;
}

/* ------------------------------------------------------------------ */
/* ③ 꾸미기·저장                                                        */
/* ------------------------------------------------------------------ */
function templateCardHtml(t, selectedId) {
  const on = t.id === selectedId;
  const c = t.colors;
  return `
    <button type="button" role="radio" aria-checked="${on}" class="tpl-card${on ? ' is-on' : ''}" data-action="select-template" data-id="${t.id}">
      <span class="tpl-thumb tt-${t.id}" style="--bg:${c.bg};--tx:${c.text};--ac:${c.accent};--sf:${c.surface}" aria-hidden="true">
        <span class="tt-head"></span><span class="tt-body"><span></span><span></span><span></span><span></span></span>
      </span>
      <span class="tpl-name"><b>${t.num}</b>${esc(t.name)}</span>
    </button>`;
}

function exportItemHtml(action, icon, title, desc, primary = false) {
  return `<button type="button" class="export-item${primary ? ' is-primary' : ''}" data-action="${action}">
      <span class="export-icon" aria-hidden="true">${icon}</span>
      <span class="export-text"><b>${title}</b><small>${desc}</small></span>
    </button>`;
}

/** 우리 반 갤러리(gallery.html): 이 브라우저에서 마지막으로 연 학급 갤러리가 있으면 그 주소로 */
function galleryItemHtml() {
  let last = '';
  try {
    last = JSON.parse(localStorage.getItem('gallery:last') || '""');
  } catch {
    last = '';
  }
  const ok = typeof last === 'string' && last.startsWith(`${location.origin}/`) && last.includes('#s=');
  const href = ok ? last : './gallery.html';
  const desc = ok
    ? '학급 구글 드라이브에 올린 작품 링크를 모아 보는 곳이에요. ZIP·웹페이지·프로젝트 파일은 갤러리에서 바로 펼쳐 볼 수 있어요.'
    : '선생님이 알려 준 갤러리 주소(또는 QR)로 들어가 드라이브 링크를 올려요. 선생님은 여기를 눌러 갤러리를 만들 수 있어요.';
  return `<a class="export-item" href="${esc(href)}" target="_blank" rel="noopener">
      <span class="export-icon" aria-hidden="true">🌈</span>
      <span class="export-text"><b>${ok ? '우리 반 갤러리 열기 ↗' : '우리 반 갤러리 (드라이브 링크 모으기) ↗'}</b><small>${desc}</small></span>
    </a>`;
}

function designStepHtml(state) {
  const tpl = getTemplateMeta(state.selectedTemplate);
  const cute = DESIGN_TEMPLATES.filter((t) => t.group === 'cute');
  const clean = DESIGN_TEMPLATES.filter((t) => t.group !== 'cute');
  return `
    <h2 class="pane-title">🎨 디자인 고르기</h2>
    <p class="pane-hint">누르면 오른쪽 미리보기에 바로 적용돼요. 언제든 바꿀 수 있어요.</p>
    <h3 class="tpl-group-title">🧸 귀여운 디자인</h3>
    <div class="tpl-grid" role="radiogroup" aria-label="귀여운 디자인">${cute.map((t) => templateCardHtml(t, tpl.id)).join('')}</div>
    <h3 class="tpl-group-title">✨ 깔끔한 디자인</h3>
    <div class="tpl-grid" role="radiogroup" aria-label="깔끔한 디자인">${clean.map((t) => templateCardHtml(t, tpl.id)).join('')}</div>
    <div class="tpl-info">
      <b>${tpl.num}. ${esc(tpl.name)}</b>
      <p>${esc(tpl.description)}</p>
      <p class="muted">이럴 때 좋아요: ${esc(tpl.bestFor)}</p>
    </div>

    <h2 class="pane-title" id="export-section">🎁 저장하고 내보내기</h2>
    <div class="export-list">
      ${exportItemHtml('export-html', '🌐', '웹페이지 파일로 저장 (.html)', '파일 하나에 사진·PDF까지 모두 담겨요. 선생님께 제출하거나 휴대폰에서 바로 열 수 있어요.', true)}
      ${exportItemHtml('export-pdf', '🖨️', 'PDF로 저장 · 인쇄', 'A4 문서로 정리돼요. 인쇄 창에서 ‘PDF로 저장’을 고르세요.')}
      ${exportItemHtml('export-zip', '📦', '압축 파일로 저장 (.zip)', '웹페이지와 사진·첨부파일이 폴더로 나뉘어 담겨요.')}
    </div>

    <h3 class="sub-title" id="project-section">💾 프로젝트 파일 (이어서 편집하기)</h3>
    <p class="pane-hint">작업은 이 브라우저에 자동 저장돼요. 사진·동영상·PDF까지 모두 담긴 <b>프로젝트 파일(${PROJECT_EXT})</b>로 이 컴퓨터에 저장해 두면, 다른 컴퓨터에서도 ‘열기’로 이어서 할 수 있어요.</p>
    <div class="export-list">
      ${exportItemHtml(
        'save-project',
        '💾',
        savedFileName(store.getPortfolioId()) ? `저장 (‘${esc(savedFileName(store.getPortfolioId()))}’에 덮어쓰기)` : '프로젝트 파일 저장',
        canSaveInPlace() ? '처음 한 번 저장할 곳을 고르면, 다음부터는 누르기만 하면 같은 파일에 저장돼요.' : '내려받기 폴더에 저장돼요.'
      )}
      ${canSaveInPlace() ? exportItemHtml('save-project-as', '🗂️', '다른 이름으로 저장', '다른 위치나 이름으로 새로 저장해요.') : ''}
      <label class="export-item">
        <input type="file" hidden data-upload="project" />
        <span class="export-icon" aria-hidden="true">📂</span>
        <span class="export-text"><b>프로젝트 파일 열기</b><small>${PROJECT_EXT} 파일(예전 .json 백업도 가능)을 열어요. 지금 포트폴리오는 그대로 두고 새로 열려요.</small></span>
      </label>
    </div>

    <h3 class="sub-title">🌈 우리 반 갤러리</h3>
    <div class="export-list">
      ${galleryItemHtml()}
    </div>

    <h3 class="sub-title">📦 저장 공간</h3>
    <div class="storage-box">
      <p id="storage-info" class="pane-hint">계산 중…</p>
      <div class="storage-actions">
        <button type="button" class="btn btn-sm" data-action="shrink-photos">🗜️ 사진 용량 줄이기 (긴 변 1280px로)</button>
        <button type="button" class="btn btn-sm" data-action="shrink-videos"${canCompressVideo() ? '' : ' disabled'}>🎬 동영상 용량 줄이기</button>
      </div>
      <p class="pane-hint small">${
        canCompressVideo()
          ? '휴대폰으로 옮기거나 친구에게 보낼 때 가벼워져요. 동영상은 ‘새로 올릴 동영상 크기’(없으면 720p)에 맞춰 MP4로 줄여요. PDF 원본은 그대로예요.'
          : '사진이 많아 무거우면 눌러 보세요. (이 브라우저는 동영상 줄이기를 못 해요. 크롬·엣지·웨일·최신 사파리에서 해 주세요.)'
      }</p>
    </div>

    <div class="danger-row">
      <button type="button" class="btn btn-ghost btn-sm" data-action="load-sample">예시로 채워 보기</button>
      <button type="button" class="btn btn-danger-text btn-sm" data-action="reset-current">이 포트폴리오 비우기</button>
    </div>
  `;
}

/* ------------------------------------------------------------------ */
/* 누구의 포트폴리오? (한 컴퓨터를 여러 학생이 쓸 때)                       */
/* ------------------------------------------------------------------ */
async function openSwitcher() {
  await store.flush();
  const currentId = store.getPortfolioId();
  const list = store.listPortfolios();
  const modal = $('#switcher');
  modal.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="switcher-title">
      <div class="modal-head">
        <h2 id="switcher-title">누구의 포트폴리오인가요?</h2>
        <button type="button" class="btn btn-ghost btn-sm" data-action="close-switcher" aria-label="닫기">✕</button>
      </div>
      <p class="pane-hint">이 컴퓨터(브라우저)에 저장된 포트폴리오예요. 내 이름을 눌러 이어서 하세요.</p>
      <ul class="who-list">
        ${list
          .map(
            (x) => `<li class="who-item${x.id === currentId ? ' is-on' : ''}">
              <button type="button" class="who-item-main" data-action="switch-portfolio" data-id="${esc(x.id)}">
                <span class="who-face" aria-hidden="true">${x.id === currentId ? '😊' : '🙂'}</span>
                <span><b>${esc(x.studentName || '이름 없음')}</b>${x.isSample ? ' <span class="chip">예시</span>' : ''}<small>${esc(x.portfolioTitle || '')} · 활동 ${x.workCount || 0}개</small></span>
                ${x.id === currentId ? '<span class="who-now">지금 보는 중</span>' : ''}
              </button>
              <button type="button" class="who-del" data-action="delete-portfolio" data-id="${esc(x.id)}" aria-label="${esc(x.studentName || '이름 없음')} 포트폴리오 삭제">🗑️</button>
            </li>`
          )
          .join('')}
      </ul>
      <button type="button" class="btn btn-primary btn-block btn-lg" data-action="new-portfolio">＋ 새 친구 포트폴리오 만들기</button>
      <p class="modal-note">💡 학교 컴퓨터라면 다 쓴 뒤 ‘작업 백업 저장’으로 파일을 꼭 챙기세요. 다른 친구가 같은 컴퓨터를 쓰면 이 목록이 보여요.</p>
    </div>`;
  modal.hidden = false;
  modal.querySelector('.who-item.is-on .who-item-main, .who-item-main')?.focus();
}

function closeSwitcher() {
  $('#switcher').hidden = true;
}

async function afterPortfolioChanged(message) {
  ui.editingId = null;
  ui.step = store.getState().works.length ? 'works' : 'profile';
  $('#conflict-banner').hidden = true;
  closeSwitcher();
  renderEditor({ resetScroll: true });
  renderPreview();
  backfillPhotoSizes();
  if (message) toast(message);
}

/* ------------------------------------------------------------------ */
/* 미리보기                                                             */
/* ------------------------------------------------------------------ */
let previewTimer = null;
function schedulePreview(delay = 0) {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(renderPreview, delay);
}

function renderPreview() {
  const state = store.getState();
  const tpl = getTemplateMeta(state.selectedTemplate);
  $('#preview-title').textContent = `미리보기 · ${tpl.num}. ${tpl.name}`;
  app.querySelectorAll('[data-action="preview-mode"]').forEach((b) => {
    const on = b.dataset.mode === ui.previewMode;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', String(on));
  });

  const mount = $('#preview-mount');
  const assetMap = previewAssetMap(state);
  if (ui.previewMode === 'pdf') {
    mount.className = 'stage stage-pdf';
    mount.innerHTML = renderPrintDocumentHtml(state, { assetMap });
    return;
  }
  mount.className = `stage ${ui.previewMode === 'mobile' ? 'stage-mobile' : 'stage-desktop'}`;
  mount.innerHTML = renderPortfolioHtml(state, { assetMap, emptyMessage: EMPTY_PREVIEW_MESSAGE });
  attachPortfolioInteractions(mount);
}

function applyMobileView() {
  app.dataset.mobileView = ui.mobileView;
  app.querySelectorAll('[data-action="mobile-view"]').forEach((b) => {
    const on = b.dataset.view === ui.mobileView;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', String(on));
  });
}

/* ------------------------------------------------------------------ */
/* 저장 상태 · 알림                                                     */
/* ------------------------------------------------------------------ */
const SAVE_STATUS_TEXT = {
  saving: '저장 중…',
  saved: '✓ 자동 저장됨',
  error: '⚠️ 저장 공간이 부족해요. ‘프로젝트 파일 저장’을 해 주세요',
  unavailable: '⚠️ 이 브라우저에서는 자동 저장이 안 돼요. ‘프로젝트 파일 저장’을 해 주세요'
};

function showSaveStatus(status) {
  const el = $('#save-status');
  if (!el) return;
  el.textContent = SAVE_STATUS_TEXT[status] || '';
  el.classList.toggle('is-error', status === 'error' || status === 'unavailable');
  if (status === 'saved') renderWho();
}

let toastTimer = null;
function toast(message, { sticky = false, duration = 3000 } = {}) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  if (!sticky) toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

/* ------------------------------------------------------------------ */
/* 동작                                                                */
/* ------------------------------------------------------------------ */
function setStep(step) {
  if (ui.editingId) closeWork({ quiet: true, render: false });
  ui.step = step;
  renderEditor({ resetScroll: true });
}

function openWork(id) {
  ui.step = 'works';
  ui.editingId = id;
  renderEditor({ resetScroll: true });
}

function closeWork({ quiet = false, render = true } = {}) {
  const w = ui.editingId ? store.getWork(ui.editingId) : null;
  ui.editingId = null;
  if (w && isWorkEmpty(w)) {
    store.deleteWork(w.id);
    if (!quiet) toast('비어 있는 활동은 정리했어요.');
    schedulePreview();
  }
  if (render) renderEditor({ resetScroll: true });
}

function currentWork() {
  return ui.editingId ? store.getWork(ui.editingId) : null;
}

const VISUAL_BUCKETS = ['images', 'activityPhotos', 'videos'];

function findPhoto(w, photoId) {
  return VISUAL_BUCKETS.find((b) => (w[b] || []).some((p) => p.id === photoId)) || null;
}

function updatePhoto(photoId, fields) {
  const w = currentWork();
  const bucket = w && findPhoto(w, photoId);
  if (!bucket) return;
  store.updateWork(w.id, { [bucket]: w[bucket].map((p) => (p.id === photoId ? { ...p, ...fields } : p)) });
}

function removePhoto(photoId) {
  const w = currentWork();
  const bucket = w && findPhoto(w, photoId);
  if (!bucket) return;
  store.markEdited();
  store.updateWork(w.id, {
    [bucket]: w[bucket].filter((p) => p.id !== photoId),
    coverPhotoId: w.coverPhotoId === photoId ? '' : w.coverPhotoId
  });
  renderEditor();
  schedulePreview();
}

/** 작품 ↔ 활동 사진 바꾸기 */
function toggleKind(photoId) {
  const w = currentWork();
  const from = w && findPhoto(w, photoId);
  if (!from || from === 'videos') return;
  const to = from === 'images' ? 'activityPhotos' : 'images';
  const photo = w[from].find((p) => p.id === photoId);
  store.markEdited();
  store.updateWork(w.id, { [from]: w[from].filter((p) => p.id !== photoId), [to]: [...w[to], photo] });
  renderEditor();
  schedulePreview();
}

function makeCover(photoId) {
  const w = currentWork();
  if (!w || !findPhoto(w, photoId)) return;
  store.markEdited();
  store.updateWork(w.id, { coverPhotoId: photoId });
  renderEditor();
  schedulePreview();
}

/** 돌리거나 고친 사진으로 바꿉니다. 새 id를 주어 원래 사진은 저장소에서 지워지게 합니다. */
function replacePhoto(photoId, result, workId = ui.editingId) {
  const w = store.getWork(workId);
  const bucket = w && findPhoto(w, photoId);
  if (!bucket || !result) return;
  const newId = uid('ph');
  store.markEdited();
  store.updateWork(w.id, {
    [bucket]: w[bucket].map((p) => {
      if (p.id !== photoId) return p;
      const next = { ...p, id: newId, blob: result.blob, dataUrl: '', width: result.width, height: result.height };
      return next;
    }),
    coverPhotoId: w.coverPhotoId === photoId ? newId : w.coverPhotoId
  });
}

function photoById(photoId) {
  const w = currentWork();
  return w ? [...w.images, ...w.activityPhotos].find((p) => p.id === photoId) : null;
}

let photoBusy = false;
async function rotatePhoto(photoId) {
  const photo = photoById(photoId);
  if (!photo || photoBusy) return;
  photoBusy = true;
  try {
    replacePhoto(photoId, await rotateImage(displayUrl(photo), 90, mediaMime(photo)));
    renderEditor();
    schedulePreview();
  } catch (err) {
    console.error(err);
    toast('사진을 돌리지 못했어요.');
  } finally {
    photoBusy = false;
  }
}

async function editPhoto(photoId, tool = 'mosaic') {
  const photo = photoById(photoId);
  if (!photo || photoBusy) return;
  photoBusy = true;
  try {
    $('#toast').classList.remove('show');
    const result = await openPhotoEditor(displayUrl(photo), { tool, type: mediaMime(photo) });
    if (result) {
      replacePhoto(photoId, result);
      renderEditor();
      schedulePreview();
      toast('✨ 고친 사진으로 바꿨어요.');
    }
  } finally {
    photoBusy = false;
  }
}

/** 예전에 올린 사진처럼 가로·세로 크기 정보가 없는 사진의 크기를 채웁니다(자동 배치에 필요). */
async function backfillPhotoSizes() {
  const state = store.getState();
  const jobs = [];
  state.works.forEach((w) =>
    ['images', 'activityPhotos'].forEach((b) =>
      w[b].forEach((p) => {
        if (!(p.width > 0 && p.height > 0) && (p.blob || p.dataUrl)) {
          jobs.push(getImageSize(displayUrl(p)).then((size) => ({ w: w.id, b, id: p.id, size })).catch(() => null));
        }
      })
    )
  );
  if (!jobs.length) return;
  const found = (await Promise.all(jobs)).filter((x) => x && x.size.width > 0);
  if (store.getState() !== state) return; // 그사이 다른 포트폴리오로 바뀜
  found.forEach(({ w, b, id, size }) => {
    const work = store.getWork(w);
    if (work) store.updateWork(w, { [b]: work[b].map((p) => (p.id === id ? { ...p, ...size } : p)) });
  });
  schedulePreview();
}

function removeFile(fileId) {
  const w = currentWork();
  if (!w) return;
  store.markEdited();
  store.updateWork(w.id, { attachments: w.attachments.filter((a) => a.id !== fileId) });
  renderEditor();
  schedulePreview();
}

/* ---------- PDF 내용 보이기 설정 ---------- */
function updateAttachment(attId, fn) {
  const w = currentWork();
  if (!w) return;
  store.markEdited();
  store.updateWork(w.id, { attachments: w.attachments.map((a) => (a.id === attId ? fn(a) : a)) });
  renderEditor();
  schedulePreview();
}

const PRESET_SPEC = { none: [2, 0], '1x1': [1, 1], '2x1': [2, 2], '2x2': [2, 4], '3x2': [3, 6], '3x3': [3, 9], all2: [2, Infinity], all3: [3, Infinity] };

function setDocPreset(attId, preset) {
  const spec = PRESET_SPEC[preset];
  if (!spec) return;
  updateAttachment(attId, (a) => ({ ...a, docCols: spec[0], docPages: (a.pages || []).slice(0, spec[1]).map((_, i) => i) }));
}

function setDocCols(attId, cols) {
  updateAttachment(attId, (a) => ({ ...a, docCols: Math.min(4, Math.max(1, cols)) }));
}

function toggleDocPage(attId, page) {
  updateAttachment(attId, (a) => {
    const set = new Set(a.docPages || []);
    if (set.has(page)) set.delete(page);
    else set.add(page);
    return { ...a, docPages: [...set].sort((x, y) => x - y) };
  });
}

/** 예전에 올렸던 PDF도 내용이 보이게 쪽 그림을 만듭니다. */
async function renderPdfFor(attId) {
  const w = currentWork();
  const att = w?.attachments.find((a) => a.id === attId);
  if (!att) return;
  const blob = att.blob || (att.dataUrl ? dataUrlToBlob(att.dataUrl) : null);
  if (!blob) return;
  ui.uploading++;
  renderEditor();
  try {
    const { attachments, problems } = await ingestFiles([new File([blob], att.name, { type: 'application/pdf' })], {
      onProgress: (t) => toast(t, { sticky: true })
    });
    const made = attachments[0];
    if (made?.pages?.length) {
      updateAttachment(attId, (a) => ({ ...a, pages: made.pages, pageCount: made.pageCount, docCols: made.docCols, docPages: made.docPages }));
      toast('📄 PDF 내용이 포트폴리오에 보여요.');
    } else {
      toast(problems.join(' ') || 'PDF 내용을 그림으로 만들지 못했어요.', { duration: 6000 });
    }
  } finally {
    ui.uploading--;
    renderEditor();
  }
}

/**
 * 사진·동영상·파일을 한 활동에 올립니다.
 * kind: 'art'(작품 사진) | 'activity'(활동 사진) | 'video' | 'file'
 * 사진은 화질 설정에 맞춰 줄이고, 동영상은 동영상 칸, PDF·파일은 첨부파일로 들어갑니다.
 * 동영상·파일 칸에 사진을 넣으면 작품 사진으로 들어갑니다.
 */
async function addFilesToWork(workId, fileList, kind = 'art') {
  const files = Array.from(fileList || []);
  if (!files.length || !workId) return;
  const bucket = kind === 'activity' ? 'activityPhotos' : 'images';
  const videoSide = canCompressVideo() ? store.getState().settings.videoMaxSide : 0;
  const need = estimateStoredBytes(files, { videoSide });
  if (!(await store.hasRoomFor(need))) {
    toast(`⚠️ 이 컴퓨터 브라우저의 저장 공간이 부족해요(${formatBytes(need)} 필요). ‘사진 용량 줄이기’를 하거나 프로젝트 파일로 저장한 뒤 정리해 주세요.`, {
      duration: 9000
    });
    return;
  }
  store.markEdited();
  ui.uploading++;
  if (ui.editingId === workId) renderEditor();
  const status = (t) => {
    toast(t, { sticky: true });
    const el = $('[data-upload-status]');
    if (el) el.textContent = `⏳ ${t}`;
  };
  status(`올리는 중… (0/${files.length})`);

  let result;
  try {
    result = await ingestFiles(files, { maxSide: store.getState().settings.photoMaxSide, videoSide, onProgress: status });
  } finally {
    ui.uploading--;
  }
  const { photos, videos, attachments, problems, notes } = result;
  const w = store.getWork(workId);
  if (!w) return;
  store.updateWork(workId, {
    [bucket]: [...w[bucket], ...photos],
    videos: [...w.videos, ...videos],
    attachments: [...w.attachments, ...attachments]
  });
  if (videos.length) store.flush(); // 오래 걸린 동영상은 바로 저장
  if (ui.editingId === workId) renderEditor();
  schedulePreview();

  const label = bucket === 'activityPhotos' ? '활동 사진' : '작품 사진';
  const done = [
    photos.length && `${label} ${photos.length}장`,
    videos.length && `동영상 ${videos.length}개`,
    attachments.length && `파일 ${attachments.length}개`
  ].filter(Boolean);
  const shrunk = notes.length ? ` 🎬 동영상을 줄였어요: ${notes.join(', ')}` : '';
  if (problems.length) {
    toast(`${done.length ? `올렸어요: ${done.join(' · ')}. ` : ''}${problems.join(' ')}${shrunk}`, { duration: 9000 });
  } else if (done.length) {
    toast(`🎉 올렸어요! ${done.join(' · ')}${shrunk}`, { duration: shrunk ? 7000 : 3500 });
  } else {
    toast('올린 파일이 없어요.');
  }
}

async function startWorkWithFiles(fileList, kind = 'art') {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  store.markEdited();
  const id = store.addWork();
  openWork(id);
  await addFilesToWork(id, files, kind);
}

/** 지금 편집 중인 활동에, 없으면 새 활동을 만들어 넣습니다. */
async function addFilesAnywhere(files, kind = 'art') {
  if (!files.length) return;
  if (ui.step === 'works' && ui.editingId) await addFilesToWork(ui.editingId, files, kind);
  else await startWorkWithFiles(files, kind);
}

/* ---------- 카메라 · 붙여넣기 ---------- */
async function takePhotos(mode) {
  $('#toast').classList.remove('show');
  const shots = await openCamera({ mode });
  const files = shots.map((s) => s.file || new File([s.blob], s.name || 'camera.jpg', { type: s.blob.type || 'image/jpeg' }));
  if (files.length) await addFilesAnywhere(files, 'art');
}

function screenshotName(type = 'image/png') {
  const ext = type.split('/')[1] || 'png';
  return `캡처_${new Date().toTimeString().slice(0, 8).replace(/:/g, '')}.${ext}`;
}

async function pasteFromClipboard() {
  try {
    if (!navigator.clipboard?.read) throw new Error('unsupported');
    const items = await navigator.clipboard.read();
    const files = [];
    for (const item of items) {
      const type = item.types.find((t) => t.startsWith('image/'));
      if (type) {
        const blob = await item.getType(type);
        files.push(new File([blob], screenshotName(type), { type }));
      }
    }
    if (!files.length) {
      toast('복사된 그림이 없어요. 화면을 캡처(윈도우 Win+Shift+S, 맥 ⌘+Ctrl+Shift+4)한 뒤 다시 눌러 주세요.', { duration: 6000 });
      return;
    }
    await addFilesAnywhere(files, 'art');
  } catch {
    toast('이 브라우저에서는 버튼으로 붙여넣기가 안 돼요. 키보드로 Ctrl+V(맥은 ⌘+V)를 눌러 주세요.', { duration: 6000 });
  }
}

/* ---------- 사진 용량 줄이기 ---------- */
async function shrinkAllPhotos(button) {
  const state = store.getState();
  const targets = [];
  state.works.forEach((w) => ['images', 'activityPhotos'].forEach((b) => w[b].forEach((p) => targets.push({ w: w.id, p }))));
  if (!targets.length) return toast('줄일 사진이 없어요.');
  if (!confirm(`사진 ${targets.length}장을 긴 변 1280px로 줄여 다시 저장할까요?\n화면에서는 거의 차이가 없지만 되돌릴 수는 없어요.`)) return;
  let saved = 0;
  let changed = 0;
  button.disabled = true;
  try {
    for (const [i, { w, p }] of targets.entries()) {
      toast(`사진 줄이는 중… (${i + 1}/${targets.length})`, { sticky: true });
      const blob = p.blob || (p.dataUrl ? dataUrlToBlob(p.dataUrl) : null);
      if (!blob || /svg|gif/.test(blob.type)) continue;
      const r = await shrinkImage(blob, 1280).catch(() => null);
      if (!r) continue;
      saved += blob.size - r.blob.size;
      changed++;
      replacePhoto(p.id, r, w);
    }
  } finally {
    button.disabled = false;
  }
  await store.flush();
  renderPreview();
  updateStorageInfo();
  toast(changed ? `🗜️ 사진 ${changed}장을 줄여 ${formatBytes(saved)}를 아꼈어요.` : '이미 충분히 가벼워요.', { duration: 5000 });
}

/* ---------- 동영상 용량 줄이기 ---------- */
async function shrinkAllVideos(button) {
  const side = store.getState().settings.videoMaxSide || DEFAULT_VIDEO_SIDE;
  const targets = [];
  store.getState().works.forEach((w) => w.videos.forEach((v) => v.blob && targets.push({ w: w.id, v })));
  if (!targets.length) return toast('줄일 동영상이 없어요.');
  if (!confirm(`동영상 ${targets.length}개를 ${side}p MP4로 줄여 다시 저장할까요?\n휴대폰·태블릿에서 보기에 충분한 화질이에요. 되돌릴 수는 없어요.\n(동영상이 길면 몇 분 걸릴 수 있어요)`)) return;
  let saved = 0;
  let changed = 0;
  button.disabled = true;
  try {
    for (const [i, { w, v }] of targets.entries()) {
      const label = `동영상 줄이는 중… (${i + 1}/${targets.length})`;
      toast(label, { sticky: true });
      const r = await compressVideo(v.blob, { shortSide: side, onProgress: (x) => toast(`${label} ${Math.round(x * 100)}%`, { sticky: true }) }).catch((err) => {
        console.warn(err);
        return null;
      });
      if (!r) continue;
      saved += v.blob.size - r.blob.size;
      changed++;
      replaceVideo(w, v.id, r);
    }
  } finally {
    button.disabled = false;
  }
  await store.flush(); // 오래 걸린 작업이라 바로 저장(새로 고침·창 닫기 대비)
  renderPreview();
  updateStorageInfo();
  toast(changed ? `🎬 동영상 ${changed}개를 줄여 ${formatBytes(saved)}를 아꼈어요.` : '이미 충분히 가볍거나, 이 동영상은 줄일 수 없어요.', { duration: 5000 });
}

function replaceVideo(workId, videoId, r) {
  const w = store.getWork(workId);
  if (!w) return;
  const newId = uid('vid');
  store.markEdited();
  store.updateWork(workId, {
    videos: w.videos.map((v) =>
      v.id === videoId
        ? { ...v, id: newId, blob: r.blob, dataUrl: '', mimeType: r.mimeType, name: renameForType(v.name || '동영상', r.mimeType), size: formatBytes(r.blob.size), width: r.width, height: r.height }
        : v
    ),
    coverPhotoId: w.coverPhotoId === videoId ? newId : w.coverPhotoId
  });
}

async function updateStorageInfo() {
  const el = $('#storage-info');
  if (!el) return;
  const mine = totalMediaBytes(store.getState());
  const est = await store.storageEstimate();
  el.textContent = `이 포트폴리오의 사진·동영상·파일: ${formatBytes(mine)}${
    est ? ` · 이 브라우저 저장 공간: ${formatBytes(est.usage)} 사용 / 약 ${formatBytes(est.quota)} 가능` : ''
  }`;
}

/* ---------- 프로젝트 파일 ---------- */
async function saveProject(button, saveAs = false) {
  await store.flush();
  await runExport(button, '저장하는 중…', async () => {
    const r = await saveProjectFile(store.getState(), {
      portfolioId: store.getPortfolioId(),
      saveAs,
      onProgress: (pct) => toast(`프로젝트 파일 만드는 중… ${Math.round(pct)}%`, { sticky: true })
    });
    if (!r) {
      $('#toast').classList.remove('show');
      return;
    }
    toast(r.inPlace ? `💾 ‘${r.name}’에 저장했어요.` : `💾 ‘${r.name}’ 파일을 내려받았어요. 잘 보관하세요!`, { duration: 5000 });
    if (ui.step === 'design') renderEditor();
  });
}

async function openProject(file) {
  try {
    toast('프로젝트 파일 여는 중…', { sticky: true });
    const data = await readProjectFile(file);
    if (!data || !data.profile || !Array.isArray(data.works)) {
      toast('포트폴리오 프로젝트 파일이 아니에요.');
      return;
    }
    const state = store.getState();
    const replaceCurrent = state.isSample || (!state.works.length && !state.profile.studentName);
    if (replaceCurrent) store.importState(data);
    else await store.openAsNew(data);
    await afterPortfolioChanged(`📂 ‘${data.profile.studentName || '이름 없음'}’ 포트폴리오를 열었어요. 이어서 편집하세요!`);
  } catch (err) {
    console.error(err);
    toast('파일을 열 수 없어요. 포트폴리오 프로젝트 파일(.portfolio)인지 확인해 주세요.', { duration: 6000 });
  }
}

function confirmDiscard(message) {
  const state = store.getState();
  if (!state.works.length || state.isSample) return true;
  return confirm(message);
}

async function runExport(button, label, task) {
  const title = button?.querySelector('b');
  const original = title?.textContent;
  if (button) button.disabled = true;
  if (title) title.textContent = label;
  try {
    await task();
  } catch (err) {
    console.error(err);
    toast('저장 중에 문제가 생겼어요. 다시 시도해 주세요.');
  } finally {
    if (button) button.disabled = false;
    if (title) title.textContent = original;
  }
}

async function onClick(e) {
  const modal = $('#switcher');
  if (e.target === modal) {
    closeSwitcher();
    return;
  }
  const el = e.target.closest('[data-action]');
  if (!el || !app.contains(el) || el.disabled) return;
  const { action, id } = el.dataset;

  switch (action) {
    case 'go-step':
      setStep(el.dataset.step);
      break;
    case 'go-export':
      setStep('design');
      ui.mobileView = 'edit';
      applyMobileView();
      requestAnimationFrame(() => $('#export-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      break;
    case 'add-work':
      store.markEdited();
      openWork(store.addWork());
      break;
    case 'open-work':
      openWork(id);
      break;
    case 'move-work':
      store.markEdited();
      store.moveWork(id, el.dataset.dir);
      renderEditor();
      schedulePreview();
      break;
    case 'back-to-list':
      closeWork();
      break;
    case 'delete-work':
      if (!confirm('이 활동을 삭제할까요? 사진과 글도 함께 지워져요.')) return;
      store.markEdited();
      store.deleteWork(ui.editingId);
      ui.editingId = null;
      renderEditor({ resetScroll: true });
      schedulePreview();
      toast('활동을 삭제했어요.');
      break;
    case 'set-kind':
      store.markEdited();
      store.updateWork(ui.editingId, { entryType: el.dataset.kind });
      renderEditor();
      schedulePreview();
      break;
    case 'remove-photo':
      removePhoto(id);
      break;
    case 'toggle-kind':
      toggleKind(id);
      break;
    case 'make-cover':
      makeCover(id);
      break;
    case 'remove-file':
      removeFile(id);
      break;
    case 'rotate-photo':
      await rotatePhoto(id);
      break;
    case 'edit-photo':
      await editPhoto(id, el.dataset.tool || 'mosaic');
      break;
    case 'camera':
      await takePhotos(el.dataset.mode);
      break;
    case 'paste-clipboard':
      await pasteFromClipboard();
      break;
    case 'render-pdf':
      await renderPdfFor(id);
      break;
    case 'toggle-doc-page':
      toggleDocPage(id, Number(el.dataset.page));
      break;
    case 'shrink-photos':
      await shrinkAllPhotos(el);
      break;
    case 'shrink-videos':
      await shrinkAllVideos(el);
      break;
    case 'save-project':
      await saveProject(el, false);
      break;
    case 'save-project-as':
      await saveProject(el, true);
      break;
    case 'select-template':
      store.setTemplate(id);
      renderEditor();
      schedulePreview();
      break;
    case 'preview-mode':
      ui.previewMode = el.dataset.mode;
      renderPreview();
      break;
    case 'mobile-view':
      ui.mobileView = el.dataset.view;
      applyMobileView();
      window.scrollTo({ top: 0 });
      break;
    case 'hide-conflict':
      $('#conflict-banner').hidden = true;
      break;
    case 'export-html':
      await runExport(el, '만드는 중…', async () => {
        await store.flush();
        const { fileName, skipped } = await exportSingleHtmlFile(store.getState());
        toast(
          skipped.length
            ? `🎉 ‘${fileName}’ 파일을 저장했어요. 용량이 큰 ${skipped.join(', ')}은(는) 썸네일·안내만 넣었어요(ZIP으로 저장하면 원본이 들어가요).`
            : `🎉 ‘${fileName}’ 파일을 저장했어요.`,
          { duration: skipped.length ? 9000 : 3000 }
        );
      });
      break;
    case 'export-zip':
      await runExport(el, '압축하는 중…', async () => {
        const name = await generatePortfolioZip(store.getState(), (pct) => toast(`압축하는 중… ${Math.round(pct)}%`, { sticky: true }));
        toast(`🎉 ‘${name}’ 파일을 저장했어요.`);
      });
      break;
    case 'export-pdf': {
      const opened = triggerPdfPrint(store.getState(), () => {
        ui.previewMode = 'pdf';
        renderPreview();
        setTimeout(() => window.print(), 300);
      }, previewAssetMap(store.getState()));
      toast(opened ? '새 창에서 인쇄 창이 열려요. ‘PDF로 저장’을 고르세요.' : '인쇄 창에서 ‘PDF로 저장’을 고르세요.', { duration: 5000 });
      break;
    }
    case 'load-sample':
      if (!confirmDiscard('예시를 불러오면 지금 포트폴리오 내용이 사라져요. 계속할까요?\n(필요하면 먼저 ‘프로젝트 파일 저장’을 하세요)')) return;
      store.loadSampleData();
      ui.editingId = null;
      setStep('works');
      schedulePreview();
      toast('예시를 불러왔어요.');
      break;
    case 'start-blank':
      // 예시 안내의 '내 포트폴리오 시작하기': 예시를 비우고 새로 시작
      store.resetBlankData();
      await afterPortfolioChanged('✨ 새 포트폴리오를 시작해요! 이름부터 적어 볼까요?');
      break;
    case 'reset-current':
      if (!confirmDiscard('이 포트폴리오의 내용을 모두 지울까요?\n(필요하면 먼저 ‘프로젝트 파일 저장’을 하세요)')) return;
      store.resetBlankData();
      await afterPortfolioChanged('포트폴리오를 비웠어요.');
      break;
    case 'dismiss-sample':
      store.dismissSampleNotice();
      renderEditor();
      break;
    case 'open-switcher':
      await openSwitcher();
      break;
    case 'close-switcher':
      closeSwitcher();
      break;
    case 'switch-portfolio':
      if (id === store.getPortfolioId()) {
        closeSwitcher();
        return;
      }
      if (await store.switchPortfolio(id)) await afterPortfolioChanged(`😊 ${store.getState().profile.studentName || '이름 없는'} 포트폴리오를 열었어요.`);
      else toast('포트폴리오를 열 수 없어요.');
      break;
    case 'new-portfolio':
      await store.createPortfolio();
      await afterPortfolioChanged('✨ 새 포트폴리오를 만들었어요! 이름부터 적어 볼까요?');
      break;
    case 'delete-portfolio': {
      const target = store.listPortfolios().find((x) => x.id === id);
      const name = target?.studentName || '이름 없음';
      if (!confirm(`‘${name}’ 포트폴리오를 이 컴퓨터에서 지울까요?\n지우면 되돌릴 수 없어요. (백업 파일이 있다면 다시 불러올 수 있어요)`)) return;
      const wasCurrent = id === store.getPortfolioId();
      await store.deletePortfolio(id);
      if (wasCurrent) await afterPortfolioChanged(`‘${name}’ 포트폴리오를 지웠어요.`);
      else {
        await openSwitcher();
        toast(`‘${name}’ 포트폴리오를 지웠어요.`);
      }
      break;
    }
    default:
      break;
  }
}

function onInput(e) {
  const t = e.target;
  const key = t.dataset.field;
  if (key) {
    const [scope, name] = key.split('.');
    if (scope === 'profile') {
      store.markEdited();
      store.updateProfile({ [name]: t.value });
      if (name === 'studentName') renderWho();
    } else if (scope === 'work' && ui.editingId) {
      store.markEdited();
      store.updateWork(ui.editingId, { [name]: t.value });
    } else if (key === 'schoolLevel') {
      store.setSchoolLevel(t.value);
      return;
    } else if (key === 'settings.photoMaxSide') {
      store.setPhotoMaxSide(Number(t.value));
      toast('앞으로 올리는 사진에 적용돼요. 이미 올린 사진은 그대로예요.');
      return;
    } else if (key === 'settings.videoMaxSide') {
      store.setVideoMaxSide(Number(t.value));
      toast(
        Number(t.value)
          ? '앞으로 올리는 동영상을 줄여서 저장해요. 이미 올린 동영상은 ‘저장 공간’의 🎬 버튼으로 줄일 수 있어요.'
          : '앞으로 올리는 동영상은 원본 그대로 저장해요(용량이 커요).',
        { duration: 5000 }
      );
      return;
    }
    schedulePreview(150);
    return;
  }
  const captionId = t.dataset.photoCaption;
  if (captionId) {
    store.markEdited();
    updatePhoto(captionId, { caption: t.value });
    schedulePreview(150);
  }
}

async function onChange(e) {
  const t = e.target;
  if (t.dataset.docPreset) return setDocPreset(t.dataset.docPreset, t.value);
  if (t.dataset.docCols) return setDocCols(t.dataset.docCols, Number(t.value));
  const kind = t.dataset.upload;
  if (!kind) return;
  const files = Array.from(t.files || []);
  t.value = '';
  if (!files.length) return;
  if (UPLOAD_KINDS[kind]) await addFilesToWork(ui.editingId, files, kind);
  else if (kind === 'new') await startWorkWithFiles(files);
  else if (kind === 'project') await openProject(files[0]);
}

const hasFiles = (e) => Array.from(e.dataTransfer?.types || []).includes('Files');

function onDragOver(e) {
  const zone = e.target.closest('[data-drop]');
  if (!zone || !hasFiles(e)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  zone.classList.add('is-over');
}

function onDragLeave(e) {
  const zone = e.target.closest('[data-drop]');
  if (zone && !zone.contains(e.relatedTarget)) zone.classList.remove('is-over');
}

async function onDrop(e) {
  const zone = e.target.closest('[data-drop]');
  if (!zone || !hasFiles(e)) return;
  e.preventDefault();
  zone.classList.remove('is-over');
  const files = Array.from(e.dataTransfer.files || []);
  const kind = zone.dataset.drop;
  if (UPLOAD_KINDS[kind]) await addFilesToWork(ui.editingId, files, kind);
  else await startWorkWithFiles(files);
}

/**
 * 캡처한 화면 붙여넣기(Ctrl+V / ⌘+V): 어느 화면에서든 됩니다.
 * 활동을 편집 중이면 그 활동에, 아니면 새 활동을 만들어 넣습니다.
 * 글을 쓰는 칸에 '글'을 붙여넣는 경우는 방해하지 않습니다.
 */
function onPaste(e) {
  if (document.querySelector('.photo-editor, .camera-modal')) return;
  const cd = e.clipboardData;
  const files = Array.from(cd?.files || []).filter(isImageFile);
  if (!files.length) return;
  const t = e.target;
  const inTextField = t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && t.type === 'text') || t.isContentEditable);
  if (inTextField && cd.getData('text/plain')) return; // 글과 그림이 함께 복사된 경우는 글 붙여넣기 우선
  e.preventDefault();
  const named = files.map((f) => (f.name && f.name !== 'image.png' ? f : new File([f], screenshotName(f.type), { type: f.type })));
  addFilesAnywhere(named, 'art');
}

function onKeyDown(e) {
  if (e.key === 'Escape' && !$('#switcher').hidden) closeSwitcher();
}

function bindEvents() {
  app.addEventListener('click', onClick);
  app.addEventListener('input', onInput);
  app.addEventListener('change', onChange);
  app.addEventListener('dragover', onDragOver);
  app.addEventListener('dragleave', onDragLeave);
  app.addEventListener('drop', onDrop);
  document.addEventListener('paste', onPaste);
  document.addEventListener('keydown', onKeyDown);
  // 업로드 칸 밖에 파일을 떨어뜨려도 브라우저가 파일을 열어 버리지 않도록 막습니다(작성 중인 내용 보호).
  window.addEventListener('dragover', (e) => hasFiles(e) && e.preventDefault());
  window.addEventListener('drop', (e) => hasFiles(e) && e.preventDefault());
  window.addEventListener('pagehide', () => store.flush());
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && store.flush());
  // 사진을 올리는 도중 창을 닫으려 하면 한 번 더 물어봅니다.
  window.addEventListener('beforeunload', (e) => {
    if (ui.uploading > 0) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}

/* ------------------------------------------------------------------ */
/* 시작                                                                */
/* ------------------------------------------------------------------ */
function injectPortfolioStyles() {
  const style = document.createElement('style');
  style.id = 'pf-template-styles';
  style.textContent = getPortfolioTemplatesCss() + getPrintDocumentCss();
  document.head.appendChild(style);
}

async function bootstrap() {
  injectPortfolioStyles();
  renderShell();
  bindEvents();
  store.onStatus(showSaveStatus);
  store.onConflict(() => {
    $('#conflict-banner').hidden = false;
  });
  await store.init();
  ui.step = store.getState().works.length ? 'works' : 'profile';
  applyMobileView();
  renderEditor();
  renderPreview();
  backfillPhotoSizes();
}

bootstrap();
