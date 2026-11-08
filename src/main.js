import './style.css';
import { portfolioStore } from './state/store.js';
import { DESIGN_TEMPLATES } from './data/sampleData.js';
import {
  getPortfolioTemplatesCss,
  renderPortfolioHtml,
  renderPrintDocumentHtml,
  escapeHtml
} from './templates/portfolioRenderer.js';
import { generatePortfolioZip, exportProjectJsonFile } from './export/zipExporter.js';
import { triggerPdfPrint } from './export/pdfExporter.js';

let activeBuilderTab = 'works'; // 'profile' | 'works' | 'templates'
let editingWorkId = null;
let previewViewport = 'desktop'; // 'desktop' | 'mobile' | 'pdf'
let activeSubjectFilter = '전체';
let showcaseSlideIdx = 0;
let toastTimer = null;

function injectTemplateStyles() {
  const existing = document.getElementById('pf-template-styles');
  if (existing) existing.remove();
  const styleEl = document.createElement('style');
  styleEl.id = 'pf-template-styles';
  styleEl.textContent = getPortfolioTemplatesCss();
  document.head.appendChild(styleEl);
}

function showToast(message) {
  const toastEl = document.getElementById('studio-toast');
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 3000);
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function renderAppShell() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <header class="studio-header">
      <div class="brand-area">
        <div class="brand-logo">P</div>
        <div>
          <h1 class="brand-title">
            학생 1년 교과 & 프로젝트 포트폴리오 메이커
            <span class="save-badge" id="autosave-indicator">✓ 잡지책 3종 추가 · 총 9종 양식</span>
          </h1>
          <p class="brand-subtitle">교과별 결과물 · 프로젝트 단위 기록 · 학생 활동 사진을 올리면 반응형 HTML(ZIP)과 PDF로 완성됩니다</p>
        </div>
      </div>

      <div class="header-actions">
        <button type="button" class="btn btn-sm" id="btn-load-sample">✨ 예시 데이터 채우기</button>
        <button type="button" class="btn btn-sm" id="btn-reset-blank">📄 새로 만들기</button>
        <button type="button" class="btn btn-sm" id="btn-export-json">💾 프로젝트 백업</button>
        <label class="btn btn-sm" for="input-import-json" style="margin:0;">
          📂 프로젝트 열기
          <input type="file" id="input-import-json" accept=".json" style="display:none;" />
        </label>
        <button type="button" class="btn btn-accent" id="btn-download-zip">📦 HTML + 파일 압축(ZIP) 다운로드</button>
        <button type="button" class="btn btn-primary" id="btn-export-pdf">🖨️ PDF 출력물 인쇄 / 저장</button>
      </div>
    </header>

    <div class="studio-workspace">
      <aside class="builder-pane" aria-label="포트폴리오 편집 도구">
        <nav class="builder-tabs" role="tablist">
          <button type="button" class="builder-tab-btn" id="tab-btn-profile" data-tab="profile">1. 기본정보·분류</button>
          <button type="button" class="builder-tab-btn" id="tab-btn-works" data-tab="works">2. 교과·프로젝트·활동사진</button>
          <button type="button" class="builder-tab-btn" id="tab-btn-templates" data-tab="templates">3. 9종 디자인(잡지책+)</button>
        </nav>
        <div class="builder-body" id="builder-body"></div>
      </aside>

      <main class="preview-pane" aria-label="실시간 포트폴리오 미리보기">
        <div class="preview-toolbar">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <span style="font-size:13px;font-weight:800;color:var(--app-primary);" id="active-template-label"></span>
            <span style="font-size:12px;color:var(--app-text-muted);">— 우측 화면에서 [🚀 프로젝트 모음 / 📚 교과별 / 📸 활동사진첩] 필터를 눌러보세요</span>
          </div>

          <div class="viewport-switch-group" role="group" aria-label="화면 모드 전환">
            <button type="button" class="vp-btn active" data-vp="desktop" id="vp-btn-desktop">💻 PC 화면</button>
            <button type="button" class="vp-btn" data-vp="mobile" id="vp-btn-mobile">📱 모바일(핸드폰)</button>
            <button type="button" class="vp-btn" data-vp="pdf" id="vp-btn-pdf">📄 PDF 출력물 조판</button>
          </div>
        </div>

        <div class="preview-canvas-wrap">
          <div id="preview-mount"></div>
        </div>
      </main>
    </div>

    <div class="lightbox-modal" id="app-lightbox">
      <div style="max-width:880px;width:100%;text-align:center;" id="app-lightbox-inner">
        <img id="app-lightbox-img" src="" alt="" style="max-width:100%;max-height:78vh;border-radius:12px;background:#FFF;" />
        <p id="app-lightbox-caption" style="color:#F8FAFC;font-size:14px;margin:12px 0;"></p>
        <button type="button" class="btn" id="btn-close-lightbox">닫기</button>
      </div>
    </div>

    <div class="studio-toast" id="studio-toast" role="status" aria-live="polite"></div>
  `;

  bindGlobalEvents();
}

function renderBuilderPane() {
  const state = portfolioStore.getState();
  const bodyEl = document.getElementById('builder-body');
  if (!bodyEl) return;

  ['profile', 'works', 'templates'].forEach((t) => {
    const btn = document.getElementById(`tab-btn-${t}`);
    if (btn) btn.classList.toggle('active', t === activeBuilderTab);
  });

  if (activeBuilderTab === 'profile') {
    const p = state.profile || {};
    bodyEl.innerHTML = `
      <div class="form-section">
        <h2 class="form-section-title">포트폴리오 표지 및 학생 정보</h2>
        <div class="form-group">
          <label class="form-label" for="inp-portfolio-title">포트폴리오 대제목</label>
          <input id="inp-portfolio-title" class="form-input" type="text" data-profile-field="portfolioTitle" value="${escapeHtml(p.portfolioTitle)}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-portfolio-subtitle">부제목 / 한 줄 다짐</label>
          <input id="inp-portfolio-subtitle" class="form-input" type="text" data-profile-field="subtitle" value="${escapeHtml(p.subtitle)}" />
        </div>
        <div class="form-row-2 form-group">
          <div>
            <label class="form-label" for="inp-student-name">학생 이름</label>
            <input id="inp-student-name" class="form-input" type="text" data-profile-field="studentName" value="${escapeHtml(p.studentName)}" />
          </div>
          <div>
            <label class="form-label" for="inp-academic-year">대상 학년도</label>
            <input id="inp-academic-year" class="form-input" type="text" data-profile-field="academicYear" value="${escapeHtml(p.academicYear)}" />
          </div>
        </div>
        <div class="form-row-2 form-group">
          <div>
            <label class="form-label" for="inp-school-name">학교명</label>
            <input id="inp-school-name" class="form-input" type="text" data-profile-field="schoolName" value="${escapeHtml(p.schoolName)}" />
          </div>
          <div>
            <label class="form-label" for="inp-grade-class">학년 · 반 · 번호</label>
            <input id="inp-grade-class" class="form-input" type="text" data-profile-field="gradeClass" value="${escapeHtml(p.gradeClass)}" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-intro-text">자신의 소개글 (머리말)</label>
          <textarea id="inp-intro-text" class="form-textarea" data-profile-field="introText">${escapeHtml(p.introText)}</textarea>
        </div>
      </div>

      <div class="form-section">
        <h2 class="form-section-title">🚀 프로젝트 단위 목록 관리</h2>
        <div class="form-group">
          <label class="form-label" for="inp-new-project">융합·주제탐구·동아리 프로젝트 추가</label>
          <div style="display:flex;gap:6px;">
            <input id="inp-new-project" class="form-input" type="text" placeholder="예: 기후위기 대응 프로젝트, 우리마을 역사탐방" />
            <button type="button" class="btn btn-accent" id="btn-add-project">+ 추가</button>
          </div>
          <div class="subject-chip-list">
            ${(state.customProjects || []).map((pr) => `<span class="subject-chip" style="border-color:#EA580C;color:#C2410C;">🚀 ${escapeHtml(pr)}</span>`).join('')}
          </div>
        </div>
      </div>

      <div class="form-section">
        <h2 class="form-section-title">📚 교과목 목록 관리</h2>
        <div class="form-group">
          <label class="form-label" for="sel-school-level">학교급 기본 과목 불러오기</label>
          <select id="sel-school-level" class="form-select">
            <option value="elementary" ${state.schoolLevel === 'elementary' ? 'selected' : ''}>초등학교 과목 프리셋</option>
            <option value="middle" ${state.schoolLevel === 'middle' ? 'selected' : ''}>중학교 과목 프리셋</option>
            <option value="high" ${state.schoolLevel === 'high' ? 'selected' : ''}>고등학교 과목 프리셋</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-new-subject">과목 직접 추가</label>
          <div style="display:flex;gap:6px;">
            <input id="inp-new-subject" class="form-input" type="text" placeholder="예: 인공지능, 연극, 독서토론..." />
            <button type="button" class="btn btn-primary" id="btn-add-subject">+ 추가</button>
          </div>
          <div class="subject-chip-list">
            ${(state.customSubjects || []).map((s) => `<span class="subject-chip">📚 ${escapeHtml(s)}</span>`).join('')}
          </div>
        </div>
      </div>
    `;
    return;
  }

  if (activeBuilderTab === 'works') {
    const works = state.works || [];
    if (!editingWorkId && works.length > 0) editingWorkId = works[0].id;
    const currentWork = works.find((w) => w.id === editingWorkId) || null;
    const isProj = currentWork && currentWork.entryType === 'project';
    const subjects = state.customSubjects || ['국어', '수학', '사회', '과학', '미술', '정보'];
    const months = ['3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월', '1월', '2월'];

    bodyEl.innerHTML = `
      <div class="form-section" style="border-color:var(--app-primary);">
        <div class="form-section-title" style="flex-wrap:wrap;gap:6px;">
          <span>${currentWork ? '✏️ 기록 상세 편집' : '➕ 새 기록 추가'}</span>
          <div style="display:flex;gap:6px;">
            <button type="button" class="btn btn-sm btn-accent" id="btn-create-project-work">+ 🚀 프로젝트 추가</button>
            <button type="button" class="btn btn-sm btn-primary" id="btn-create-subject-work">+ 📚 교과 결과물 추가</button>
          </div>
        </div>

        ${
          currentWork
            ? `
          <div class="form-group" style="display:flex;gap:6px;padding-bottom:10px;border-bottom:1px solid var(--app-border);">
            <button type="button" class="btn btn-sm ${isProj ? 'btn-accent' : ''}" data-set-entry-type="project" style="flex:1;">
              🚀 프로젝트 단위로 기록
            </button>
            <button type="button" class="btn btn-sm ${!isProj ? 'btn-primary' : ''}" data-set-entry-type="subject" style="flex:1;">
              📚 교과목 단위로 기록
            </button>
          </div>

          ${
            isProj
              ? `
            <div style="background:#FFF7ED;border:1px solid #FDBA74;border-radius:10px;padding:12px;margin-bottom:12px;">
              <div class="form-group">
                <label class="form-label" style="color:#C2410C;">🚀 프로젝트명 선택 또는 직접 입력</label>
                <input class="form-input" list="custom-projects-datalist" type="text" data-work-field="projectName" value="${escapeHtml(currentWork.projectName || '')}" placeholder="예: 생태 도시 열섬 해결 프로젝트" />
                <datalist id="custom-projects-datalist">
                  ${(state.customProjects || []).map((pr) => `<option value="${escapeHtml(pr)}"></option>`).join('')}
                </datalist>
              </div>
              <div class="form-row-2">
                <div>
                  <label class="form-label" style="color:#C2410C;">연계 과목 / 분야</label>
                  <input class="form-input" type="text" data-work-field="linkedSubjects" value="${escapeHtml(currentWork.linkedSubjects || '')}" placeholder="예: 과학 × 사회 × 미술" />
                </div>
                <div>
                  <label class="form-label" style="color:#C2410C;">나의 역할</label>
                  <input class="form-input" type="text" data-work-field="projectRole" value="${escapeHtml(currentWork.projectRole || '')}" placeholder="예: 실험 설계 및 촬영" />
                </div>
              </div>
            </div>
          `
              : ''
          }

          <div class="form-row-3 form-group">
            <div>
              <label class="form-label">${isProj ? '대표 관련 교과' : '교과목'}</label>
              <select class="form-select" data-work-field="subject">
                ${subjects.map((s) => `<option value="${escapeHtml(s)}" ${currentWork.subject === s ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="form-label">학기</label>
              <select class="form-select" data-work-field="semester">
                <option value="1학기" ${currentWork.semester === '1학기' ? 'selected' : ''}>1학기</option>
                <option value="2학기" ${currentWork.semester === '2학기' ? 'selected' : ''}>2학기</option>
              </select>
            </div>
            <div>
              <label class="form-label">활동 월</label>
              <select class="form-select" data-work-field="month">
                ${months.map((m) => `<option value="${m}" ${currentWork.month === m ? 'selected' : ''}>${m}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">활동 / 작품 제목</label>
            <input class="form-input" type="text" data-work-field="title" value="${escapeHtml(currentWork.title)}" />
          </div>

          <div class="form-group">
            <label class="form-label">자신의 글 (프로젝트 과정 · 탐구 내용 · 에세이 본문)</label>
            <textarea class="form-textarea" style="min-height:90px;" data-work-field="content">${escapeHtml(currentWork.content)}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label">배우고 느낀 점 (나의 성장과 성찰 노트)</label>
            <textarea class="form-textarea" style="min-height:66px;" data-work-field="reflection">${escapeHtml(currentWork.reflection)}</textarea>
          </div>

          <!-- 1. NEW: Dedicated Student Activity Photos Upload -->
          <div class="form-group" style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:10px;padding:12px;">
            <label class="form-label" style="color:#047857;">📸 학생 활동 사진 올리기 (모둠활동·실험·답사·발표 현장 스냅)</label>
            <label class="upload-zone" for="inp-upload-activity-photos" style="display:block;border-color:#6EE7B7;">
              <div style="font-size:12.5px;font-weight:700;color:#047857;">+ 클릭하여 활동 모습 사진 업로드 (여러 장 가능)</div>
              <input id="inp-upload-activity-photos" type="file" accept="image/*" multiple style="display:none;" />
            </label>
            ${
              currentWork.activityPhotos && currentWork.activityPhotos.length > 0
                ? `<div class="uploaded-thumb-list">
                    ${currentWork.activityPhotos
                      .map(
                        (ap) => `
                      <div class="uploaded-thumb-item">
                        <img src="${ap.dataUrl}" alt="${escapeHtml(ap.caption || ap.name)}" />
                        <div style="flex:1;min-width:0;">
                          <input type="text" class="form-input" style="padding:5px 8px;font-size:12px;" data-actphoto-caption-id="${escapeHtml(ap.id)}" value="${escapeHtml(ap.caption || '')}" placeholder="활동 사진 설명 입력..." />
                        </div>
                        <button type="button" class="btn btn-sm btn-danger" data-remove-actphoto-id="${escapeHtml(ap.id)}">삭제</button>
                      </div>
                    `
                      )
                      .join('')}
                  </div>`
                : ''
            }
          </div>

          <!-- 2. Result Artwork / Charts Upload -->
          <div class="form-group">
            <label class="form-label">🎨 완성 결과물 그림 · 차트 · 작품 이미지 올리기</label>
            <label class="upload-zone" for="inp-upload-images" style="display:block;">
              <div style="font-size:12.5px;font-weight:700;color:var(--app-primary);">+ 클릭하여 완성 작품·차트 이미지 업로드</div>
              <input id="inp-upload-images" type="file" accept="image/*" multiple style="display:none;" />
            </label>
            ${
              currentWork.images && currentWork.images.length > 0
                ? `<div class="uploaded-thumb-list">
                    ${currentWork.images
                      .map(
                        (img) => `
                      <div class="uploaded-thumb-item">
                        <img src="${img.dataUrl}" alt="${escapeHtml(img.caption || img.name)}" />
                        <div style="flex:1;min-width:0;">
                          <input type="text" class="form-input" style="padding:5px 8px;font-size:12px;" data-img-caption-id="${escapeHtml(img.id)}" value="${escapeHtml(img.caption || '')}" placeholder="작품 캡션(설명) 입력..." />
                        </div>
                        <button type="button" class="btn btn-sm btn-danger" data-remove-img-id="${escapeHtml(img.id)}">삭제</button>
                      </div>
                    `
                      )
                      .join('')}
                  </div>`
                : ''
            }
          </div>

          <!-- 3. Attachments -->
          <div class="form-group">
            <label class="form-label">📎 원본 디지털 결과물 파일 첨부</label>
            <label class="upload-zone" for="inp-upload-files" style="display:block;padding:10px;">
              <div style="font-size:12.5px;font-weight:700;">+ 클릭하여 첨부파일 추가</div>
              <input id="inp-upload-files" type="file" multiple style="display:none;" />
            </label>
            ${
              currentWork.attachments && currentWork.attachments.length > 0
                ? `<div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;">
                    ${currentWork.attachments
                      .map(
                        (att) => `
                      <div style="display:flex;align-items:center;justify-content:space-between;background:#FFF;border:1px solid var(--app-border);border-radius:7px;padding:6px 10px;font-size:12px;">
                        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">📎 <strong>${escapeHtml(att.name)}</strong> (${escapeHtml(att.size || '')})</span>
                        <button type="button" class="btn btn-sm btn-danger" data-remove-att-id="${escapeHtml(att.id)}">제거</button>
                      </div>
                    `
                      )
                      .join('')}
                  </div>`
                : ''
            }
          </div>
        `
            : `<p style="font-size:13px;color:var(--app-text-muted);margin:0;">상단 버튼을 눌러 첫 프로젝트나 교과 결과물을 등록하세요.</p>`
        }
      </div>

      <!-- Registered Works List -->
      <div class="form-section">
        <div class="form-section-title">
          <span>등록된 기록 목록 (총 ${works.length}편)</span>
        </div>
        ${works
          .map(
            (w, idx) => `
          <div class="work-list-item ${w.id === editingWorkId ? 'editing' : ''}" data-select-work-id="${escapeHtml(w.id)}">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:4px;">
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="padding:2px 8px;border-radius:6px;background:${w.entryType === 'project' ? '#EA580C' : 'var(--app-primary)'};color:#FFF;font-size:11px;font-weight:700;">
                  ${w.entryType === 'project' ? `🚀 ${escapeHtml(w.projectName || '프로젝트')}` : `📚 ${escapeHtml(w.subject)}`}
                </span>
                <span style="font-size:11.5px;color:var(--app-text-muted);font-weight:600;">${escapeHtml(w.semester)} ${escapeHtml(w.month)}</span>
              </div>
              <div style="display:flex;gap:4px;" onclick="event.stopPropagation()">
                <button type="button" class="btn btn-sm" style="padding:2px 7px;" data-move-up-id="${escapeHtml(w.id)}" ${idx === 0 ? 'disabled' : ''}>↑</button>
                <button type="button" class="btn btn-sm" style="padding:2px 7px;" data-move-down-id="${escapeHtml(w.id)}" ${idx === works.length - 1 ? 'disabled' : ''}>↓</button>
                <button type="button" class="btn btn-sm btn-danger" style="padding:2px 7px;" data-delete-work-id="${escapeHtml(w.id)}">삭제</button>
              </div>
            </div>
            <div style="font-size:13.5px;font-weight:700;">${escapeHtml(w.title)}</div>
            <div style="font-size:11.5px;color:var(--app-text-muted);margin-top:4px;">
              📸 활동사진 ${(w.activityPhotos || []).length}장 · 🎨 작품 ${(w.images || []).length}장 · 📎 첨부 ${(w.attachments || []).length}개
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
    return;
  }

  if (activeBuilderTab === 'templates') {
    bodyEl.innerHTML = `
      <div class="form-section">
        <h2 class="form-section-title">포트폴리오 디자인 양식 선택 (총 9종 · 잡지책 3종 추가)</h2>
        <p style="font-size:12.5px;color:var(--app-text-muted);margin:0 0 14px;">
          원하는 양식을 클릭하면 우측 포트폴리오 화면과 ZIP/PDF 출력물 디자인이 즉시 변경됩니다.
        </p>

        ${DESIGN_TEMPLATES.map((tpl) => {
          const isSelected = state.selectedTemplate === tpl.id;
          return `
            <div class="tpl-card ${isSelected ? 'selected' : ''}" data-select-tpl-id="${tpl.id}">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="padding:3px 9px;border-radius:6px;background:${tpl.colors.accent};color:#FFF;font-size:11.5px;font-weight:800;">
                    ${tpl.num} · ${tpl.badge}
                  </span>
                  <strong style="font-size:14.5px;color:var(--app-text);">${tpl.name}</strong>
                </div>
              </div>
              <p style="font-size:12.5px;color:var(--app-text-muted);margin:4px 0 8px;line-height:1.5;">
                ${tpl.description}
              </p>
              <div style="font-size:11.5px;font-weight:700;color:var(--app-primary);">
                추천: ${tpl.bestFor}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
}

function renderPreviewPane() {
  const state = portfolioStore.getState();
  const mountEl = document.getElementById('preview-mount');
  const labelEl = document.getElementById('active-template-label');
  if (!mountEl) return;

  const tpl = DESIGN_TEMPLATES.find((t) => t.id === state.selectedTemplate) || DESIGN_TEMPLATES[0];
  if (labelEl) {
    labelEl.textContent = `적용 양식: [${tpl.num}] ${tpl.name}`;
  }

  ['desktop', 'mobile', 'pdf'].forEach((vp) => {
    const btn = document.getElementById(`vp-btn-${vp}`);
    if (btn) btn.classList.toggle('active', vp === previewViewport);
  });

  if (previewViewport === 'pdf') {
    mountEl.className = 'preview-stage-desktop';
    mountEl.innerHTML = renderPrintDocumentHtml(state);
    return;
  }

  if (previewViewport === 'mobile') {
    mountEl.className = 'preview-stage-mobile';
    mountEl.innerHTML = `
      <div class="mobile-speaker-notch"></div>
      <div style="padding:8px;">
        ${renderPortfolioHtml(state, {
          activeSubject: activeSubjectFilter,
          isMobile: true,
          showcaseSlideIdx
        })}
      </div>
    `;
    return;
  }

  mountEl.className = 'preview-stage-desktop';
  mountEl.innerHTML = renderPortfolioHtml(state, {
    activeSubject: activeSubjectFilter,
    isMobile: false,
    showcaseSlideIdx
  });
}

function bindGlobalEvents() {
  const app = document.getElementById('app');

  app.addEventListener('click', async (e) => {
    const tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) {
      activeBuilderTab = tabBtn.getAttribute('data-tab');
      renderBuilderPane();
      return;
    }

    const vpBtn = e.target.closest('[data-vp]');
    if (vpBtn) {
      previewViewport = vpBtn.getAttribute('data-vp');
      renderPreviewPane();
      return;
    }

    const tplCard = e.target.closest('[data-select-tpl-id]');
    if (tplCard) {
      const tplId = tplCard.getAttribute('data-select-tpl-id');
      portfolioStore.setTemplate(tplId);
      renderBuilderPane();
      renderPreviewPane();
      const tpl = DESIGN_TEMPLATES.find((t) => t.id === tplId);
      if (tpl) showToast(`🎨 '${tpl.name}' 양식이 적용되었습니다.`);
      return;
    }

    const entryTypeBtn = e.target.closest('[data-set-entry-type]');
    if (entryTypeBtn && editingWorkId) {
      const nextType = entryTypeBtn.getAttribute('data-set-entry-type');
      portfolioStore.updateWork(editingWorkId, { entryType: nextType });
      renderBuilderPane();
      renderPreviewPane();
      return;
    }

    if (e.target.closest('#btn-add-subject')) {
      const inp = document.getElementById('inp-new-subject');
      if (inp && inp.value.trim()) {
        portfolioStore.addCustomSubject(inp.value.trim());
        inp.value = '';
        renderBuilderPane();
        showToast('📚 새 과목이 추가되었습니다.');
      }
      return;
    }

    if (e.target.closest('#btn-add-project')) {
      const inp = document.getElementById('inp-new-project');
      if (inp && inp.value.trim()) {
        portfolioStore.addCustomProject(inp.value.trim());
        inp.value = '';
        renderBuilderPane();
        showToast('🚀 새 프로젝트명이 추가되었습니다.');
      }
      return;
    }

    if (e.target.closest('#btn-create-project-work')) {
      const newId = portfolioStore.addWork({
        entryType: 'project',
        projectName: portfolioStore.getState().customProjects?.[0] || '신규 융합 프로젝트',
        linkedSubjects: '융합 프로젝트',
        projectRole: '기획 및 탐구',
        subject: portfolioStore.getState().customSubjects[0] || '과학',
        semester: '1학기',
        month: '5월',
        activityType: '프로젝트 활동',
        title: '새로운 프로젝트 결과물',
        content: '프로젝트 목표와 수행 과정을 입력하세요.',
        reflection: '프로젝트를 통해 배우고 성장한 점을 적어보세요.'
      });
      editingWorkId = newId;
      activeSubjectFilter = '전체';
      renderBuilderPane();
      renderPreviewPane();
      showToast('🚀 새 프로젝트 단위 기록이 추가되었습니다.');
      return;
    }

    if (e.target.closest('#btn-create-subject-work')) {
      const newId = portfolioStore.addWork({
        entryType: 'subject',
        subject: portfolioStore.getState().customSubjects[0] || '국어',
        semester: '1학기',
        month: '4월',
        activityType: '교과 탐구 활동',
        title: '새로운 교과 활동 결과물',
        content: '활동 내용이나 자신이 작성한 글을 입력하세요.',
        reflection: '배우고 느낀 점을 적어보세요.'
      });
      editingWorkId = newId;
      activeSubjectFilter = '전체';
      renderBuilderPane();
      renderPreviewPane();
      showToast('📚 새 교과 결과물이 추가되었습니다.');
      return;
    }

    const selectWorkEl = e.target.closest('[data-select-work-id]');
    if (selectWorkEl) {
      editingWorkId = selectWorkEl.getAttribute('data-select-work-id');
      renderBuilderPane();
      return;
    }

    const moveUpBtn = e.target.closest('[data-move-up-id]');
    if (moveUpBtn) {
      portfolioStore.moveWork(moveUpBtn.getAttribute('data-move-up-id'), 'up');
      renderBuilderPane();
      renderPreviewPane();
      return;
    }
    const moveDownBtn = e.target.closest('[data-move-down-id]');
    if (moveDownBtn) {
      portfolioStore.moveWork(moveDownBtn.getAttribute('data-move-down-id'), 'down');
      renderBuilderPane();
      renderPreviewPane();
      return;
    }

    const delWorkBtn = e.target.closest('[data-delete-work-id]');
    if (delWorkBtn) {
      const delId = delWorkBtn.getAttribute('data-delete-work-id');
      portfolioStore.deleteWork(delId);
      const remaining = portfolioStore.getState().works;
      if (editingWorkId === delId) editingWorkId = remaining[0]?.id || null;
      renderBuilderPane();
      renderPreviewPane();
      showToast('기록이 삭제되었습니다.');
      return;
    }

    const remActPhotoBtn = e.target.closest('[data-remove-actphoto-id]');
    if (remActPhotoBtn && editingWorkId) {
      const id = remActPhotoBtn.getAttribute('data-remove-actphoto-id');
      const currentWork = portfolioStore.getState().works.find((w) => w.id === editingWorkId);
      if (currentWork) {
        const nextPhotos = (currentWork.activityPhotos || []).filter((ap) => ap.id !== id);
        portfolioStore.updateWork(editingWorkId, { activityPhotos: nextPhotos });
        renderBuilderPane();
        renderPreviewPane();
      }
      return;
    }

    const remImgBtn = e.target.closest('[data-remove-img-id]');
    if (remImgBtn && editingWorkId) {
      const imgId = remImgBtn.getAttribute('data-remove-img-id');
      const currentWork = portfolioStore.getState().works.find((w) => w.id === editingWorkId);
      if (currentWork) {
        const nextImages = (currentWork.images || []).filter((img) => img.id !== imgId);
        portfolioStore.updateWork(editingWorkId, { images: nextImages });
        renderBuilderPane();
        renderPreviewPane();
      }
      return;
    }

    const remAttBtn = e.target.closest('[data-remove-att-id]');
    if (remAttBtn && editingWorkId) {
      const attId = remAttBtn.getAttribute('data-remove-att-id');
      const currentWork = portfolioStore.getState().works.find((w) => w.id === editingWorkId);
      if (currentWork) {
        const nextAtts = (currentWork.attachments || []).filter((a) => a.id !== attId);
        portfolioStore.updateWork(editingWorkId, { attachments: nextAtts });
        renderBuilderPane();
        renderPreviewPane();
      }
      return;
    }

    const pfSubjBtn = e.target.closest('[data-pf-subject]');
    if (pfSubjBtn) {
      activeSubjectFilter = pfSubjBtn.getAttribute('data-pf-subject');
      showcaseSlideIdx = 0;
      renderPreviewPane();
      return;
    }

    const slideNavBtn = e.target.closest('[data-pf-slide-nav]');
    if (slideNavBtn) {
      const dir = slideNavBtn.getAttribute('data-pf-slide-nav');
      const state = portfolioStore.getState();
      const len = state.works.length || 1;
      showcaseSlideIdx =
        dir === 'prev' ? (showcaseSlideIdx - 1 + len) % len : (showcaseSlideIdx + 1) % len;
      renderPreviewPane();
      return;
    }

    const lightboxImg = e.target.closest('img[data-lightbox-src]');
    if (lightboxImg) {
      document.getElementById('app-lightbox-img').src = lightboxImg.getAttribute('data-lightbox-src');
      document.getElementById('app-lightbox-caption').textContent =
        lightboxImg.getAttribute('data-lightbox-caption') || '';
      document.getElementById('app-lightbox').classList.add('open');
      return;
    }
    if (e.target.id === 'app-lightbox' || e.target.closest('#btn-close-lightbox')) {
      document.getElementById('app-lightbox').classList.remove('open');
      return;
    }

    if (e.target.closest('#btn-load-sample')) {
      portfolioStore.loadSampleData();
      editingWorkId = portfolioStore.getState().works[0]?.id || null;
      activeSubjectFilter = '전체';
      renderBuilderPane();
      renderPreviewPane();
      showToast('✨ 프로젝트·교과·활동사진 예시 데이터를 불러왔습니다.');
      return;
    }

    if (e.target.closest('#btn-reset-blank')) {
      portfolioStore.resetBlankData();
      editingWorkId = null;
      activeBuilderTab = 'profile';
      renderBuilderPane();
      renderPreviewPane();
      showToast('📄 새 빈 포트폴리오가 준비되었습니다.');
      return;
    }

    if (e.target.closest('#btn-export-json')) {
      exportProjectJsonFile(portfolioStore.getState());
      showToast('💾 프로젝트 백업 파일(.json)이 다운로드되었습니다.');
      return;
    }

    if (e.target.closest('#btn-download-zip')) {
      const btn = document.getElementById('btn-download-zip');
      const origText = btn.textContent;
      btn.textContent = '⏳ ZIP 생성 중...';
      btn.disabled = true;
      try {
        const zipName = await generatePortfolioZip(portfolioStore.getState());
        showToast(`📦 '${zipName}' 다운로드 완료!`);
      } catch (err) {
        console.error(err);
        showToast('ZIP 생성 중 오류가 발생했습니다.');
      } finally {
        btn.textContent = origText;
        btn.disabled = false;
      }
      return;
    }

    if (e.target.closest('#btn-export-pdf')) {
      triggerPdfPrint(portfolioStore.getState(), () => {
        previewViewport = 'pdf';
        renderPreviewPane();
      });
      showToast('🖨️ A4 PDF 출력물 인쇄 창을 열었습니다.');
      return;
    }
  });

  app.addEventListener('input', (e) => {
    const profileField = e.target.getAttribute('data-profile-field');
    if (profileField) {
      portfolioStore.updateProfile({ [profileField]: e.target.value });
      renderPreviewPane();
      return;
    }

    const workField = e.target.getAttribute('data-work-field');
    if (workField && editingWorkId) {
      portfolioStore.updateWork(editingWorkId, { [workField]: e.target.value });
      renderPreviewPane();
      return;
    }

    const actCaptionId = e.target.getAttribute('data-actphoto-caption-id');
    if (actCaptionId && editingWorkId) {
      const currentWork = portfolioStore.getState().works.find((w) => w.id === editingWorkId);
      if (currentWork && Array.isArray(currentWork.activityPhotos)) {
        const nextPhotos = currentWork.activityPhotos.map((ap) =>
          ap.id === actCaptionId ? { ...ap, caption: e.target.value } : ap
        );
        portfolioStore.updateWork(editingWorkId, { activityPhotos: nextPhotos });
        renderPreviewPane();
      }
      return;
    }

    const captionImgId = e.target.getAttribute('data-img-caption-id');
    if (captionImgId && editingWorkId) {
      const currentWork = portfolioStore.getState().works.find((w) => w.id === editingWorkId);
      if (currentWork && Array.isArray(currentWork.images)) {
        const nextImages = currentWork.images.map((img) =>
          img.id === captionImgId ? { ...img, caption: e.target.value } : img
        );
        portfolioStore.updateWork(editingWorkId, { images: nextImages });
        renderPreviewPane();
      }
    }
  });

  app.addEventListener('change', async (e) => {
    if (e.target.id === 'sel-school-level') {
      portfolioStore.setSchoolLevel(e.target.value);
      renderBuilderPane();
      showToast('학교급 기본 과목 프리셋이 업데이트되었습니다.');
      return;
    }

    if (e.target.id === 'inp-upload-activity-photos' && editingWorkId) {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      const currentWork = portfolioStore.getState().works.find((w) => w.id === editingWorkId);
      if (!currentWork) return;

      const uploaded = [];
      for (const file of files) {
        const dataUrl = await readFileAsDataUrl(file);
        uploaded.push({
          id: 'ap-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          name: file.name,
          caption: file.name.replace(/\.[^.]+$/, '') + ' 활동 모습',
          dataUrl
        });
      }

      portfolioStore.updateWork(editingWorkId, {
        activityPhotos: [...(currentWork.activityPhotos || []), ...uploaded]
      });
      e.target.value = '';
      renderBuilderPane();
      renderPreviewPane();
      showToast(`📸 학생 활동 사진 ${uploaded.length}장이 추가되었습니다.`);
      return;
    }

    if (e.target.id === 'inp-upload-images' && editingWorkId) {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      const currentWork = portfolioStore.getState().works.find((w) => w.id === editingWorkId);
      if (!currentWork) return;

      const uploadedImages = [];
      for (const file of files) {
        const dataUrl = await readFileAsDataUrl(file);
        uploadedImages.push({
          id: 'img-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          name: file.name,
          caption: file.name.replace(/\.[^.]+$/, ''),
          dataUrl
        });
      }

      portfolioStore.updateWork(editingWorkId, {
        images: [...(currentWork.images || []), ...uploadedImages]
      });
      e.target.value = '';
      renderBuilderPane();
      renderPreviewPane();
      showToast(`🎨 완성 작품·자료 이미지 ${uploadedImages.length}장이 추가되었습니다.`);
      return;
    }

    if (e.target.id === 'inp-upload-files' && editingWorkId) {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      const currentWork = portfolioStore.getState().works.find((w) => w.id === editingWorkId);
      if (!currentWork) return;

      const uploadedAtts = [];
      for (const file of files) {
        const dataUrl = await readFileAsDataUrl(file);
        uploadedAtts.push({
          id: 'att-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          name: file.name,
          size: formatBytes(file.size),
          mimeType: file.type || 'application/octet-stream',
          dataUrl
        });
      }

      portfolioStore.updateWork(editingWorkId, {
        attachments: [...(currentWork.attachments || []), ...uploadedAtts]
      });
      e.target.value = '';
      renderBuilderPane();
      renderPreviewPane();
      showToast(`📎 첨부파일 ${uploadedAtts.length}개가 등록되었습니다.`);
      return;
    }

    if (e.target.id === 'input-import-json') {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (portfolioStore.importState(parsed)) {
          editingWorkId = portfolioStore.getState().works[0]?.id || null;
          renderBuilderPane();
          renderPreviewPane();
          showToast('📂 프로젝트 백업 파일을 성공적으로 불러왔습니다.');
        }
      } catch (err) {
        console.error(err);
        showToast('파일을 읽는 중 오류가 발생했습니다.');
      }
      e.target.value = '';
    }
  });
}

async function bootstrap() {
  injectTemplateStyles();
  renderAppShell();
  await portfolioStore.init();
  editingWorkId = portfolioStore.getState().works[0]?.id || null;
  renderBuilderPane();
  renderPreviewPane();
}

bootstrap();
