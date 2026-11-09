/**
 * 포트폴리오 렌더러
 *
 * 15종 시안은 모두 "같은 HTML 구조"를 쓰고, 디자인 차이는 CSS 테마(.pf-t-<id>)로만 만듭니다.
 *   - 새 시안 추가: sampleData.js의 DESIGN_TEMPLATES에 항목을 넣고, 아래 CSS에 .pf-t-<id> 블록만 추가
 *   - 휴대폰 화면: @container 규칙이 상자 폭(640px 이하)에 맞춰 자동으로 한 줄 배치로 바꿉니다
 *
 * HTML 뼈대
 *   .pf-wrap > .pf.pf-t-<id>[data-filter]
 *     header.pf-cover      표지(학년도·학교, 제목, 한 줄 소개, 이름, 소개글)
 *     nav.pf-filters       분류 버튼(전체/교과/프로젝트/작품/활동 사진) - 해당 항목이 있을 때만
 *     .pf-slide-nav        (발표 슬라이드 시안만) 이전/다음
 *     .pf-works > article.pf-work[data-kind=subject|project]
 *        header.pf-head    분류 배지, 시기, 제목, 역할
 *        .pf-media         사진들 (figure.pf-fig[data-kind=art|activity])
 *        .pf-text          활동 내용, 배우고 느낀 점, 첨부파일(PDF는 '열어 보기' 카드)
 *     section.pf-album     작품 / 활동 사진 모아 보기(분류 버튼으로 전환)
 *
 * 사진 종류 (예전 데이터 형식 그대로)
 *   work.images         → 🎨 작품 사진 (kind: 'art')
 *   work.activityPhotos → 📸 활동 사진 (kind: 'activity')
 *   work.coverPhotoId   → 대표 사진(맨 앞에 크게)
 *   photo.width/height  → 가로·세로 크기. 사진을 자르지 않고 비율대로 한 줄을 꽉 채워 배치하고,
 *                         사진이 세로형이면 넓은 화면에서 사진과 글을 나란히 놓습니다(.portrait-set)
 *
 * 이 파일은 브라우저 API를 쓰지 않으므로 Node(scripts/build-mockups.mjs)에서도 그대로 불러 쓸 수 있습니다.
 */
import { DESIGN_TEMPLATES, DEFAULT_TEMPLATE_ID } from '../data/sampleData.js';

// 글꼴은 화면 표시를 막지 않도록 비동기로 불러옵니다(인터넷이 없거나 막혀 있으면 기본 글꼴로 보임).
const FONT_URL =
  'https://fonts.googleapis.com/css2?family=Gaegu:wght@400;700&family=Jua&family=Nanum+Myeongjo:wght@400;700;800&family=Noto+Sans+KR:wght@300;400;500;700;800;900&display=swap';
export const FONT_LINKS_HTML =
  '<link rel="preconnect" href="https://fonts.googleapis.com" />' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />' +
  `<link rel="preload" as="style" href="${FONT_URL}" onload="this.onload=null;this.rel='stylesheet'" />` +
  `<noscript><link rel="stylesheet" href="${FONT_URL}" /></noscript>`;

const SCHOOL_YEAR_MONTHS = ['3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월', '1월', '2월'];

export function escapeHtml(str = '') {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 사진 주소(data URL)는 수 MB가 될 수 있어, 특수문자가 있을 때만 이스케이프합니다.
function escapeUrl(url = '') {
  const s = String(url ?? '');
  return /["'<>&]/.test(s) ? escapeHtml(s) : s;
}

export function getTemplateMeta(id) {
  return (
    DESIGN_TEMPLATES.find((t) => t.id === id) ||
    DESIGN_TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID) ||
    DESIGN_TEMPLATES[0]
  );
}

/** 한 활동의 사진 목록: 작품 사진 → 활동 사진 순서, 대표 사진은 맨 앞 */
export function getWorkPhotos(work) {
  const art = Array.isArray(work?.images) ? work.images : [];
  const activity = Array.isArray(work?.activityPhotos) ? work.activityPhotos : [];
  const list = [
    ...art.map((p) => ({ ...p, bucket: 'images', kind: 'art' })),
    ...activity.map((p) => ({ ...p, bucket: 'activityPhotos', kind: 'activity' }))
  ];
  const coverIdx = work?.coverPhotoId ? list.findIndex((p) => p.id === work.coverPhotoId) : -1;
  if (coverIdx > 0) list.unshift(...list.splice(coverIdx, 1));
  return list;
}

export function isPdfFile(file) {
  return /pdf/i.test(file?.mimeType || '') || /\.pdf$/i.test(file?.name || '');
}

function resolveSrc(item, bucket, assetMap) {
  return (assetMap && assetMap[bucket] && assetMap[bucket][item.id]) || item.dataUrl || '';
}

/** 대표 사진이 세로이고, 사진들이 전체적으로 세로형이면 → 넓은 화면에서 사진과 글을 나란히 */
function isPortraitSet(photos) {
  if (!photos.length || photoShape(photos[0]).shape !== 'portrait') return false;
  const avg = photos.reduce((a, p) => a + photoShape(p).ratio, 0) / photos.length;
  return avg < 1;
}

function mediaCountClass(n) {
  return n === 1 ? 'n-1' : n === 2 ? 'n-2' : n === 3 ? 'n-3' : 'n-many';
}

function sortBySchoolYear(works) {
  const rank = (w) => {
    const m = SCHOOL_YEAR_MONTHS.indexOf(w.month);
    const sem = w.semester === '2학기' ? 1 : 0;
    return m === -1 ? sem * 100 + 50 : m;
  };
  return works
    .map((w, i) => ({ w, i }))
    .sort((a, b) => rank(a.w) - rank(b.w) || a.i - b.i)
    .map((x) => x.w);
}

/** 사진 비율(가로/세로)과 모양. 크기를 모르면 4:3 가로로 봅니다. */
export function photoShape(photo) {
  const r = photo?.width > 0 && photo?.height > 0 ? photo.width / photo.height : 4 / 3;
  return { ratio: Math.min(Math.max(r, 0.3), 4), shape: r > 1.15 ? 'landscape' : r < 0.87 ? 'portrait' : 'square' };
}

function renderFigure(photo, src, altFallback, extraCaption = '') {
  const caption = String(photo.caption || '').trim();
  const alt = caption || altFallback || '활동 사진';
  const figcaption =
    caption || extraCaption
      ? `<figcaption>${escapeHtml(caption)}${extraCaption ? `<small>${escapeHtml(extraCaption)}</small>` : ''}</figcaption>`
      : '';
  const { ratio, shape } = photoShape(photo);
  const size = photo.width > 0 && photo.height > 0 ? ` width="${Math.round(photo.width)}" height="${Math.round(photo.height)}"` : '';
  return `<figure class="pf-fig" data-kind="${photo.kind === 'activity' ? 'activity' : 'art'}" data-shape="${shape}" style="--r:${ratio.toFixed(3)}"><img src="${escapeUrl(src)}" alt="${escapeHtml(alt)}"${size} />${figcaption}</figure>`;
}

// 첨부파일: PDF는 새 창에서 '열어 보기' + 내려받기 버튼, 그 밖의 파일은 '내려받기'
function renderFileLink(a, href) {
  const pdf = isPdfFile(a);
  const name = escapeHtml(a.name || '첨부파일');
  const ext = pdf ? 'PDF' : escapeHtml(((a.name || '').split('.').pop() || 'FILE').slice(0, 4).toUpperCase());
  const attrs = pdf
    ? `href="${escapeUrl(href || '#')}" target="_blank" rel="noopener" data-pf-file="pdf" data-name="${name}"`
    : `href="${escapeUrl(href || '#')}" download="${name}"`;
  const size = a.size ? `${escapeHtml(a.size)} · ` : '';
  return `<li class="pf-file-item"><a class="pf-file${pdf ? ' is-pdf' : ''}" ${attrs}><span class="pf-file-icon">${ext}</span><span class="pf-file-text"><b>${name}</b><small>${size}${
    pdf ? '열어 보기' : '내려받기'
  }</small></span></a>${pdf ? `<button type="button" class="pf-file-dl" data-pf-download title="내려받기" aria-label="${name} 내려받기">↓</button>` : ''}</li>`;
}

function renderWork(work, index, ctx) {
  const isProject = work.entryType === 'project';
  const title = String(work.title || '').trim() || '제목 없는 활동';
  const tag = isProject ? '프로젝트' : String(work.subject || '').trim() || '교과';
  const when = [work.semester, work.month].filter(Boolean).join(' · ');
  const photos = getWorkPhotos(work);
  const attachments = Array.isArray(work.attachments) ? work.attachments : [];

  const meta = [
    `<span class="pf-tag">${escapeHtml(tag)}</span>`,
    isProject && work.projectName ? `<span class="pf-project">${escapeHtml(work.projectName)}</span>` : '',
    !isProject && work.activityType ? `<span class="pf-type">${escapeHtml(work.activityType)}</span>` : '',
    when ? `<span class="pf-date">${escapeHtml(when)}</span>` : ''
  ].join('');

  const roles = [
    isProject && work.projectRole ? `<span>맡은 역할 <b>${escapeHtml(work.projectRole)}</b></span>` : '',
    isProject && work.linkedSubjects ? `<span>함께한 과목 <b>${escapeHtml(work.linkedSubjects)}</b></span>` : ''
  ].join('');

  const media = photos.length
    ? `<div class="pf-media ${mediaCountClass(photos.length)}">${photos
        .map((p) => renderFigure(p, resolveSrc(p, p.bucket, ctx.assetMap), title))
        .join('')}</div>`
    : '';

  const content = String(work.content || '').trim();
  const reflection = String(work.reflection || '').trim();
  const files = attachments.length
    ? `<ul class="pf-files">${attachments.map((a) => renderFileLink(a, resolveSrc(a, 'attachments', ctx.assetMap))).join('')}</ul>`
    : '';

  const text =
    content || reflection || files
      ? `<div class="pf-text">${content ? `<p class="pf-content">${escapeHtml(content)}</p>` : ''}${
          reflection
            ? `<div class="pf-reflection"><strong>배우고 느낀 점</strong><p>${escapeHtml(reflection)}</p></div>`
            : ''
        }${files}</div>`
      : '';

  const classes = [
    'pf-work',
    photos.length ? 'has-media' : 'no-media',
    photos.length ? `cover-${photoShape(photos[0]).shape}` : '',
    isPortraitSet(photos) ? 'portrait-set' : '',
    text ? 'has-text' : '',
    ctx.markFirst && index === 0 ? 'is-current' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return `<article class="${classes}" data-kind="${isProject ? 'project' : 'subject'}">
<header class="pf-head"><div class="pf-meta">${meta}</div><h2 class="pf-work-title">${escapeHtml(title)}</h2>${
    roles ? `<p class="pf-role">${roles}</p>` : ''
  }</header>
${media}${text}
</article>`;
}

function renderFilters(works) {
  const hasSubject = works.some((w) => w.entryType !== 'project');
  const hasProject = works.some((w) => w.entryType === 'project');
  const hasArt = works.some((w) => (w.images || []).length > 0);
  const hasActivity = works.some((w) => (w.activityPhotos || []).length > 0);
  const buttons = [['all', '전체']];
  if (hasSubject && hasProject) buttons.push(['subject', '교과'], ['project', '프로젝트']);
  if (hasArt) buttons.push(['art', '🎨 작품 모음']);
  if (hasActivity) buttons.push(['activity', '📸 활동 사진']);
  if (buttons.length < 2) return '';
  return `<nav class="pf-filters" aria-label="분류">${buttons
    .map(
      ([key, label]) =>
        `<button type="button" data-pf-filter="${key}"${key === 'all' ? ' class="is-on" aria-pressed="true"' : ' aria-pressed="false"'}>${label}</button>`
    )
    .join('')}</nav>`;
}

function renderAlbum(works, assetMap) {
  const figures = [];
  works.forEach((w) => {
    getWorkPhotos(w).forEach((p) => {
      figures.push(renderFigure(p, resolveSrc(p, p.bucket, assetMap), w.title, w.title || ''));
    });
  });
  return figures.length ? `<section class="pf-album" aria-label="사진 모아 보기">${figures.join('')}</section>` : '';
}

/**
 * 포트폴리오 HTML을 만듭니다.
 * @param {object} state 포트폴리오 상태
 * @param {object} options
 *   assetMap      ZIP 내보내기용: { activityPhotos: {id: path}, images: {...}, attachments: {...} }
 *   emptyMessage  기록이 하나도 없을 때 보여 줄 안내 문구(앱 미리보기용)
 */
export function renderPortfolioHtml(state, options = {}) {
  const { assetMap = null, emptyMessage = '' } = options;
  const tpl = getTemplateMeta(state?.selectedTemplate);
  const p = state?.profile || {};
  let works = Array.isArray(state?.works) ? state.works : [];
  if (tpl.id === 'timeline') works = sortBySchoolYear(works);
  const isShowcase = tpl.id === 'showcase';

  const kicker = [p.academicYear, [p.schoolName, p.gradeClass].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(' · ');

  const cover = `<header class="pf-cover">${kicker ? `<p class="pf-kicker">${escapeHtml(kicker)}</p>` : ''}<h1 class="pf-title">${escapeHtml(
    p.portfolioTitle || '나의 포트폴리오'
  )}</h1>${p.subtitle ? `<p class="pf-subtitle">${escapeHtml(p.subtitle)}</p>` : ''}${
    p.studentName ? `<p class="pf-author">${escapeHtml(p.studentName)}</p>` : ''
  }${p.introText ? `<p class="pf-intro">${escapeHtml(p.introText)}</p>` : ''}</header>`;

  let body = '';
  if (works.length) {
    const slideNav = isShowcase
      ? `<div class="pf-slide-nav"><button type="button" data-pf-slide="prev" aria-label="이전 기록">←</button><span class="pf-slide-count">1 / ${works.length}</span><button type="button" data-pf-slide="next" aria-label="다음 기록">→</button></div>`
      : '';
    body = `${renderFilters(works)}${slideNav}<div class="pf-works">${works
      .map((w, i) => renderWork(w, i, { assetMap, markFirst: isShowcase }))
      .join('')}</div>${renderAlbum(works, assetMap)}`;
  } else if (emptyMessage) {
    body = `<p class="pf-empty">${escapeHtml(emptyMessage)}</p>`;
  }

  return `<div class="pf-wrap"><div class="pf pf-t-${tpl.id}" data-filter="all">${cover}${body}</div></div>`;
}

/* =====================================================================
   시안 9종 CSS
   ===================================================================== */
export function getPortfolioTemplatesCss() {
  return `
/* ---------- 공통 뼈대 ---------- */
.pf-wrap { container-type: inline-size; }
.pf {
  --pf-bg: #FFFFFF; --pf-text: #1F2937; --pf-muted: #6B7280; --pf-accent: #2563EB; --pf-on-accent: #FFFFFF;
  --pf-line: #E5E7EB; --pf-soft: #F3F4F6; --pf-card: #FFFFFF;
  --pf-title-font: 'Noto Sans KR', 'Pretendard', system-ui, sans-serif;
  --pf-radius: 16px;
  --pf-pad: clamp(20px, 5cqi, 48px);
  background: var(--pf-bg);
  color: var(--pf-text);
  font-family: 'Pretendard', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  font-size: 15px;
  line-height: 1.7;
  word-break: keep-all;
  overflow-wrap: anywhere;
  padding: var(--pf-pad);
  border-radius: var(--pf-radius);
}
.pf *, .pf *::before, .pf *::after { box-sizing: border-box; }
.pf h1, .pf h2, .pf p, .pf figure, .pf ul { margin: 0; }
.pf img { display: block; max-width: 100%; }

.pf-cover { margin-bottom: 28px; }
.pf-kicker { font-size: 13px; font-weight: 600; color: var(--pf-muted); letter-spacing: 0.02em; }
.pf-title { font-family: var(--pf-title-font); font-size: clamp(26px, 5cqi, 44px); line-height: 1.25; font-weight: 800; letter-spacing: -0.01em; margin: 8px 0 6px; }
.pf-subtitle { font-size: 16px; color: var(--pf-muted); }
.pf-author { margin-top: 14px; font-weight: 700; }
.pf-intro { margin-top: 10px; max-width: 68ch; white-space: pre-line; }
.pf-empty { padding: 40px 16px; text-align: center; color: var(--pf-muted); border: 1px dashed var(--pf-line); border-radius: 12px; }

.pf-filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
.pf-filters button {
  font: inherit; font-size: 14px; font-weight: 600; line-height: 1.4;
  padding: 6px 14px; border-radius: 999px; cursor: pointer;
  border: 1px solid var(--pf-line); background: transparent; color: inherit;
}
.pf-filters button.is-on { background: var(--pf-accent); border-color: var(--pf-accent); color: var(--pf-on-accent); }

.pf-works { display: grid; gap: 28px; }
.pf-work { display: grid; grid-template-areas: "head" "media" "text"; grid-template-columns: minmax(0, 1fr); gap: 14px; align-content: start; min-width: 0; }
.pf-head { grid-area: head; min-width: 0; }
.pf-media { grid-area: media; min-width: 0; }
.pf-text { grid-area: text; min-width: 0; }

.pf-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; font-size: 13px; color: var(--pf-muted); }
.pf-tag { display: inline-block; padding: 1px 10px; border-radius: 999px; background: var(--pf-accent); color: var(--pf-on-accent); font-weight: 700; font-size: 12.5px; }
.pf-project { font-weight: 700; color: var(--pf-text); }
.pf-work-title { font-family: var(--pf-title-font); font-size: clamp(19px, 3cqi, 24px); line-height: 1.4; font-weight: 800; margin-top: 6px; }
.pf-role { display: flex; flex-wrap: wrap; gap: 4px 14px; margin-top: 6px; font-size: 13.5px; color: var(--pf-muted); }
.pf-role b { color: var(--pf-text); font-weight: 600; }

.pf-content { white-space: pre-line; }
.pf-reflection { margin-top: 14px; padding: 12px 16px; border-left: 3px solid var(--pf-accent); background: var(--pf-soft); border-radius: 0 10px 10px 0; font-size: 14.5px; }
.pf-reflection strong { display: block; font-size: 12.5px; color: var(--pf-accent); margin-bottom: 2px; }
.pf-reflection p { white-space: pre-line; }
.pf-files { list-style: none; padding: 0; margin-top: 14px; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr)); gap: 8px; }
.pf-file-item { position: relative; display: flex; min-width: 0; }
.pf-file { flex: 1; display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--pf-line); border-radius: 12px; color: inherit; text-decoration: none; background: var(--pf-card); min-width: 0; }
.pf-file.is-pdf { padding-right: 48px; }
.pf-file-dl { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--pf-line); background: var(--pf-soft); color: inherit; font: inherit; font-weight: 800; cursor: pointer; }
.pf-file-dl:hover { border-color: var(--pf-accent); }
.pf-file:hover { border-color: var(--pf-accent); }
.pf-file-icon { flex-shrink: 0; display: grid; place-items: center; width: 40px; height: 46px; border-radius: 6px; background: #64748B; color: #FFFFFF; font-size: 11px; font-weight: 800; letter-spacing: 0.02em; }
.pf-file.is-pdf .pf-file-icon { background: #E5484D; }
.pf-file-text { display: grid; min-width: 0; line-height: 1.4; }
.pf-file-text b { font-size: 13.5px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pf-file-text small { font-size: 12px; color: var(--pf-muted); }

/* 사진 배치: 자르지 않고 원래 비율대로, 같은 줄 사진은 높이를 맞춰 줄 너비를 꽉 채움 (--r = 가로/세로)
   - 2~3장: 한 줄을 꽉 채움 / 4장 이상: 마지막 줄의 빈 칸(::after)이 사진이 지나치게 커지는 것만 막음 */
.pf-media, .pf-album { --row-h: 210px; display: flex; flex-wrap: wrap; align-items: flex-start; gap: 10px; }
.pf-media::after, .pf-album::after { content: ""; flex: 2 1 0; }
.pf-media.n-2, .pf-media.n-3 { --row-h: 90px; }
.pf-media.n-2::after, .pf-media.n-3::after { display: none; }
.pf-media.n-1 { --row-h: 440px; justify-content: center; }
.pf-media.n-1::after { display: none; }
.pf-fig { position: relative; flex: var(--r, 1.333) 1 calc(var(--r, 1.333) * var(--row-h)); min-width: 0; max-width: 100%; }
.pf-media.n-1 .pf-fig { flex: 0 1 calc(var(--r, 1.333) * var(--row-h)); }
.pf-fig::before { position: absolute; top: 8px; left: 8px; z-index: 1; padding: 1px 8px; border-radius: 999px; background: rgba(255, 255, 255, 0.9); color: #334155; font-size: 11.5px; font-weight: 700; line-height: 1.6; pointer-events: none; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12); }
.pf-fig[data-kind="art"]::before { content: "🎨 작품"; }
.pf-fig[data-kind="activity"]::before { content: "📸 활동"; }
.pf-fig img { width: 100%; height: auto; aspect-ratio: var(--r, 1.333); object-fit: cover; border-radius: 10px; cursor: zoom-in; background: var(--pf-soft); }
.pf-fig figcaption { margin-top: 6px; font-size: 13px; color: var(--pf-muted); line-height: 1.5; }
.pf-fig figcaption small { display: block; opacity: 0.8; }

/* 분류 버튼 */
.pf[data-filter="subject"] .pf-work[data-kind="project"],
.pf[data-filter="project"] .pf-work[data-kind="subject"] { display: none; }
.pf .pf-album { display: none; --row-h: 220px; gap: 16px; }
.pf[data-filter="art"] .pf-album, .pf[data-filter="activity"] .pf-album { display: flex; }
.pf[data-filter="art"] .pf-album .pf-fig[data-kind="activity"],
.pf[data-filter="activity"] .pf-album .pf-fig[data-kind="art"] { display: none; }
.pf[data-filter="art"] .pf-works, .pf[data-filter="activity"] .pf-works,
.pf[data-filter="art"] .pf-slide-nav, .pf[data-filter="activity"] .pf-slide-nav { display: none; }

/* 슬라이드(시안 6) */
.pf-slide-nav { display: none; }
.pf-slide-nav button { font: inherit; font-size: 18px; font-weight: 700; width: 44px; height: 40px; border-radius: 10px; border: 1px solid var(--pf-line); background: var(--pf-soft); color: inherit; cursor: pointer; }
.pf-slide-count { font-weight: 700; font-variant-numeric: tabular-nums; min-width: 4em; text-align: center; }

/* 사진 크게 보기 */
.pf-lightbox { position: fixed; inset: 0; z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 24px; background: rgba(15, 23, 42, 0.88); cursor: zoom-out; }
.pf-lightbox img { max-width: 100%; max-height: 80vh; border-radius: 10px; background: #FFF; }
.pf-lightbox p { color: #F8FAFC; font-size: 15px; text-align: center; margin: 0; }
.pf-lightbox-close { font: inherit; font-size: 14px; font-weight: 700; padding: 8px 16px; border-radius: 999px; border: 0; background: #FFF; color: #0F172A; cursor: pointer; }

/* ---------- 1. 신문 칼럼 ---------- */
.pf-t-editorial { --pf-bg: #FAF7F2; --pf-text: #1C1917; --pf-muted: #78716C; --pf-accent: #C85A32; --pf-line: #D6CFC5; --pf-soft: #F2ECE1; --pf-title-font: 'Nanum Myeongjo', Georgia, serif; }
.pf-t-editorial .pf-cover { border-bottom: 3px double var(--pf-text); padding-bottom: 22px; }
.pf-t-editorial .pf-works { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 32px 36px; }
.pf-t-editorial .pf-work { border-top: 1px solid var(--pf-line); padding-top: 18px; }
.pf-t-editorial .pf-work:first-child { grid-column: 1 / -1; border-top: 0; padding-top: 0; }
.pf-t-editorial .pf-work:first-child.has-media { grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); grid-template-areas: "head head" "media text"; column-gap: 28px; }
.pf-t-editorial .pf-work:first-child .pf-work-title { font-size: clamp(22px, 4cqi, 32px); }
.pf-t-editorial .pf-tag { background: none; color: var(--pf-accent); padding: 0; border-radius: 0; letter-spacing: 0.06em; }

/* ---------- 2. 미니멀 갤러리 ---------- */
.pf-t-gallery { --pf-bg: #FFFFFF; --pf-text: #111827; --pf-muted: #6B7280; --pf-accent: #3D6B58; --pf-line: #E5E7EB; --pf-soft: #F3F4F6; }
.pf-t-gallery .pf-cover { text-align: center; padding-top: 8px; }
.pf-t-gallery .pf-title { font-weight: 300; }
.pf-t-gallery .pf-intro { margin-inline: auto; }
.pf-t-gallery .pf-filters { justify-content: center; }
.pf-t-gallery .pf-works { grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: 40px 24px; }
.pf-t-gallery .pf-work { grid-template-areas: "media" "head" "text"; gap: 10px; }
.pf-t-gallery .pf-media { gap: 6px; --row-h: 150px; }
.pf-t-gallery .pf-media .pf-fig:first-child { flex-basis: 100%; }
.pf-t-gallery .pf-media.n-1 { --row-h: 380px; }
.pf-t-gallery .pf-fig img { border-radius: 4px; }
.pf-t-gallery .pf-tag { background: none; color: var(--pf-accent); padding: 0; }
.pf-t-gallery .pf-work-title { font-size: 18px; font-weight: 700; }
.pf-t-gallery .pf-reflection { border-left: 0; border-radius: 8px; }

/* ---------- 3. 성장 타임라인 ---------- */
.pf-t-timeline { --pf-bg: #F4F1EA; --pf-text: #1B2A4A; --pf-muted: #64748B; --pf-accent: #D97706; --pf-line: #CBD5E1; --pf-soft: #FFFBEB; }
.pf-t-timeline .pf-cover { background: #1B2A4A; color: #FFFFFF; margin: calc(var(--pf-pad) * -1) calc(var(--pf-pad) * -1) 28px; padding: max(var(--pf-pad), 24px); border-radius: var(--pf-radius) var(--pf-radius) 0 0; }
.pf-t-timeline .pf-kicker, .pf-t-timeline .pf-subtitle { color: #FCD34D; }
.pf-t-timeline .pf-works { border-left: 3px solid var(--pf-accent); padding-left: 26px; margin-left: 8px; gap: 22px; }
.pf-t-timeline .pf-work { position: relative; background: #FFFFFF; border-radius: 14px; padding: 20px; }
.pf-t-timeline .pf-work::before { content: ''; position: absolute; left: -36px; top: 24px; width: 16px; height: 16px; border-radius: 50%; background: var(--pf-accent); border: 3px solid var(--pf-bg); }
.pf-t-timeline .pf-date { order: -1; font-weight: 800; font-size: 14px; color: var(--pf-accent); }
.pf-t-timeline .pf-tag { background: #1B2A4A; }

/* ---------- 4. 탐구 보고서 ---------- */
.pf-t-academic { --pf-bg: #FFFFFF; --pf-text: #0F172A; --pf-muted: #64748B; --pf-accent: #1E3A5F; --pf-line: #CBD5E1; --pf-soft: #F1F5F9; counter-reset: pf-work; }
.pf-t-academic .pf-cover { border-left: 6px solid var(--pf-accent); padding-left: 18px; }
.pf-t-academic .pf-works { gap: 20px; }
.pf-t-academic .pf-work { counter-increment: pf-work; border: 1px solid var(--pf-line); border-radius: 12px; padding: 20px; }
.pf-t-academic .pf-work-title::before { content: counter(pf-work, decimal-leading-zero) ". "; color: var(--pf-accent); }
.pf-t-academic .pf-tag { border-radius: 4px; }
.pf-t-academic .pf-text { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.pf-t-academic .pf-content, .pf-t-academic .pf-reflection { margin: 0; padding: 14px; border-radius: 10px; font-size: 14px; }
.pf-t-academic .pf-content { background: var(--pf-soft); }
.pf-t-academic .pf-content::before { content: "활동 내용"; display: block; font-size: 12.5px; font-weight: 700; color: var(--pf-accent); margin-bottom: 2px; }
.pf-t-academic .pf-reflection { border-left: 0; background: #EFF6FF; }
.pf-t-academic .pf-files { grid-column: 1 / -1; margin-top: 0; }

/* ---------- 5. 스크랩북 ---------- */
.pf-t-scrapbook { --pf-bg: #FFFDF7; --pf-text: #3E2723; --pf-muted: #8D6E63; --pf-accent: #E06D53; --pf-line: #E6DEC8; --pf-soft: #FFF4D6; background-image: radial-gradient(#E0D6CC 1.2px, transparent 1.2px); background-size: 20px 20px; }
.pf-t-scrapbook .pf-cover { background: #FFFFFF; border: 1px solid var(--pf-line); border-radius: 16px; padding: 24px; text-align: center; }
.pf-t-scrapbook .pf-intro { margin-inline: auto; }
.pf-t-scrapbook .pf-filters { justify-content: center; }
.pf-t-scrapbook .pf-works { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 28px; }
.pf-t-scrapbook .pf-work { background: #FFFFFF; border: 1px solid var(--pf-line); border-radius: 14px; padding: 20px; box-shadow: 0 6px 16px rgba(62, 39, 35, 0.06); transform: rotate(-0.4deg); }
.pf-t-scrapbook .pf-work:nth-child(even) { transform: rotate(0.4deg); }
.pf-t-scrapbook .pf-fig { background: #FFFFFF; padding: 8px 8px 10px; box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1); }
.pf-t-scrapbook .pf-fig img { border-radius: 2px; }
.pf-t-scrapbook .pf-reflection { border-left: 0; border-radius: 4px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06); }

/* ---------- 6. 발표 슬라이드 ---------- */
.pf-t-showcase { --pf-bg: #18181B; --pf-text: #F4F4F5; --pf-muted: #A1A1AA; --pf-accent: #14B8A6; --pf-on-accent: #042F2E; --pf-line: #3F3F46; --pf-soft: #27272A; --pf-card: #27272A; }
.pf-t-showcase .pf-slide-nav { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 16px; }
.pf-t-showcase .pf-work { display: none; }
.pf-t-showcase .pf-work.is-current { display: grid; background: var(--pf-soft); border-radius: 16px; padding: clamp(18px, 4cqi, 32px); }
.pf-t-showcase .pf-reflection { background: #18181B; }
.pf-t-showcase .pf-filters { justify-content: center; }

/* ---------- 7. 포토 매거진 ---------- */
.pf-t-mag-life { --pf-bg: #F6F5F0; --pf-text: #262A24; --pf-muted: #78716C; --pf-accent: #4A5D4E; --pf-line: #D8D4C8; --pf-soft: #ECEAE2; --pf-title-font: 'Nanum Myeongjo', Georgia, serif; }
.pf-t-mag-life .pf-cover { text-align: center; border-bottom: 1px solid var(--pf-line); padding-bottom: 28px; }
.pf-t-mag-life .pf-intro { margin-inline: auto; }
.pf-t-mag-life .pf-filters { justify-content: center; }
.pf-t-mag-life .pf-works { gap: 56px; }
.pf-t-mag-life .pf-work { grid-template-areas: "media" "head" "text"; gap: 16px; }
.pf-t-mag-life .pf-work:not(.cover-portrait) .pf-media .pf-fig:first-child { flex: 1 1 100%; }
.pf-t-mag-life .pf-tag { background: none; color: var(--pf-accent); padding: 0; letter-spacing: 0.1em; }
.pf-t-mag-life .pf-work-title { font-size: clamp(22px, 3.6cqi, 30px); }
.pf-t-mag-life .pf-text { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: 24px; align-items: start; }
.pf-t-mag-life .pf-reflection { margin-top: 0; }
.pf-t-mag-life .pf-files { grid-column: 1 / -1; margin-top: 0; }

/* ---------- 8. 팝 아트진 ---------- */
.pf-t-mag-zine { --pf-bg: #FCFBF7; --pf-text: #111111; --pf-muted: #3F3F46; --pf-accent: #EA580C; --pf-line: #111111; --pf-soft: #FEF3C7; }
.pf-t-mag-zine .pf-cover { background: #FACC15; border: 2px solid #111111; box-shadow: 5px 5px 0 #111111; border-radius: 14px; padding: 24px; }
.pf-t-mag-zine .pf-kicker, .pf-t-mag-zine .pf-subtitle { color: #111111; font-weight: 700; }
.pf-t-mag-zine .pf-title, .pf-t-mag-zine .pf-work-title { font-weight: 900; letter-spacing: -0.03em; }
.pf-t-mag-zine .pf-filters button { border: 2px solid #111111; font-weight: 800; }
.pf-t-mag-zine .pf-filters button.is-on { background: #111111; border-color: #111111; color: #FFFFFF; }
.pf-t-mag-zine .pf-works { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 28px; }
.pf-t-mag-zine .pf-work { background: #FFFFFF; border: 2px solid #111111; box-shadow: 5px 5px 0 #111111; border-radius: 14px; padding: 20px; }
.pf-t-mag-zine .pf-work[data-kind="project"] { background: #FFF7ED; }
.pf-t-mag-zine .pf-tag { background: #111111; color: #FFFFFF; border-radius: 4px; }
.pf-t-mag-zine .pf-work[data-kind="project"] .pf-tag { background: var(--pf-accent); }
.pf-t-mag-zine .pf-fig img { border: 2px solid #111111; border-radius: 8px; }
.pf-t-mag-zine .pf-reflection { border: 2px solid #111111; border-radius: 10px; font-weight: 600; }
.pf-t-mag-zine .pf-reflection strong { color: #111111; }

/* ---------- 9. 책 펼침면 ---------- */
.pf-t-mag-book { --pf-bg: #F7F3E8; --pf-text: #231F20; --pf-muted: #78716C; --pf-accent: #6B1D2F; --pf-line: #C8B9A6; --pf-soft: #EFE9D8; --pf-title-font: 'Nanum Myeongjo', Georgia, serif; }
.pf-t-mag-book .pf-cover { text-align: center; border-bottom: 2px solid var(--pf-accent); padding-bottom: 22px; }
.pf-t-mag-book .pf-intro { margin-inline: auto; }
.pf-t-mag-book .pf-filters { justify-content: center; }
.pf-t-mag-book .pf-work { background: #FBF8F0; border: 1px solid var(--pf-line); border-radius: 10px; padding: clamp(18px, 3.5cqi, 32px); box-shadow: 0 8px 20px rgba(35, 31, 32, 0.06); }
.pf-t-mag-book .pf-work.has-media { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-areas: "head media" "text media"; column-gap: 0; }
.pf-t-mag-book .pf-work.has-media .pf-head, .pf-t-mag-book .pf-work.has-media .pf-text { padding-right: clamp(16px, 3cqi, 32px); }
.pf-t-mag-book .pf-work.has-media .pf-media { border-left: 1px solid var(--pf-line); padding-left: clamp(16px, 3cqi, 32px); --row-h: 170px; }
.pf-t-mag-book .pf-tag { background: none; color: var(--pf-accent); padding: 0; letter-spacing: 0.06em; }
.pf-t-mag-book .pf-content::first-letter { float: left; font-family: var(--pf-title-font); font-size: 2.8em; line-height: 1; font-weight: 800; color: var(--pf-accent); margin: 4px 8px 0 0; }
.pf-t-mag-book .pf-reflection { background: rgba(107, 29, 47, 0.07); }

/* ---------- 10. 말랑 파스텔 (귀여운) ---------- */
.pf-t-pastel { --pf-bg: #FFF4F7; --pf-text: #4A3B52; --pf-muted: #8E7F96; --pf-accent: #FF7EA8; --pf-line: #FFD6E3; --pf-soft: #F3EEFF; --pf-title-font: 'Jua', 'Noto Sans KR', sans-serif; --pf-radius: 28px;
  background-image: radial-gradient(circle at 8% 6%, #FFE1EC 0 90px, transparent 91px), radial-gradient(circle at 96% 18%, #E2F7F1 0 70px, transparent 71px), radial-gradient(circle at 90% 96%, #EEE8FF 0 110px, transparent 111px); }
.pf-t-pastel .pf-cover { text-align: center; background: #FFFFFF; border-radius: 28px; padding: 28px 20px; box-shadow: 0 8px 0 #FFD6E3; }
.pf-t-pastel .pf-cover::before { content: "🌷 ⭐ 🌈"; display: block; font-size: 22px; letter-spacing: 6px; margin-bottom: 4px; }
.pf-t-pastel .pf-title { font-weight: 400; color: #FF5C93; }
.pf-t-pastel .pf-intro { margin-inline: auto; }
.pf-t-pastel .pf-author::before { content: "✏️ "; }
.pf-t-pastel .pf-filters { justify-content: center; }
.pf-t-pastel .pf-filters button { border: 2px solid #FFD6E3; background: #FFFFFF; font-family: 'Jua', sans-serif; font-weight: 400; font-size: 15px; }
.pf-t-pastel .pf-filters button.is-on { background: #FF7EA8; border-color: #FF7EA8; }
.pf-t-pastel .pf-works { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
.pf-t-pastel .pf-work { background: #FFFFFF; border-radius: 26px; padding: 22px; border: 3px solid #FFD6E3; box-shadow: 0 6px 0 #FFD6E3; }
.pf-t-pastel .pf-work:nth-child(3n+2) { border-color: #BFEDE0; box-shadow: 0 6px 0 #BFEDE0; }
.pf-t-pastel .pf-work:nth-child(3n+3) { border-color: #DCD3FF; box-shadow: 0 6px 0 #DCD3FF; }
.pf-t-pastel .pf-tag { font-family: 'Jua', sans-serif; font-weight: 400; font-size: 14px; padding: 2px 12px; }
.pf-t-pastel .pf-work[data-kind="subject"] .pf-tag::before { content: "📚 "; }
.pf-t-pastel .pf-work[data-kind="project"] .pf-tag { background: #4FC3A1; }
.pf-t-pastel .pf-work[data-kind="project"] .pf-tag::before { content: "🚀 "; }
.pf-t-pastel .pf-work-title { font-weight: 400; font-size: clamp(20px, 3.2cqi, 25px); }
.pf-t-pastel .pf-fig img { border-radius: 18px; border: 4px solid #FFFFFF; box-shadow: 0 3px 10px rgba(255, 126, 168, 0.25); }
.pf-t-pastel .pf-reflection { position: relative; margin-top: 18px; border-left: 0; border-radius: 20px; background: #F3EEFF; padding: 14px 18px; }
.pf-t-pastel .pf-reflection::before { content: ""; position: absolute; top: -10px; left: 28px; border: 10px solid transparent; border-top: 0; border-bottom-color: #F3EEFF; }
.pf-t-pastel .pf-reflection strong { font-family: 'Jua', sans-serif; font-weight: 400; font-size: 14px; color: #8A6CF0; }
.pf-t-pastel .pf-reflection strong::before { content: "💬 "; }

/* ---------- 11. 크레파스 그림일기 (귀여운) ---------- */
.pf-t-crayon { --pf-bg: #FFFDF2; --pf-text: #3B3A36; --pf-muted: #7A776E; --pf-accent: #FF6B6B; --pf-line: #3B3A36; --pf-soft: #FFF4C7; --pf-title-font: 'Gaegu', 'Noto Sans KR', sans-serif;
  --hand: 255px 15px 225px 15px / 15px 225px 15px 255px;
  background-image: repeating-linear-gradient(transparent 0 31px, #E9E4CF 31px 32px); }
.pf-t-crayon .pf-cover { text-align: center; padding: 24px 16px; border: 3px solid #3B3A36; border-radius: var(--hand); background: #FFFFFF; }
.pf-t-crayon .pf-cover::before { content: "☀️ 나의 그림일기 ☀️"; display: block; font-family: 'Gaegu', sans-serif; font-weight: 700; font-size: 18px; color: #FF9F1C; }
.pf-t-crayon .pf-title { font-weight: 700; font-size: clamp(30px, 6cqi, 48px); text-decoration: underline wavy #FF6B6B 3px; text-underline-offset: 8px; }
.pf-t-crayon .pf-subtitle, .pf-t-crayon .pf-intro, .pf-t-crayon .pf-author { font-family: 'Gaegu', sans-serif; font-size: 19px; }
.pf-t-crayon .pf-intro { margin-inline: auto; }
.pf-t-crayon .pf-filters { justify-content: center; }
.pf-t-crayon .pf-filters button { border: 2px solid #3B3A36; border-radius: var(--hand); font-family: 'Gaegu', sans-serif; font-size: 17px; font-weight: 700; background: #FFFFFF; }
.pf-t-crayon .pf-filters button.is-on { background: #FFD43B; border-color: #3B3A36; color: #3B3A36; }
.pf-t-crayon .pf-works { gap: 30px; }
.pf-t-crayon .pf-work { background: #FFFFFF; border: 3px solid #3B3A36; border-radius: var(--hand); padding: 22px 24px; }
.pf-t-crayon .pf-work.has-media { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-areas: "head head" "media text"; column-gap: 22px; }
.pf-t-crayon .pf-meta { font-family: 'Gaegu', sans-serif; font-size: 17px; color: #3B3A36; }
.pf-t-crayon .pf-date { order: -1; font-weight: 700; }
.pf-t-crayon .pf-date::after { content: " 🌤️"; }
.pf-t-crayon .pf-tag { background: none; color: #3B3A36; border: 2px solid #3B3A36; border-radius: var(--hand); font-family: 'Gaegu', sans-serif; font-size: 16px; }
.pf-t-crayon .pf-work:nth-child(4n+1) .pf-tag { background: #FFD6D6; }
.pf-t-crayon .pf-work:nth-child(4n+2) .pf-tag { background: #D3F9D8; }
.pf-t-crayon .pf-work:nth-child(4n+3) .pf-tag { background: #D0EBFF; }
.pf-t-crayon .pf-work:nth-child(4n+4) .pf-tag { background: #FFF3BF; }
.pf-t-crayon .pf-work-title { font-weight: 700; font-size: clamp(24px, 4cqi, 30px); }
.pf-t-crayon .pf-fig img { border: 3px solid #3B3A36; border-radius: var(--hand); }
.pf-t-crayon .pf-fig::before { border: 2px solid #3B3A36; box-shadow: none; }
.pf-t-crayon .pf-content { font-size: 15.5px; line-height: 32px; }
.pf-t-crayon .pf-reflection { border: 2px dashed #FF6B6B; border-radius: 14px; background: #FFF8F0; font-family: 'Gaegu', sans-serif; font-size: 19px; line-height: 1.5; }
.pf-t-crayon .pf-reflection strong { font-size: 16px; color: #FF6B6B; }
.pf-t-crayon .pf-file { border: 2px solid #3B3A36; }

/* ---------- 12. 알록달록 무지개 (귀여운) ---------- */
.pf-t-rainbow { --pf-bg: #FFFFFF; --pf-text: #2F3A4A; --pf-muted: #6B7686; --pf-accent: #7C6CF2; --pf-line: #E9E5FF; --pf-soft: #F6F4FF; --pf-title-font: 'Jua', 'Noto Sans KR', sans-serif; --pf-radius: 26px; }
.pf-t-rainbow .pf-cover { text-align: center; padding: 30px 20px 24px; border-radius: 24px; background: #FFFDF5; border: 3px solid #FFE8A3; position: relative; overflow: hidden; }
.pf-t-rainbow .pf-cover::before { content: ""; position: absolute; inset: 0 0 auto 0; height: 10px; background: linear-gradient(90deg, #FF8A8A, #FFB86B, #FFE26B, #7FDB9A, #6BC4FF, #A98BFF); }
.pf-t-rainbow .pf-cover::after { content: "🌈"; position: absolute; right: 16px; top: 18px; font-size: 34px; }
.pf-t-rainbow .pf-title { font-weight: 400; font-size: clamp(28px, 5.5cqi, 46px); }
.pf-t-rainbow .pf-intro { margin-inline: auto; }
.pf-t-rainbow .pf-filters { justify-content: center; }
.pf-t-rainbow .pf-filters button { font-family: 'Jua', sans-serif; font-weight: 400; font-size: 15px; border: 2px solid #E9E5FF; }
.pf-t-rainbow .pf-works { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px; }
.pf-t-rainbow .pf-work { --c: #FF8A8A; --c-soft: #FFF0F0; background: var(--c-soft); border-radius: 24px; padding: 20px; border-top: 10px solid var(--c); }
.pf-t-rainbow .pf-work:nth-child(6n+2) { --c: #FFB86B; --c-soft: #FFF5EA; }
.pf-t-rainbow .pf-work:nth-child(6n+3) { --c: #F5C800; --c-soft: #FFFBE5; }
.pf-t-rainbow .pf-work:nth-child(6n+4) { --c: #4CC77A; --c-soft: #EDFBF2; }
.pf-t-rainbow .pf-work:nth-child(6n+5) { --c: #4AAEF0; --c-soft: #EBF6FF; }
.pf-t-rainbow .pf-work:nth-child(6n+6) { --c: #A98BFF; --c-soft: #F4F0FF; }
.pf-t-rainbow .pf-tag { background: var(--c); font-family: 'Jua', sans-serif; font-weight: 400; font-size: 14px; }
.pf-t-rainbow .pf-work-title { font-weight: 400; font-size: clamp(20px, 3.2cqi, 25px); }
.pf-t-rainbow .pf-fig img { border-radius: 16px; }
.pf-t-rainbow .pf-reflection { border-left: 0; border-radius: 16px; background: #FFFFFF; border: 2px solid var(--c); }
.pf-t-rainbow .pf-reflection strong { color: var(--pf-text); }
.pf-t-rainbow .pf-reflection strong::before { content: "⭐ "; }
.pf-t-rainbow .pf-file { background: #FFFFFF; }

/* ---------- 13. 뭉게구름 하늘 (귀여운) ---------- */
.pf-t-cloud { --pf-bg: #DDF2FF; --pf-text: #2B4A6B; --pf-muted: #6E8BA8; --pf-accent: #4AA8F0; --pf-line: #BFE3FF; --pf-soft: #F0F9FF; --pf-title-font: 'Jua', 'Noto Sans KR', sans-serif; --pf-radius: 30px;
  background-image: radial-gradient(ellipse 140px 60px at 12% 9%, #FFFFFF 98%, transparent 100%), radial-gradient(ellipse 90px 45px at 20% 6%, #FFFFFF 98%, transparent 100%),
    radial-gradient(ellipse 160px 64px at 88% 40%, rgba(255,255,255,0.85) 98%, transparent 100%), radial-gradient(ellipse 120px 50px at 8% 78%, rgba(255,255,255,0.8) 98%, transparent 100%),
    linear-gradient(180deg, #BDE7FF 0%, #E9F7FF 100%); }
.pf-t-cloud .pf-cover { position: relative; text-align: center; background: #FFFFFF; border-radius: 60px; padding: 34px 24px 26px; box-shadow: 0 10px 0 #C9E9FF; margin-top: 30px; }
.pf-t-cloud .pf-cover::before { content: ""; position: absolute; left: 18%; top: -34px; width: 110px; height: 80px; border-radius: 50%; background: #FFFFFF; box-shadow: 150px -6px 0 18px #FFFFFF, 330px 4px 0 2px #FFFFFF; z-index: 0; }
.pf-t-cloud .pf-cover > * { position: relative; z-index: 1; }
.pf-t-cloud .pf-cover::after { content: "☀️"; position: absolute; right: 20px; top: -22px; font-size: 40px; z-index: 2; }
.pf-t-cloud .pf-title { font-weight: 400; color: #2F8FDB; }
.pf-t-cloud .pf-intro { margin-inline: auto; }
.pf-t-cloud .pf-filters { justify-content: center; }
.pf-t-cloud .pf-filters button { background: #FFFFFF; border: 2px solid #BFE3FF; font-family: 'Jua', sans-serif; font-weight: 400; font-size: 15px; }
.pf-t-cloud .pf-works { gap: 30px; }
.pf-t-cloud .pf-work { background: #FFFFFF; border-radius: 40px; padding: 24px 26px; box-shadow: 0 8px 0 #C9E9FF, 0 14px 30px rgba(74, 168, 240, 0.15); }
.pf-t-cloud .pf-tag { background: #4AA8F0; font-family: 'Jua', sans-serif; font-weight: 400; font-size: 14px; }
.pf-t-cloud .pf-tag::before { content: "☁️ "; }
.pf-t-cloud .pf-work-title { font-weight: 400; font-size: clamp(21px, 3.4cqi, 27px); }
.pf-t-cloud .pf-fig img { border-radius: 22px; }
.pf-t-cloud .pf-reflection { border-left: 0; border-radius: 24px; background: #FFF6CC; }
.pf-t-cloud .pf-reflection strong { color: #E0A100; font-family: 'Jua', sans-serif; font-weight: 400; font-size: 14px; }
.pf-t-cloud .pf-reflection strong::before { content: "☀️ "; }

/* ---------- 14. 곰돌이 친구들 (귀여운) ---------- */
.pf-t-bear { --pf-bg: #FFF6EA; --pf-text: #5A3E2B; --pf-muted: #9A7B62; --pf-accent: #C08A5B; --pf-line: #E8C9A0; --pf-soft: #FFF0D6; --pf-title-font: 'Jua', 'Noto Sans KR', sans-serif; --pf-radius: 28px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Cg fill='%23EBD3B5'%3E%3Cellipse cx='32' cy='40' rx='11' ry='9'/%3E%3Ccircle cx='19' cy='27' r='5'/%3E%3Ccircle cx='28' cy='21' r='5'/%3E%3Ccircle cx='37' cy='21' r='5'/%3E%3Ccircle cx='46' cy='27' r='5'/%3E%3C/g%3E%3C/svg%3E"); background-size: 64px 64px; }
.pf-t-bear .pf-cover, .pf-t-bear .pf-work { position: relative; background: #FFFFFF; border: 3px solid #E8C9A0; border-radius: 30px; }
.pf-t-bear .pf-cover { text-align: center; padding: 28px 22px 24px; margin-top: 26px; }
.pf-t-bear .pf-cover::before, .pf-t-bear .pf-cover::after, .pf-t-bear .pf-work::before, .pf-t-bear .pf-work::after {
  content: ""; position: absolute; top: -22px; width: 46px; height: 46px; border-radius: 50%; border: 3px solid #E8C9A0; background: radial-gradient(circle, #F6C9B4 0 38%, #C08A5B 40%); z-index: -1; }
.pf-t-bear .pf-cover::before, .pf-t-bear .pf-work::before { left: 22px; }
.pf-t-bear .pf-cover::after, .pf-t-bear .pf-work::after { right: 22px; }
/* 귀(::before/::after)가 카드 뒤에 깔리도록 부모에서 쌓임 맥락을 만듭니다 */
.pf-t-bear, .pf-t-bear .pf-works { isolation: isolate; }
.pf-t-bear .pf-title { font-weight: 400; color: #8A5A34; }
.pf-t-bear .pf-title::before { content: "🐻 "; }
.pf-t-bear .pf-intro { margin-inline: auto; }
.pf-t-bear .pf-filters { justify-content: center; }
.pf-t-bear .pf-filters button { background: #FFFFFF; border: 2px solid #E8C9A0; font-family: 'Jua', sans-serif; font-weight: 400; font-size: 15px; }
.pf-t-bear .pf-filters button.is-on { background: #C08A5B; border-color: #C08A5B; }
.pf-t-bear .pf-works { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 44px 24px; padding-top: 18px; }
.pf-t-bear .pf-work { padding: 22px; }
.pf-t-bear .pf-tag { background: #C08A5B; font-family: 'Jua', sans-serif; font-weight: 400; font-size: 14px; }
.pf-t-bear .pf-tag::before { content: "🐾 "; }
.pf-t-bear .pf-work-title { font-weight: 400; font-size: clamp(20px, 3.2cqi, 25px); }
.pf-t-bear .pf-fig img { border-radius: 20px; border: 3px solid #F3E2CC; }
.pf-t-bear .pf-reflection { border-left: 0; border-radius: 20px; background: #FFE8B0; }
.pf-t-bear .pf-reflection strong { color: #A86B1E; font-family: 'Jua', sans-serif; font-weight: 400; font-size: 14px; }
.pf-t-bear .pf-reflection strong::before { content: "🍯 "; }

/* ---------- 15. 반짝 우주 탐험 (귀여운) ---------- */
.pf-t-space { --pf-bg: #1B1E4B; --pf-text: #F4F1FF; --pf-muted: #B9B4E6; --pf-accent: #FFE66D; --pf-on-accent: #1B1E4B; --pf-line: rgba(255, 255, 255, 0.22); --pf-soft: rgba(255, 255, 255, 0.08); --pf-card: #2A2E66; --pf-title-font: 'Jua', 'Noto Sans KR', sans-serif; --pf-radius: 26px;
  background-image: radial-gradient(1.6px 1.6px at 20px 30px, #FFFFFF 99%, transparent), radial-gradient(1.2px 1.2px at 90px 120px, #FFF6B0 99%, transparent),
    radial-gradient(2px 2px at 160px 60px, #FFFFFF 99%, transparent), radial-gradient(1px 1px at 60px 170px, #C9C2FF 99%, transparent),
    radial-gradient(circle at 85% 8%, rgba(255, 126, 200, 0.25), transparent 30%), radial-gradient(circle at 5% 60%, rgba(120, 200, 255, 0.18), transparent 35%);
  background-size: 200px 200px, 200px 200px, 200px 200px, 200px 200px, 100% 100%, 100% 100%; }
.pf-t-space .pf-cover { text-align: center; padding: 26px 16px; }
.pf-t-space .pf-cover::before { content: "🚀  🪐  ⭐"; display: block; font-size: 30px; letter-spacing: 4px; margin-bottom: 6px; }
.pf-t-space .pf-title { font-weight: 400; background: linear-gradient(90deg, #FFE66D, #FF9ED8, #9BD8FF); -webkit-background-clip: text; background-clip: text; color: transparent; }
.pf-t-space .pf-intro { margin-inline: auto; }
.pf-t-space .pf-filters { justify-content: center; }
.pf-t-space .pf-filters button { font-family: 'Jua', sans-serif; font-weight: 400; font-size: 15px; }
.pf-t-space .pf-works { gap: 26px; }
.pf-t-space .pf-work { background: rgba(255, 255, 255, 0.07); border: 2px solid rgba(255, 255, 255, 0.18); border-radius: 26px; padding: 24px; box-shadow: 0 0 30px rgba(155, 216, 255, 0.12); }
.pf-t-space .pf-tag { font-family: 'Jua', sans-serif; font-weight: 400; font-size: 14px; }
.pf-t-space .pf-tag::before { content: "✨ "; }
.pf-t-space .pf-project { color: #9BD8FF; }
.pf-t-space .pf-work-title { font-weight: 400; font-size: clamp(21px, 3.4cqi, 27px); }
.pf-t-space .pf-role b { color: #F4F1FF; }
.pf-t-space .pf-fig img { border-radius: 18px; }
.pf-t-space .pf-reflection { border-left: 0; border-radius: 18px; background: rgba(255, 158, 216, 0.14); border: 1px solid rgba(255, 158, 216, 0.4); }
.pf-t-space .pf-reflection strong { color: #FF9ED8; font-family: 'Jua', sans-serif; font-weight: 400; font-size: 14px; }
.pf-t-space .pf-reflection strong::before { content: "🌙 "; }

/* ---------- 사진이 세로형이면: 넓은 카드에서는 사진과 글을 나란히 (여백 줄이기) ---------- */
.pf-t-editorial .pf-work:first-child.portrait-set.has-text,
.pf-t-timeline .pf-work.portrait-set.has-text,
.pf-t-academic .pf-work.portrait-set.has-text,
.pf-t-showcase .pf-work.portrait-set.has-text,
.pf-t-mag-life .pf-work.portrait-set.has-text,
.pf-t-cloud .pf-work.portrait-set.has-text,
.pf-t-space .pf-work.portrait-set.has-text,
.pf-t-pastel .pf-work:last-child:nth-child(odd).portrait-set.has-text,
.pf-t-rainbow .pf-work:last-child:nth-child(odd).portrait-set.has-text,
.pf-t-bear .pf-work:last-child:nth-child(odd).portrait-set.has-text,
.pf-t-scrapbook .pf-work:last-child:nth-child(odd).portrait-set.has-text,
.pf-t-mag-zine .pf-work:last-child:nth-child(odd).portrait-set.has-text {
  grid-template-columns: minmax(0, 2fr) minmax(0, 3fr); grid-template-areas: "head head" "media text"; column-gap: 26px; align-items: start;
}
.pf .pf-work.portrait-set.has-text .pf-media.n-many { --row-h: 160px; }
.pf .pf-work.portrait-set.has-text .pf-media.n-1 { --row-h: 460px; }
.pf-t-academic .pf-work.portrait-set.has-text .pf-text,
.pf-t-mag-life .pf-work.portrait-set.has-text .pf-text { grid-template-columns: minmax(0, 1fr); }
/* 크레파스 그림일기: 대표 사진이 가로면 사진을 위에 넓게 */
.pf-t-crayon .pf-work.has-media.cover-landscape { grid-template-columns: minmax(0, 1fr); grid-template-areas: "head" "media" "text"; }

/* ---------- 2단 배치에서 마지막 카드가 혼자 남으면 가로 전체 사용 ---------- */
.pf-t-pastel .pf-work:last-child:nth-child(odd),
.pf-t-rainbow .pf-work:last-child:nth-child(odd),
.pf-t-bear .pf-work:last-child:nth-child(odd),
.pf-t-scrapbook .pf-work:last-child:nth-child(odd),
.pf-t-mag-zine .pf-work:last-child:nth-child(odd),
.pf-t-editorial .pf-work:last-child:nth-child(even) { grid-column: 1 / -1; }

/* ---------- 휴대폰처럼 좁은 화면: 모두 한 줄로 ---------- */
@container (max-width: 640px) {
  .pf .pf-works { grid-template-columns: minmax(0, 1fr) !important; }
  .pf .pf-work, .pf .pf-work.has-media, .pf .pf-work:first-child.has-media { grid-template-columns: minmax(0, 1fr) !important; grid-template-areas: "head" "media" "text" !important; }
  .pf-t-gallery .pf-work, .pf-t-mag-life .pf-work { grid-template-areas: "media" "head" "text" !important; }
  .pf .pf-text { grid-template-columns: minmax(0, 1fr) !important; }
  .pf .pf-media, .pf .pf-work .pf-media { --row-h: 150px !important; }
  .pf .pf-media.n-2 { --row-h: 200px !important; }
  .pf .pf-media.n-1 { --row-h: 340px !important; }
  .pf-t-mag-book .pf-work.has-media .pf-head, .pf-t-mag-book .pf-work.has-media .pf-text { padding-right: 0; }
  .pf-t-mag-book .pf-work.has-media .pf-media { border-left: 0; padding-left: 0; }
  .pf-t-scrapbook .pf-work { transform: none !important; }
  .pf-t-rainbow .pf-cover { padding-top: 56px; }
  .pf-t-rainbow .pf-cover::after { top: 18px; right: 50%; transform: translateX(50%); font-size: 28px; }
  .pf-t-timeline .pf-works { padding-left: 18px; margin-left: 4px; }
  .pf-t-timeline .pf-work::before { left: -28px; }
}

/* ---------- 인쇄 ---------- */
@media print {
  .pf { --pf-pad: 0px; padding: 0; border-radius: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .pf-filters, .pf-slide-nav, .pf-file-dl { display: none !important; }
  .pf .pf-works { display: grid !important; }
  .pf .pf-work { display: grid !important; break-inside: avoid; transform: none !important; }
  .pf .pf-album { display: none !important; }
  .pf-t-timeline .pf-cover { margin: 0 0 24px; border-radius: 12px; }
  .pf-t-showcase { --pf-bg: #FFFFFF; --pf-text: #18181B; --pf-muted: #52525B; --pf-soft: #F4F4F5; --pf-line: #D4D4D8; --pf-on-accent: #FFFFFF; --pf-accent: #0F766E; }
  .pf-t-showcase .pf-reflection { background: #F4F4F5; }
  .pf-t-space { --pf-bg: #FFFFFF; --pf-text: #1B1E4B; --pf-muted: #55597A; --pf-accent: #5B4BC4; --pf-on-accent: #FFFFFF; --pf-line: #D6D3F0; --pf-soft: #F3F1FF; --pf-card: #FFFFFF; background-image: none; }
  .pf-t-space .pf-title { background: none; color: #5B4BC4; }
  .pf-t-space .pf-work { background: #FFFFFF; border-color: #D6D3F0; box-shadow: none; }
}
`;
}

/* =====================================================================
   PDF(A4 인쇄)용 문서 — 어떤 시안을 골라도 깔끔하게 인쇄되도록 하나의 형식만 씁니다.
   강조색만 고른 시안을 따라갑니다.
   ===================================================================== */
export function renderPrintDocumentHtml(state, { assetMap = null } = {}) {
  const tpl = getTemplateMeta(state?.selectedTemplate);
  const accent = tpl.colors.printAccent || (tpl.id === 'showcase' ? '#0F766E' : tpl.colors.accent);
  const p = state?.profile || {};
  const works = Array.isArray(state?.works) ? state.works : [];

  const info = [
    ['이름', p.studentName],
    ['학교', p.schoolName],
    ['학년·반', p.gradeClass],
    ['학년도', p.academicYear]
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `<div><dt>${k}</dt><dd>${escapeHtml(v)}</dd></div>`)
    .join('');

  const tagOf = (w) => (w.entryType === 'project' ? `프로젝트 · ${w.projectName || ''}` : w.subject || '교과');

  const toc = works.length
    ? `<div class="pdoc-toc"><h2>차례</h2><ol>${works
        .map((w) => `<li><span>${escapeHtml(w.title || '제목 없는 활동')}</span><em>${escapeHtml(tagOf(w))}</em></li>`)
        .join('')}</ol></div>`
    : '';

  const workHtml = works
    .map((w, i) => {
      const photos = getWorkPhotos(w);
      const media = photos.length
        ? `<div class="pdoc-media ${mediaCountClass(photos.length)}">${photos
            .map((ph) => renderFigure(ph, resolveSrc(ph, ph.bucket, assetMap), w.title))
            .join('')}</div>`
        : '';
      const files = (w.attachments || []).length
        ? `<p class="pdoc-files">첨부파일: ${w.attachments.map((a) => escapeHtml(a.name)).join(', ')}</p>`
        : '';
      const role = [w.projectRole && `맡은 역할: ${w.projectRole}`, w.linkedSubjects && `함께한 과목: ${w.linkedSubjects}`]
        .filter((x) => w.entryType === 'project' && x)
        .join(' · ');
      return `<article class="pdoc-work">
<header><span class="pdoc-num">${String(i + 1).padStart(2, '0')}</span><div><p class="pdoc-meta">${escapeHtml(tagOf(w))}${
        w.semester || w.month ? ` · ${escapeHtml([w.semester, w.month].filter(Boolean).join(' '))}` : ''
      }</p><h2>${escapeHtml(w.title || '제목 없는 활동')}</h2>${role ? `<p class="pdoc-meta">${escapeHtml(role)}</p>` : ''}</div></header>
${media}${w.content ? `<p class="pdoc-content">${escapeHtml(w.content)}</p>` : ''}${
        w.reflection ? `<div class="pdoc-reflection"><strong>배우고 느낀 점</strong><p>${escapeHtml(w.reflection)}</p></div>` : ''
      }${files}
</article>`;
    })
    .join('');

  return `<div id="printable-portfolio-area" class="pdoc" style="--pdoc-accent:${accent}">
<section class="pdoc-sheet pdoc-cover">
<p class="pdoc-kicker">${escapeHtml(p.academicYear || '')} 포트폴리오</p>
<h1>${escapeHtml(p.portfolioTitle || '나의 포트폴리오')}</h1>
${p.subtitle ? `<p class="pdoc-subtitle">${escapeHtml(p.subtitle)}</p>` : ''}
${info ? `<dl class="pdoc-info">${info}</dl>` : ''}
${p.introText ? `<div class="pdoc-intro"><h2>나를 소개합니다</h2><p>${escapeHtml(p.introText)}</p></div>` : ''}
${toc}
</section>
${works.length ? `<section class="pdoc-sheet">${workHtml}</section>` : ''}
</div>`;
}

export function getPrintDocumentCss() {
  return `
.pdoc { --pdoc-accent: #1E3A5F; background: #E2E8F0; padding: 24px; border-radius: 12px; color: #0F172A; font-family: 'Pretendard', 'Noto Sans KR', system-ui, sans-serif; line-height: 1.65; word-break: keep-all; overflow-wrap: anywhere; }
.pdoc *, .pdoc *::before, .pdoc *::after { box-sizing: border-box; }
.pdoc h1, .pdoc h2, .pdoc p, .pdoc figure, .pdoc ol, .pdoc dl, .pdoc dd { margin: 0; }
.pdoc-sheet { background: #FFFFFF; max-width: 794px; margin: 0 auto 24px; padding: 48px; box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12); border-radius: 4px; }
.pdoc-cover { border-top: 8px solid var(--pdoc-accent); }
.pdoc-kicker { font-size: 13px; font-weight: 700; color: var(--pdoc-accent); }
.pdoc-cover h1 { font-size: 32px; line-height: 1.3; margin: 8px 0 6px; }
.pdoc-subtitle { font-size: 15px; color: #475569; }
.pdoc-info { display: flex; flex-wrap: wrap; gap: 8px 28px; margin: 22px 0; padding: 14px 0; border-top: 1px solid #E2E8F0; border-bottom: 1px solid #E2E8F0; font-size: 14px; }
.pdoc-info div { display: flex; gap: 8px; }
.pdoc-info dt { color: #64748B; }
.pdoc-info dd { font-weight: 700; }
.pdoc-intro h2, .pdoc-toc h2 { font-size: 14px; color: var(--pdoc-accent); margin-bottom: 6px; }
.pdoc-intro p { font-size: 14px; white-space: pre-line; }
.pdoc-toc { margin-top: 24px; }
.pdoc-toc ol { padding-left: 22px; font-size: 14px; }
.pdoc-toc li { padding: 3px 0; }
.pdoc-toc em { font-style: normal; color: #64748B; margin-left: 8px; font-size: 12.5px; }
.pdoc-work { padding: 20px 0; border-bottom: 1px solid #E2E8F0; break-inside: avoid; page-break-inside: avoid; }
.pdoc-work:first-child { padding-top: 0; }
.pdoc-work:last-child { border-bottom: 0; }
.pdoc-work header { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 10px; }
.pdoc-num { font-size: 22px; font-weight: 800; color: var(--pdoc-accent); line-height: 1.2; }
.pdoc-meta { font-size: 12.5px; color: #64748B; }
.pdoc-work h2 { font-size: 18px; line-height: 1.4; }
.pdoc-media { --row-h: 140px; display: flex; flex-wrap: wrap; align-items: flex-start; gap: 8px; margin: 10px 0; }
.pdoc-media::after { content: ""; flex: 2 1 0; }
.pdoc-media.n-2, .pdoc-media.n-3 { --row-h: 60px; }
.pdoc-media.n-2::after, .pdoc-media.n-3::after { display: none; }
.pdoc-media.n-1 { --row-h: 280px; justify-content: center; }
.pdoc-media.n-1::after { display: none; }
.pdoc-media figure { position: relative; flex: var(--r, 1.333) 1 calc(var(--r, 1.333) * var(--row-h)); min-width: 0; max-width: 100%; break-inside: avoid; }
.pdoc-media.n-1 figure { flex: 0 1 calc(var(--r, 1.333) * var(--row-h)); }
.pdoc-media img { display: block; width: 100%; height: auto; aspect-ratio: var(--r, 1.333); object-fit: cover; border-radius: 6px; }
.pdoc-media figure::before { position: absolute; top: 6px; left: 6px; padding: 0 6px; border-radius: 999px; background: rgba(255,255,255,0.9); font-size: 10.5px; font-weight: 700; color: #334155; }
.pdoc-media figure[data-kind="art"]::before { content: "작품"; }
.pdoc-media figure[data-kind="activity"]::before { content: "활동"; }
.pdoc-media figcaption { font-size: 11.5px; color: #64748B; margin-top: 3px; }
.pdoc-media figcaption small { display: block; }
.pdoc-content { font-size: 13.5px; white-space: pre-line; }
.pdoc-reflection { margin-top: 10px; padding: 10px 14px; border-left: 3px solid var(--pdoc-accent); background: #F8FAFC; font-size: 13px; }
.pdoc-reflection strong { display: block; font-size: 12px; color: var(--pdoc-accent); }
.pdoc-reflection p { white-space: pre-line; }
.pdoc-files { margin-top: 8px; font-size: 12px; color: #64748B; }
@media print {
  .pdoc { background: #FFFFFF; padding: 0; border-radius: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .pdoc-sheet { box-shadow: none; max-width: none; margin: 0; padding: 0; border-radius: 0; }
  .pdoc-cover { border-top: 0; break-after: page; page-break-after: always; }
}
`;
}
