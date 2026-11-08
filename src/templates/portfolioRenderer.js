import { DESIGN_TEMPLATES } from '../data/sampleData.js';

export function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getPortfolioTemplatesCss() {
  return `
/* =========================================================
   Student Portfolio 9 Templates (incl. 3 Magazine Books)
   ========================================================= */
.pf-root {
  font-family: 'Pretendard', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  line-height: 1.65;
  word-break: keep-all;
  box-sizing: border-box;
  width: 100%;
}
.pf-root *, .pf-root *::before, .pf-root *::after {
  box-sizing: border-box;
}

.pf-filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.pf-filter-btn {
  border: 1px solid rgba(0,0,0,0.14);
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s ease;
}
.pf-filter-btn:hover {
  transform: translateY(-1px);
}

.pf-img-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
  margin: 14px 0;
}
.pf-img-card {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(0,0,0,0.12);
  background: rgba(255,255,255,0.85);
}
.pf-img-card.activity-photo-card {
  border: 2px solid rgba(16, 185, 129, 0.45);
  background: #F0FDF4;
}
.pf-img-tag-bar {
  padding: 5px 10px;
  font-size: 11.5px;
  font-weight: 800;
  color: #FFFFFF;
  display: flex;
  justify-content: space-between;
}
.pf-img-card img {
  width: 100%;
  max-height: 260px;
  object-fit: cover;
  display: block;
  cursor: zoom-in;
}
.pf-img-caption {
  padding: 7px 10px;
  font-size: 12px;
  color: #334155;
  text-align: center;
  font-weight: 600;
}
.pf-att-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.pf-att-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  border: 1px solid rgba(0,0,0,0.14);
  background: rgba(255,255,255,0.8);
  color: inherit;
}

/* ---------------------------------------------------------
   NEW Magazine Book 1 (시안 7): 포토 에세이 라이프 매거진
   --------------------------------------------------------- */
.pf-tpl-mag-life {
  background: #F6F5F0;
  color: #262A24;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #D8D4C8;
  padding: 36px;
}
.pf-tpl-mag-life .pf-mag-cover {
  text-align: center;
  border-bottom: 1px solid #BDB8A8;
  padding-bottom: 28px;
  margin-bottom: 32px;
}
.pf-tpl-mag-life .pf-mag-spread {
  background: #FFFFFF;
  border: 1px solid #E2DFD5;
  border-radius: 16px;
  padding: 28px;
  margin-bottom: 28px;
  box-shadow: 0 6px 20px rgba(38, 42, 36, 0.04);
}

/* ---------------------------------------------------------
   NEW Magazine Book 2 (시안 8): 팝 컬처 & 아트진 매거진
   --------------------------------------------------------- */
.pf-tpl-mag-zine {
  background: #FCFBF7;
  color: #111111;
  border-radius: 16px;
  overflow: hidden;
  border: 2px solid #111111;
  padding: 32px;
}
.pf-tpl-mag-zine .pf-zine-box {
  border: 2px solid #111111;
  box-shadow: 4px 4px 0px #111111;
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 26px;
}

/* ---------------------------------------------------------
   NEW Magazine Book 3 (시안 9): 클래식 북저널 & 무크지
   --------------------------------------------------------- */
.pf-tpl-mag-book {
  background: #F7F3E8;
  color: #231F20;
  border-radius: 16px;
  overflow: hidden;
  border: 2px solid #C8B9A6;
  padding: 36px;
}
.pf-tpl-mag-book .pf-book-spread {
  background: linear-gradient(90deg, #F7F3E8 0%, #EFE9D8 48.5%, #D5C8B0 50%, #EFE9D8 51.5%, #F7F3E8 100%);
  border: 2px solid #C8B9A6;
  border-radius: 14px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin-bottom: 28px;
  box-shadow: 0 10px 24px rgba(35, 31, 32, 0.07);
}
.pf-tpl-mag-book .pf-book-page-left {
  padding: 28px;
  border-right: 1px solid #C8B9A6;
}
.pf-tpl-mag-book .pf-book-page-right {
  padding: 28px;
}

/* Original 6 Templates */
.pf-tpl-editorial {
  background: #FAF7F2;
  color: #1C1917;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #D6CFC5;
}
.pf-tpl-editorial .pf-masthead {
  padding: 36px 36px 28px;
  border-bottom: 3px double #1C1917;
}
.pf-tpl-editorial .pf-body { padding: 32px 36px; }
.pf-tpl-editorial .pf-lead-grid {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 28px;
  padding-bottom: 28px;
  border-bottom: 1px solid #D6CFC5;
  margin-bottom: 28px;
}
.pf-tpl-editorial .pf-author-box {
  background: #F2ECE1;
  border: 1px solid #D6CFC5;
  border-radius: 12px;
  padding: 22px;
  align-self: start;
}
.pf-tpl-editorial .pf-article-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 28px;
}
.pf-tpl-editorial .pf-article-card {
  border-bottom: 1px solid #D6CFC5;
  padding-bottom: 24px;
}
.pf-tpl-editorial .pf-reflection {
  margin-top: 14px;
  padding: 12px 16px;
  border-left: 4px solid #C85A32;
  background: #F2ECE1;
  border-radius: 0 8px 8px 0;
  font-size: 13.5px;
}

.pf-tpl-gallery {
  background: #F8FAFC;
  color: #0F172A;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #E2E8F0;
}
.pf-tpl-gallery .pf-header {
  background: #FFFFFF;
  padding: 40px 32px 28px;
  text-align: center;
  border-bottom: 1px solid #E2E8F0;
}
.pf-tpl-gallery .pf-grid {
  padding: 32px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}
.pf-tpl-gallery .pf-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 14px;
  overflow: hidden;
  padding: 20px;
}

.pf-tpl-timeline {
  background: #F4F1EA;
  color: #1B2A4A;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #CBD5E1;
}
.pf-tpl-timeline .pf-header {
  background: #1B2A4A;
  color: #FFFFFF;
  padding: 36px;
}
.pf-tpl-timeline .pf-track {
  margin: 32px 36px;
  padding-left: 28px;
  border-left: 4px solid #D97706;
  display: flex;
  flex-direction: column;
  gap: 26px;
}
.pf-tpl-timeline .pf-node {
  position: relative;
  background: #FFFFFF;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #E2E8F0;
}

.pf-tpl-academic {
  background: #FFFFFF;
  color: #0F172A;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #CBD5E1;
}
.pf-tpl-academic .pf-header {
  background: #1E3A5F;
  color: #FFFFFF;
  padding: 32px 36px;
}
.pf-tpl-academic .pf-section-list {
  padding: 28px 36px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.pf-tpl-scrapbook {
  background-color: #FFFDF7;
  background-image: radial-gradient(#D7CCC8 1.25px, transparent 1.25px);
  background-size: 20px 20px;
  color: #3E2723;
  border-radius: 16px;
  overflow: hidden;
  border: 2px solid #E6DEC8;
  padding: 36px;
}
.pf-tpl-scrapbook .pf-scrap-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 28px;
}

.pf-tpl-showcase {
  background: #18181B;
  color: #F4F4F5;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #3F3F46;
}

@media (max-width: 768px) {
  .pf-tpl-editorial .pf-lead-grid,
  .pf-tpl-editorial .pf-article-grid,
  .pf-tpl-scrapbook .pf-scrap-grid,
  .pf-tpl-mag-book .pf-book-spread {
    grid-template-columns: 1fr !important;
  }
}
.is-mobile-preview .pf-lead-grid,
.is-mobile-preview .pf-article-grid,
.is-mobile-preview .pf-scrap-grid,
.is-mobile-preview .pf-grid,
.is-mobile-preview .pf-book-spread {
  grid-template-columns: 1fr !important;
}

/* Print Layout */
.pf-print-wrapper {
  background: #E2E8F0;
  padding: 24px;
  border-radius: 12px;
}
.pf-a4-page {
  background: #FFFFFF;
  color: #0F172A;
  max-width: 794px;
  margin: 0 auto 24px;
  padding: 44px 48px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12);
  border: 1px solid #CBD5E1;
  border-radius: 6px;
}
.pf-print-work-item {
  break-inside: avoid;
  page-break-inside: avoid;
  border: 1px solid #CBD5E1;
  border-radius: 10px;
  padding: 18px;
  margin-bottom: 18px;
  background: #FFFFFF;
}
@media print {
  body * { visibility: hidden; }
  #printable-portfolio-area, #printable-portfolio-area * { visibility: visible; }
  #printable-portfolio-area {
    position: absolute; left: 0; top: 0; width: 100%;
    background: #FFFFFF !important; padding: 0 !important;
  }
  .pf-a4-page { box-shadow: none !important; border: none !important; margin: 0 !important; padding: 12mm 14mm !important; max-width: 100% !important; }
}
`;
}

function renderEntryCategoryBadge(work, accentColor = '#1E3A5F') {
  if (work.entryType === 'project') {
    return `
      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="background:${accentColor};color:#FFFFFF;padding:3px 10px;border-radius:6px;font-size:12px;font-weight:800;">
          🚀 프로젝트 · ${escapeHtml(work.projectName || '융합 프로젝트')}
        </span>
        ${
          work.linkedSubjects
            ? `<span style="background:rgba(0,0,0,0.07);padding:3px 9px;border-radius:6px;font-size:12px;font-weight:700;">${escapeHtml(work.linkedSubjects)}</span>`
            : ''
        }
        ${
          work.projectRole
            ? `<span style="font-size:12px;opacity:0.8;">역할: <strong>${escapeHtml(work.projectRole)}</strong></span>`
            : ''
        }
        <span style="font-size:12px;opacity:0.75;">(${escapeHtml(work.semester)} ${escapeHtml(work.month)})</span>
      </div>
    `;
  }
  return `
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:8px;">
      <span style="background:${accentColor};color:#FFFFFF;padding:3px 10px;border-radius:6px;font-size:12px;font-weight:800;">
        📚 ${escapeHtml(work.subject)} 교과
      </span>
      <span style="font-size:12px;opacity:0.75;">${escapeHtml(work.semester)} · ${escapeHtml(work.month)} · ${escapeHtml(work.activityType)}</span>
    </div>
  `;
}

function renderWorkMediaHtml(work, options = {}) {
  const { assetMap = null } = options;
  const activityPhotos = Array.isArray(work.activityPhotos) ? work.activityPhotos : [];
  const images = Array.isArray(work.images) ? work.images : [];
  const attachments = Array.isArray(work.attachments) ? work.attachments : [];

  const activityPhotosHtml = activityPhotos.length
    ? activityPhotos
        .map((ap) => {
          const src =
            assetMap && assetMap.activityPhotos && assetMap.activityPhotos[ap.id]
              ? assetMap.activityPhotos[ap.id]
              : ap.dataUrl;
          const caption = escapeHtml(ap.caption || ap.name || '');
          return `
            <figure class="pf-img-card activity-photo-card" style="margin:0;">
              <div class="pf-img-tag-bar" style="background:#047857;">
                <span>📸 학생 활동 사진 (현장 스냅)</span>
                <span>${escapeHtml(work.semester)} ${escapeHtml(work.month)}</span>
              </div>
              <img src="${src}" alt="${caption}" data-lightbox-src="${src}" data-lightbox-caption="${caption}" />
              ${caption ? `<figcaption class="pf-img-caption">${caption}</figcaption>` : ''}
            </figure>
          `;
        })
        .join('')
    : '';

  const resultImagesHtml = images.length
    ? images
        .map((img) => {
          const src = assetMap && assetMap.images && assetMap.images[img.id] ? assetMap.images[img.id] : img.dataUrl;
          const caption = escapeHtml(img.caption || img.name || '');
          return `
            <figure class="pf-img-card" style="margin:0;">
              <div class="pf-img-tag-bar" style="background:#334155;">
                <span>🎨 완성 작품 · 결과물 자료</span>
                <span>${escapeHtml(work.subject)}</span>
              </div>
              <img src="${src}" alt="${caption}" data-lightbox-src="${src}" data-lightbox-caption="${caption}" />
              ${caption ? `<figcaption class="pf-img-caption">${caption}</figcaption>` : ''}
            </figure>
          `;
        })
        .join('')
    : '';

  const combinedMediaGrid =
    activityPhotosHtml || resultImagesHtml
      ? `<div class="pf-img-grid">${activityPhotosHtml}${resultImagesHtml}</div>`
      : '';

  const attachmentsHtml = attachments.length
    ? `<div class="pf-att-list">
        ${attachments
          .map((att) => {
            const href =
              assetMap && assetMap.attachments && assetMap.attachments[att.id]
                ? assetMap.attachments[att.id]
                : att.dataUrl || '#';
            const dlAttr = escapeHtml(att.name || 'attachment');
            return `
              <a class="pf-att-chip" href="${href}" download="${dlAttr}">
                <span>📎</span>
                <span>${escapeHtml(att.name)}</span>
                ${att.size ? `<span style="opacity:0.65;font-weight:400;">(${escapeHtml(att.size)})</span>` : ''}
              </a>
            `;
          })
          .join('')}
      </div>`
    : '';

  return { activityPhotosHtml, resultImagesHtml, imagesHtml: combinedMediaGrid, attachmentsHtml };
}

function renderFilterPillsHtml(works, activeFilter, accentColor, bgColor = '#FFFFFF') {
  const subjects = [...new Set(works.map((w) => w.subject).filter(Boolean))];
  const filters = ['전체', '🚀 프로젝트 모음', '📚 교과별 모음', '📸 활동사진첩', ...subjects];
  return `
    <div class="pf-filter-bar" role="tablist" aria-label="포트폴리오 분류 필터">
      ${filters
        .map((f) => {
          const isActive = f === activeFilter;
          const style = isActive
            ? `background:${accentColor};color:#FFFFFF;border-color:${accentColor};`
            : `background:${bgColor};color:#334155;`;
          return `<button type="button" class="pf-filter-btn" data-pf-subject="${escapeHtml(f)}" style="${style}">${escapeHtml(f)}</button>`;
        })
        .join('')}
    </div>
  `;
}

export function renderPortfolioHtml(state, options = {}) {
  const {
    activeSubject = '전체',
    isMobile = false,
    showcaseSlideIdx = 0,
    assetMap = null
  } = options;

  const tplId = state.selectedTemplate || 'mag-life';
  const tplMeta = DESIGN_TEMPLATES.find((t) => t.id === tplId) || DESIGN_TEMPLATES[0];
  const profile = state.profile || {};
  const allWorks = Array.isArray(state.works) ? state.works : [];

  let filteredWorks = allWorks;
  if (activeSubject === '🚀 프로젝트 모음') {
    filteredWorks = allWorks.filter((w) => w.entryType === 'project');
  } else if (activeSubject === '📚 교과별 모음') {
    filteredWorks = allWorks.filter((w) => w.entryType !== 'project');
  } else if (activeSubject !== '전체' && activeSubject !== '📸 활동사진첩') {
    filteredWorks = allWorks.filter(
      (w) => w.subject === activeSubject || w.projectName === activeSubject
    );
  }

  const mobileClass = isMobile ? 'is-mobile-preview' : '';

  if (allWorks.length === 0) {
    return `
      <div class="pf-root" style="padding:48px 24px;text-align:center;background:#FFFFFF;border-radius:16px;border:1px dashed #CBD5E1;color:#475569;">
        <div style="font-size:36px;margin-bottom:12px;">📒</div>
        <h3 style="margin:0 0 8px;font-size:18px;color:#0F172A;">아직 등록된 교과·프로젝트 결과물이 없습니다</h3>
        <p style="margin:0;font-size:14px;">좌측 [교과·프로젝트·활동사진] 탭에서 첫 기록을 등록해 보세요!</p>
      </div>
    `;
  }

  // Dedicated Activity Photo Album View ('📸 활동사진첩')
  if (activeSubject === '📸 활동사진첩') {
    const allActivityPhotos = [];
    allWorks.forEach((w) => {
      (w.activityPhotos || []).forEach((ap) => {
        const src =
          assetMap && assetMap.activityPhotos && assetMap.activityPhotos[ap.id]
            ? assetMap.activityPhotos[ap.id]
            : ap.dataUrl;
        allActivityPhotos.push({
          src,
          caption: ap.caption || ap.name,
          badge: w.entryType === 'project' ? `🚀 ${w.projectName}` : `📚 ${w.subject}`,
          period: `${w.semester} ${w.month}`,
          workTitle: w.title
        });
      });
    });

    return `
      <div class="pf-root" style="background:${tplMeta.colors.bg};color:${tplMeta.colors.text};border-radius:16px;padding:32px;border:1px solid ${tplMeta.colors.border};">
        <header style="border-bottom:2px solid ${tplMeta.colors.accent};padding-bottom:20px;margin-bottom:24px;">
          <div style="font-size:12px;font-weight:800;color:${tplMeta.colors.accent};letter-spacing:0.08em;">STUDENT ACTIVITY PHOTO ARCHIVE · 1년 활동 사진첩</div>
          <h1 style="font-size:28px;font-weight:800;margin:6px 0;">📸 ${escapeHtml(profile.studentName)}의 교실 & 프로젝트 활동 사진첩</h1>
          <p style="font-size:13.5px;opacity:0.8;margin:0 0 16px;">수업 시간과 융합 프로젝트 현장에서 직접 탐구하고 발표하며 기록한 생생한 활동 스냅 사진 모음입니다.</p>
          ${renderFilterPillsHtml(allWorks, activeSubject, tplMeta.colors.accent, '#FFFFFF')}
        </header>
        <div class="pf-img-grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;">
          ${
            allActivityPhotos.length === 0
              ? `<p style="font-size:14px;">등록된 활동 사진이 없습니다. 편집창의 [📸 학생 활동 사진 올리기]에서 사진을 추가해 보세요!</p>`
              : allActivityPhotos
                  .map(
                    (ph, idx) => `
                <div style="background:#FFFFFF;color:#0F172A;border-radius:14px;overflow:hidden;border:1px solid #CBD5E1;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
                  <img src="${ph.src}" alt="${escapeHtml(ph.caption)}" data-lightbox-src="${ph.src}" data-lightbox-caption="${escapeHtml(ph.caption)}" style="width:100%;height:210px;object-fit:cover;cursor:zoom-in;display:block;" />
                  <div style="padding:16px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px;margin-bottom:6px;">
                      <span style="background:${tplMeta.colors.accent};color:#FFF;padding:2px 8px;border-radius:4px;font-weight:700;">SNAP #0${idx + 1} · ${escapeHtml(ph.badge)}</span>
                      <span style="color:#64748B;">${escapeHtml(ph.period)}</span>
                    </div>
                    <div style="font-size:14.5px;font-weight:800;margin-bottom:4px;">${escapeHtml(ph.caption)}</div>
                    <div style="font-size:12px;color:#64748B;">연계 활동: ${escapeHtml(ph.workTitle)}</div>
                  </div>
                </div>
              `
                  )
                  .join('')
          }
        </div>
      </div>
    `;
  }

  // =========================================================
  // NEW MAGAZINE BOOK 1 (시안 7): 포토 에세이 라이프 매거진
  // =========================================================
  if (tplId === 'mag-life') {
    return `
      <div class="pf-root pf-tpl-mag-life ${mobileClass}">
        <header class="pf-mag-cover">
          <div style="font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#4A5D4E;font-weight:800;">
            KINFOLK & STUDENT PHOTO-ESSAY MAGAZINE · ${escapeHtml(profile.academicYear)}
          </div>
          <h1 style="font-family:'Nanum Myeongjo',Georgia,serif;font-size:clamp(26px,4vw,42px);font-weight:800;margin:12px 0 8px;">
            ${escapeHtml(profile.portfolioTitle)}
          </h1>
          <p style="font-family:'Nanum Myeongjo',Georgia,serif;font-style:italic;color:#57534E;font-size:15px;margin:0 0 14px;">
            "${escapeHtml(profile.subtitle)}"
          </p>
          <div style="display:inline-block;padding:5px 16px;border-radius:999px;background:#E6E4DC;font-size:12.5px;font-weight:700;margin-bottom:12px;">
            EDITOR · ${escapeHtml(profile.schoolName)} ${escapeHtml(profile.gradeClass)} ${escapeHtml(profile.studentName)}
          </div>
          <p style="max-width:700px;margin:0 auto 18px;font-size:13.5px;color:#44403C;">${escapeHtml(profile.introText)}</p>
          <div style="display:flex;justify-content:center;">
            ${renderFilterPillsHtml(allWorks, activeSubject, '#4A5D4E', '#FFFFFF')}
          </div>
        </header>

        <div>
          ${filteredWorks
            .map((w, idx) => {
              const media = renderWorkMediaHtml(w, { assetMap });
              return `
                <article class="pf-mag-spread pf-work-card" data-work-id="${escapeHtml(w.id)}">
                  <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;border-bottom:1px solid #E2DFD5;padding-bottom:10px;margin-bottom:14px;">
                    ${renderEntryCategoryBadge(w, '#4A5D4E')}
                    <span style="font-family:'Nanum Myeongjo',Georgia,serif;font-style:italic;font-size:12.5px;color:#78716C;">PHOTO ESSAY ISSUE #0${idx + 1}</span>
                  </div>
                  <h2 style="font-family:'Nanum Myeongjo',Georgia,serif;font-size:23px;font-weight:800;margin:0 0 14px;">${escapeHtml(w.title)}</h2>
                  ${media.imagesHtml}
                  <div style="display:grid;grid-template-columns:${isMobile ? '1fr' : '2fr 1fr'};gap:20px;margin-top:16px;align-items:start;">
                    <p style="font-size:14px;color:#334155;margin:0;white-space:pre-line;">${escapeHtml(w.content)}</p>
                    <div style="background:#F6F5F0;border-left:4px solid #4A5D4E;padding:14px;border-radius:0 10px 10px 0;font-size:13px;">
                      <strong style="color:#4A5D4E;display:block;margin-bottom:4px;">EDITOR'S REFLECTION · 성찰</strong>
                      "${escapeHtml(w.reflection)}"
                      ${media.attachmentsHtml}
                    </div>
                  </div>
                </article>
              `;
            })
            .join('')}
        </div>
      </div>
    `;
  }

  // =========================================================
  // NEW MAGAZINE BOOK 2 (시안 8): 팝 컬처 & 아트진 매거진
  // =========================================================
  if (tplId === 'mag-zine') {
    return `
      <div class="pf-root pf-tpl-mag-zine ${mobileClass}">
        <header class="pf-zine-box" style="background:#FACC15;padding:26px;">
          <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;border-bottom:2px solid #111111;padding-bottom:10px;margin-bottom:14px;font-size:12px;font-weight:900;">
            <span style="background:#111111;color:#FFFFFF;padding:3px 10px;border-radius:4px;">YOUTH ART-ZINE & PROJECT ISSUE</span>
            <span>${escapeHtml(profile.academicYear)} · ${escapeHtml(profile.schoolName)} ${escapeHtml(profile.gradeClass)} ${escapeHtml(profile.studentName)}</span>
          </div>
          <h1 style="font-size:clamp(26px,3.8vw,40px);font-weight:900;margin:0 0 8px;letter-spacing:-0.02em;">${escapeHtml(profile.portfolioTitle)}</h1>
          <p style="font-size:13.5px;font-weight:700;margin:0 0 16px;">${escapeHtml(profile.introText)}</p>
          <div style="padding-top:12px;border-top:2px solid #111111;">
            ${renderFilterPillsHtml(allWorks, activeSubject, '#EA580C', '#FFFFFF')}
          </div>
        </header>

        <div>
          ${filteredWorks
            .map((w, idx) => {
              const media = renderWorkMediaHtml(w, { assetMap });
              const isProj = w.entryType === 'project';
              return `
                <article class="pf-zine-box pf-work-card" style="background:${isProj ? '#FFF7ED' : '#FFFFFF'};" data-work-id="${escapeHtml(w.id)}">
                  <div style="background:${isProj ? '#EA580C' : '#111111'};color:#FFFFFF;padding:12px 20px;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;font-size:12.5px;font-weight:900;">
                    <span>${isProj ? `★ SPECIAL PROJECT FEATURE · ${escapeHtml(w.projectName)}` : `SUBJECT ZINE COLUMN #0${idx + 1} · ${escapeHtml(w.subject)}`}</span>
                    <span>${escapeHtml(w.semester)} ${escapeHtml(w.month)} ${w.linkedSubjects ? `| ${escapeHtml(w.linkedSubjects)}` : ''}</span>
                  </div>
                  <div style="padding:22px;">
                    <h3 style="font-size:21px;font-weight:900;margin:0 0 8px;">${escapeHtml(w.title)}</h3>
                    ${
                      w.projectRole
                        ? `<div style="display:inline-block;padding:3px 10px;background:#FACC15;border:1.5px solid #111;border-radius:6px;font-size:12px;font-weight:800;margin-bottom:10px;">나의 역할: ${escapeHtml(w.projectRole)}</div>`
                        : ''
                    }
                    ${media.imagesHtml}
                    <p style="font-size:14px;margin:12px 0;white-space:pre-line;">${escapeHtml(w.content)}</p>
                    <div style="padding:14px;background:rgba(250,204,21,0.35);border:2px solid #111111;border-radius:10px;font-size:13px;font-weight:700;">
                      📌 ZINE NOTE (배운 점 & 성찰): ${escapeHtml(w.reflection)}
                    </div>
                    ${media.attachmentsHtml}
                  </div>
                </article>
              `;
            })
            .join('')}
        </div>
      </div>
    `;
  }

  // =========================================================
  // NEW MAGAZINE BOOK 3 (시안 9): 클래식 북저널 & 무크지
  // =========================================================
  if (tplId === 'mag-book') {
    return `
      <div class="pf-root pf-tpl-mag-book ${mobileClass}">
        <header style="text-align:center;border-bottom:2px solid #6B1D2F;padding-bottom:22px;margin-bottom:28px;">
          <div style="font-family:'Nanum Myeongjo',Georgia,serif;font-size:12px;font-weight:800;letter-spacing:0.15em;color:#6B1D2F;">
            LITERARY MOOOK & TWO-PAGE BOOK JOURNAL · ${escapeHtml(profile.academicYear)}
          </div>
          <h1 style="font-family:'Nanum Myeongjo',Georgia,serif;font-size:clamp(26px,3.8vw,38px);font-weight:800;margin:10px 0 6px;">
            ${escapeHtml(profile.portfolioTitle)}
          </h1>
          <p style="font-family:'Nanum Myeongjo',Georgia,serif;font-style:italic;font-size:14px;color:#57534E;margin:0 0 16px;">
            ${escapeHtml(profile.subtitle)} — ${escapeHtml(profile.schoolName)} ${escapeHtml(profile.gradeClass)} ${escapeHtml(profile.studentName)}
          </p>
          <div style="display:flex;justify-content:center;">
            ${renderFilterPillsHtml(allWorks, activeSubject, '#6B1D2F', '#EFE9D8')}
          </div>
        </header>

        <div>
          ${filteredWorks
            .map((w, idx) => {
              const media = renderWorkMediaHtml(w, { assetMap });
              const firstChar = (w.content || '배').charAt(0);
              const restText = (w.content || '').slice(1);
              return `
                <article class="pf-book-spread pf-work-card" data-work-id="${escapeHtml(w.id)}">
                  <div class="pf-book-page-left">
                    <div style="display:flex;justify-content:space-between;border-bottom:1px solid #C8B9A6;padding-bottom:6px;margin-bottom:12px;font-family:'Nanum Myeongjo',serif;font-size:12px;font-weight:800;color:#6B1D2F;">
                      <span>${w.entryType === 'project' ? `PROJECT CHAPTER · ${escapeHtml(w.projectName)}` : `SUBJECT CHAPTER · ${escapeHtml(w.subject)}`}</span>
                      <span>p. ${idx * 2 + 2}</span>
                    </div>
                    ${renderEntryCategoryBadge(w, '#6B1D2F')}
                    <h3 style="font-family:'Nanum Myeongjo',Georgia,serif;font-size:21px;font-weight:800;margin:8px 0 14px;">${escapeHtml(w.title)}</h3>
                    <p style="font-size:14px;line-height:1.75;white-space:pre-line;">
                      <span style="float:left;font-family:'Nanum Myeongjo',Georgia,serif;font-size:38px;font-weight:800;color:#6B1D2F;line-height:1;margin-right:8px;">${escapeHtml(firstChar)}</span>${escapeHtml(restText)}
                    </p>
                    <div style="margin-top:18px;padding:12px 16px;background:rgba(107,29,47,0.08);border-left:4px solid #6B1D2F;border-radius:0 8px 8px 0;font-size:13px;">
                      <strong style="color:#6B1D2F;display:block;margin-bottom:4px;">성찰의 책갈피:</strong>
                      "${escapeHtml(w.reflection)}"
                    </div>
                  </div>
                  <div class="pf-book-page-right">
                    <div style="display:flex;justify-content:space-between;border-bottom:1px solid #C8B9A6;padding-bottom:6px;margin-bottom:12px;font-family:'Nanum Myeongjo',serif;font-size:12px;font-weight:800;color:#8C6D46;">
                      <span>PHOTOGRAPHIC PLATES · 활동 사진 및 작품 도판</span>
                      <span>p. ${idx * 2 + 3}</span>
                    </div>
                    ${media.imagesHtml || `<div style="padding:32px;text-align:center;border:1px dashed #C8B9A6;border-radius:10px;color:#78716C;font-size:13px;">수록된 사진 도판이 없습니다.</div>`}
                    ${media.attachmentsHtml}
                  </div>
                </article>
              `;
            })
            .join('')}
        </div>
      </div>
    `;
  }

  // 1. EDITORIAL MAGAZINE
  if (tplId === 'editorial') {
    const leadWork = filteredWorks[0] || allWorks[0];
    const restWorks = filteredWorks.slice(1);
    const leadMedia = renderWorkMediaHtml(leadWork, { assetMap });

    return `
      <div class="pf-root pf-tpl-editorial ${mobileClass}">
        <header class="pf-masthead">
          <div style="display:flex;flex-wrap:wrap;justify-content:space-between;font-size:12px;color:#57534E;border-bottom:1px solid #D6CFC5;padding-bottom:10px;">
            <span>STUDENT ANNUAL PORTFOLIO EDITION</span>
            <span>${escapeHtml(profile.academicYear)}</span>
            <span>${escapeHtml(profile.schoolName)} ${escapeHtml(profile.gradeClass)} · ${escapeHtml(profile.studentName)}</span>
          </div>
          <h1 style="font-family:'Nanum Myeongjo',Georgia,serif;font-size:clamp(26px,4vw,42px);font-weight:800;margin:16px 0 8px;">${escapeHtml(profile.portfolioTitle)}</h1>
          <p style="font-family:'Nanum Myeongjo',Georgia,serif;font-style:italic;color:#57534E;margin:0 0 16px;">"${escapeHtml(profile.subtitle)}"</p>
          ${renderFilterPillsHtml(allWorks, activeSubject, '#C85A32', '#F2ECE1')}
        </header>

        <div class="pf-body">
          <div class="pf-lead-grid">
            <aside class="pf-author-box">
              <div style="font-size:11px;font-weight:800;color:#C85A32;margin-bottom:6px;">PROLOGUE · 작가 소개</div>
              <div style="font-size:17px;font-weight:800;margin-bottom:6px;">${escapeHtml(profile.studentName)}</div>
              <div style="font-size:12.5px;color:#57534E;margin-bottom:12px;">${escapeHtml(profile.schoolName)} ${escapeHtml(profile.gradeClass)}</div>
              <p style="font-size:13.5px;margin:0;white-space:pre-line;">${escapeHtml(profile.introText)}</p>
            </aside>

            <article class="pf-work-card" data-work-id="${escapeHtml(leadWork.id)}">
              ${renderEntryCategoryBadge(leadWork, '#C85A32')}
              <h2 style="font-family:'Nanum Myeongjo',Georgia,serif;font-size:24px;font-weight:800;margin:0 0 12px;">${escapeHtml(leadWork.title)}</h2>
              ${leadMedia.imagesHtml}
              <p style="font-size:14.5px;margin:10px 0;white-space:pre-line;">${escapeHtml(leadWork.content)}</p>
              ${leadWork.reflection ? `<div class="pf-reflection"><strong>성찰 노트:</strong> ${escapeHtml(leadWork.reflection)}</div>` : ''}
              ${leadMedia.attachmentsHtml}
            </article>
          </div>

          <div class="pf-article-grid">
            ${restWorks
              .map((w) => {
                const media = renderWorkMediaHtml(w, { assetMap });
                return `
                  <article class="pf-article-card pf-work-card" data-work-id="${escapeHtml(w.id)}">
                    ${renderEntryCategoryBadge(w, '#C85A32')}
                    <h3 style="font-family:'Nanum Myeongjo',Georgia,serif;font-size:19px;font-weight:800;margin:0 0 10px;">${escapeHtml(w.title)}</h3>
                    ${media.imagesHtml}
                    <p style="font-size:13.5px;margin:8px 0;white-space:pre-line;">${escapeHtml(w.content)}</p>
                    ${w.reflection ? `<div class="pf-reflection"><strong>배움과 성찰:</strong> ${escapeHtml(w.reflection)}</div>` : ''}
                    ${media.attachmentsHtml}
                  </article>
                `;
              })
              .join('')}
          </div>
        </div>
      </div>
    `;
  }

  // 2. NORDIC GALLERY
  if (tplId === 'gallery') {
    return `
      <div class="pf-root pf-tpl-gallery ${mobileClass}">
        <header class="pf-header">
          <span style="display:inline-block;padding:4px 12px;border-radius:999px;background:rgba(61,107,88,0.12);color:#3D6B58;font-size:11.5px;font-weight:700;">
            EXHIBITION CATALOGUE · ${escapeHtml(profile.academicYear)}
          </span>
          <h1 style="font-size:32px;font-weight:300;margin:10px 0;">${escapeHtml(profile.portfolioTitle)}</h1>
          <p style="font-size:13.5px;color:#475569;max-width:680px;margin:0 auto 16px;">${escapeHtml(profile.introText)}</p>
          <div style="display:flex;justify-content:center;">
            ${renderFilterPillsHtml(allWorks, activeSubject, '#3D6B58', '#F1F5F9')}
          </div>
        </header>
        <div class="pf-grid">
          ${filteredWorks
            .map((w) => {
              const media = renderWorkMediaHtml(w, { assetMap });
              return `
                <article class="pf-card pf-work-card" data-work-id="${escapeHtml(w.id)}">
                  ${renderEntryCategoryBadge(w, '#3D6B58')}
                  <h3 style="font-size:17px;font-weight:800;margin:0 0 10px;">${escapeHtml(w.title)}</h3>
                  ${media.imagesHtml}
                  <p style="font-size:13.5px;color:#334155;margin:10px 0;white-space:pre-line;">${escapeHtml(w.content)}</p>
                  <div style="padding:10px 12px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;font-size:12.5px;color:#14532D;">
                    <strong>작가 노트:</strong> ${escapeHtml(w.reflection)}
                  </div>
                  ${media.attachmentsHtml}
                </article>
              `;
            })
            .join('')}
        </div>
      </div>
    `;
  }

  // 3. CHRONICLE TIMELINE
  if (tplId === 'timeline') {
    return `
      <div class="pf-root pf-tpl-timeline ${mobileClass}">
        <header class="pf-header">
          <div style="font-size:12px;color:#FCD34D;font-weight:700;margin-bottom:6px;">365 DAYS GROWTH CHRONICLE · ${escapeHtml(profile.schoolName)} ${escapeHtml(profile.studentName)}</div>
          <h1 style="font-size:30px;font-weight:800;margin:0 0 8px;">${escapeHtml(profile.portfolioTitle)}</h1>
          <p style="font-size:13.5px;color:#E2E8F0;margin:0 0 16px;">${escapeHtml(profile.introText)}</p>
          ${renderFilterPillsHtml(allWorks, activeSubject, '#D97706', '#FFFFFF')}
        </header>
        <div class="pf-track">
          ${filteredWorks
            .map((w) => {
              const media = renderWorkMediaHtml(w, { assetMap });
              return `
                <article class="pf-node pf-work-card" data-work-id="${escapeHtml(w.id)}">
                  ${renderEntryCategoryBadge(w, '#1B2A4A')}
                  <h3 style="font-size:19px;font-weight:800;margin:0 0 10px;">${escapeHtml(w.title)}</h3>
                  ${media.imagesHtml}
                  <p style="font-size:14px;color:#334155;margin:10px 0;white-space:pre-line;">${escapeHtml(w.content)}</p>
                  <div style="padding:12px 16px;border-radius:10px;background:#FFFBEB;border:1px solid #FDE68A;font-size:13px;color:#78350F;">
                    <strong>🌱 성장 기록:</strong> ${escapeHtml(w.reflection)}
                  </div>
                  ${media.attachmentsHtml}
                </article>
              `;
            })
            .join('')}
        </div>
      </div>
    `;
  }

  // 4. ACADEMIC RESEARCH JOURNAL
  if (tplId === 'academic') {
    return `
      <div class="pf-root pf-tpl-academic ${mobileClass}">
        <header class="pf-header">
          <div style="font-size:12px;color:#93C5FD;margin-bottom:6px;">ACADEMIC PORTFOLIO & PROJECT ARCHIVE</div>
          <h1 style="font-size:28px;font-weight:800;margin:0 0 10px;">${escapeHtml(profile.portfolioTitle)}</h1>
          <div style="font-size:13px;color:#E0F2FE;margin-bottom:14px;">작성자: ${escapeHtml(profile.schoolName)} ${escapeHtml(profile.gradeClass)} ${escapeHtml(profile.studentName)}</div>
          ${renderFilterPillsHtml(allWorks, activeSubject, '#2563EB', '#FFFFFF')}
        </header>
        <div class="pf-section-list">
          ${filteredWorks
            .map((w, idx) => {
              const media = renderWorkMediaHtml(w, { assetMap });
              return `
                <section class="pf-work-card" style="border:1px solid #CBD5E1;border-radius:12px;overflow:hidden;" data-work-id="${escapeHtml(w.id)}">
                  <div style="background:#F1F5F9;padding:14px 20px;border-bottom:1px solid #CBD5E1;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;">
                    <h3 style="font-size:17px;font-weight:800;margin:0;">0${idx + 1}. ${escapeHtml(w.title)}</h3>
                    ${renderEntryCategoryBadge(w, '#1E3A5F')}
                  </div>
                  <div style="padding:20px;">
                    ${media.imagesHtml}
                    <div style="display:grid;grid-template-columns:${isMobile ? '1fr' : '1fr 1fr'};gap:16px;margin-top:12px;">
                      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px;">
                        <div style="font-size:12.5px;font-weight:800;color:#1E3A5F;margin-bottom:6px;">1. 탐구 및 프로젝트 내용</div>
                        <p style="font-size:13.5px;margin:0;white-space:pre-line;">${escapeHtml(w.content)}</p>
                      </div>
                      <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:14px;">
                        <div style="font-size:12.5px;font-weight:800;color:#1E40AF;margin-bottom:6px;">2. 결론 및 자기 성찰</div>
                        <p style="font-size:13.5px;margin:0;white-space:pre-line;">${escapeHtml(w.reflection)}</p>
                      </div>
                    </div>
                    ${media.attachmentsHtml}
                  </div>
                </section>
              `;
            })
            .join('')}
        </div>
      </div>
    `;
  }

  // 5. CREATIVE SCRAPBOOK
  if (tplId === 'scrapbook') {
    return `
      <div class="pf-root pf-tpl-scrapbook ${mobileClass}">
        <div style="max-width:760px;margin:0 auto 28px;background:#FFF;border:2px solid #E6DEC8;border-radius:18px;padding:24px;text-align:center;">
          <span style="font-size:12px;font-weight:800;color:#E06D53;">🎨 ${escapeHtml(profile.schoolName)} ${escapeHtml(profile.studentName)}의 아틀리에 스크랩북</span>
          <h1 style="font-size:28px;font-weight:800;margin:8px 0;">${escapeHtml(profile.portfolioTitle)}</h1>
          <p style="font-size:13.5px;color:#5D4037;margin:0 0 14px;">${escapeHtml(profile.introText)}</p>
          <div style="display:flex;justify-content:center;">
            ${renderFilterPillsHtml(allWorks, activeSubject, '#E06D53', '#F5EFE6')}
          </div>
        </div>
        <div class="pf-scrap-grid">
          ${filteredWorks
            .map((w) => {
              const media = renderWorkMediaHtml(w, { assetMap });
              return `
                <article style="background:#FFF;border:1px solid #E6DEC8;border-radius:16px;padding:22px;box-shadow:0 6px 16px rgba(0,0,0,0.05);" class="pf-work-card" data-work-id="${escapeHtml(w.id)}">
                  ${renderEntryCategoryBadge(w, '#E06D53')}
                  <h3 style="font-size:18px;font-weight:800;margin:0 0 10px;">${escapeHtml(w.title)}</h3>
                  ${media.imagesHtml}
                  <p style="font-size:13.5px;margin:10px 0;white-space:pre-line;">${escapeHtml(w.content)}</p>
                  <div style="padding:12px;background:#FFF9DB;border:1px solid #FDE047;border-radius:10px;font-size:13px;">
                    <strong>📌 나의 한 줄 일기 & 성찰:</strong> ${escapeHtml(w.reflection)}
                  </div>
                  ${media.attachmentsHtml}
                </article>
              `;
            })
            .join('')}
        </div>
      </div>
    `;
  }

  // 6. SHOWCASE DECK
  const safeSlideIdx = showcaseSlideIdx >= filteredWorks.length ? 0 : showcaseSlideIdx;
  const currentSlide = filteredWorks[safeSlideIdx] || filteredWorks[0];
  const slideMedia = renderWorkMediaHtml(currentSlide, { assetMap });

  return `
    <div class="pf-root pf-tpl-showcase ${mobileClass}" style="padding:28px;">
      <header style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;border-bottom:1px solid #3F3F46;padding-bottom:16px;margin-bottom:20px;">
        <div>
          <div style="font-size:11.5px;font-weight:800;color:#2DD4BF;">INTERACTIVE SHOWCASE DECK</div>
          <h1 style="font-size:22px;font-weight:800;margin:4px 0 0;">${escapeHtml(profile.portfolioTitle)}</h1>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <button type="button" class="pf-filter-btn" data-pf-slide-nav="prev" style="background:#27272A;color:#FFF;">← 이전</button>
          <span style="font-size:12.5px;font-weight:800;padding:5px 12px;border-radius:8px;background:rgba(20,184,166,0.2);color:#5EEAD4;">${safeSlideIdx + 1} / ${filteredWorks.length}</span>
          <button type="button" class="pf-filter-btn" data-pf-slide-nav="next" style="background:#14B8A6;color:#09090B;">다음 →</button>
        </div>
      </header>
      <div style="margin-bottom:16px;">
        ${renderFilterPillsHtml(allWorks, activeSubject, '#14B8A6', '#27272A')}
      </div>
      <article style="background:#27272A;border:1px solid #3F3F46;border-radius:16px;padding:24px;">
        ${renderEntryCategoryBadge(currentSlide, '#14B8A6')}
        <h2 style="font-size:22px;font-weight:800;margin:0 0 12px;color:#FFF;">${escapeHtml(currentSlide.title)}</h2>
        ${slideMedia.imagesHtml}
        <p style="font-size:14px;color:#E4E4E7;margin:12px 0;white-space:pre-line;">${escapeHtml(currentSlide.content)}</p>
        <div style="padding:12px 16px;border-radius:10px;background:#18181B;border:1px solid rgba(20,184,166,0.4);font-size:13px;color:#CCFBF1;">
          <strong style="color:#2DD4BF;">💡 배우고 성장한 점:</strong> ${escapeHtml(currentSlide.reflection)}
        </div>
        ${slideMedia.attachmentsHtml}
      </article>
    </div>
  `;
}

export function renderPrintDocumentHtml(state) {
  const tpl = DESIGN_TEMPLATES.find((t) => t.id === state.selectedTemplate) || DESIGN_TEMPLATES[0];
  const accent = tpl.colors.accent === '#14B8A6' ? '#0F766E' : tpl.colors.accent;
  const profile = state.profile || {};
  const works = Array.isArray(state.works) ? state.works : [];

  return `
    <div id="printable-portfolio-area" class="pf-root pf-print-wrapper">
      <div class="pf-a4-page">
        <div style="border-bottom:4px solid ${accent};padding-bottom:20px;margin-bottom:22px;">
          <div style="font-size:12px;font-weight:800;letter-spacing:0.08em;color:${accent};text-transform:uppercase;">
            STUDENT ANNUAL PORTFOLIO · ${escapeHtml(profile.academicYear || '2026학년도')}
          </div>
          <h1 style="font-size:30px;font-weight:800;margin:8px 0 6px;color:#0F172A;">
            ${escapeHtml(profile.portfolioTitle || '학생 포트폴리오')}
          </h1>
          ${profile.subtitle ? `<p style="font-size:14.5px;color:#475569;margin:0 0 14px;">${escapeHtml(profile.subtitle)}</p>` : ''}
          <div style="display:flex;flex-wrap:wrap;gap:20px;font-size:13px;color:#334155;">
            <span><strong>학교/학급:</strong> ${escapeHtml(profile.schoolName)} ${escapeHtml(profile.gradeClass)}</span>
            <span><strong>이름:</strong> ${escapeHtml(profile.studentName)}</span>
            <span><strong>적용 양식:</strong> ${escapeHtml(tpl.name)}</span>
          </div>
        </div>

        <div style="background:#F8FAFC;border:1px solid #CBD5E1;border-radius:10px;padding:16px;margin-bottom:22px;">
          <div style="font-size:12.5px;font-weight:800;color:${accent};margin-bottom:6px;">나의 소개 (Student Introduction)</div>
          <p style="font-size:13px;color:#1E293B;margin:0;white-space:pre-line;">${escapeHtml(profile.introText)}</p>
        </div>

        <div>
          <div style="font-size:12px;font-weight:800;color:${accent};text-transform:uppercase;margin-bottom:12px;">교과별 & 프로젝트별 결과물 및 활동 사진 상세 기록</div>
          ${works
            .map((w, idx) => {
              const media = renderWorkMediaHtml(w);
              const label =
                w.entryType === 'project'
                  ? `🚀 프로젝트 [${escapeHtml(w.projectName)}]`
                  : `📚 교과 [${escapeHtml(w.subject)}]`;
              return `
                <div class="pf-print-work-item">
                  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #E2E8F0;padding-bottom:8px;margin-bottom:10px;">
                    <div style="font-size:15px;font-weight:800;color:#0F172A;">
                      <span style="color:${accent};">0${idx + 1}. ${label}</span> ${escapeHtml(w.title)}
                    </div>
                    <span style="font-size:12px;color:#64748B;">${escapeHtml(w.semester)} ${escapeHtml(w.month)}</span>
                  </div>
                  ${media.imagesHtml}
                  <p style="font-size:13px;color:#1E293B;margin:8px 0;white-space:pre-line;">${escapeHtml(w.content)}</p>
                  ${
                    w.reflection
                      ? `<div style="background:#F8FAFC;border-left:3px solid ${accent};padding:8px 12px;font-size:12.5px;color:#334155;margin-top:8px;">
                          <strong>배우고 느낀 점:</strong> ${escapeHtml(w.reflection)}
                        </div>`
                      : ''
                  }
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    </div>
  `;
}
