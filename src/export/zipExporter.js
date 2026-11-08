import JSZip from 'jszip';
import { getPortfolioTemplatesCss, renderPortfolioHtml, escapeHtml } from '../templates/portfolioRenderer.js';
import { DESIGN_TEMPLATES } from '../data/sampleData.js';

function sanitizeFileName(name = 'file', fallbackExt = 'dat') {
  const cleaned = name.replace(/[^a-zA-Z0-9가-힣._-]/g, '_');
  if (!cleaned.includes('.')) {
    return `${cleaned}.${fallbackExt}`;
  }
  return cleaned;
}

function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return null;
  }
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return null;
  const header = dataUrl.slice(5, commaIdx);
  const body = dataUrl.slice(commaIdx + 1);
  const isBase64 = header.includes(';base64');
  const mimeType = header.split(';')[0] || 'application/octet-stream';

  if (isBase64) {
    return { isBase64: true, mimeType, data: body };
  }
  return { isBase64: false, mimeType, data: decodeURIComponent(body) };
}

function getExtensionFromMime(mimeType = '') {
  if (mimeType.includes('svg')) return 'svg';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('gif')) return 'gif';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('csv')) return 'csv';
  if (mimeType.includes('text')) return 'txt';
  return 'bin';
}

export async function generatePortfolioZip(state) {
  const zip = new JSZip();
  const activityPhotosFolder = zip.folder('assets/activity_photos');
  const imagesFolder = zip.folder('assets/images');
  const attachmentsFolder = zip.folder('assets/attachments');

  const assetMap = {
    activityPhotos: {},
    images: {},
    attachments: {}
  };

  const works = Array.isArray(state.works) ? state.works : [];

  works.forEach((work, wIdx) => {
    const actPhotos = Array.isArray(work.activityPhotos) ? work.activityPhotos : [];
    actPhotos.forEach((ap, pIdx) => {
      const parsed = parseDataUrl(ap.dataUrl);
      if (parsed) {
        const ext = getExtensionFromMime(parsed.mimeType);
        const safeName = sanitizeFileName(ap.name || `work_${wIdx + 1}_activity_${pIdx + 1}.${ext}`, ext);
        const uniqueFileName = `${wIdx + 1}_${pIdx + 1}_${safeName}`;
        if (parsed.isBase64) {
          activityPhotosFolder.file(uniqueFileName, parsed.data, { base64: true });
        } else {
          activityPhotosFolder.file(uniqueFileName, parsed.data);
        }
        assetMap.activityPhotos[ap.id] = `assets/activity_photos/${uniqueFileName}`;
      }
    });

    const imgs = Array.isArray(work.images) ? work.images : [];
    imgs.forEach((img, iIdx) => {
      const parsed = parseDataUrl(img.dataUrl);
      if (parsed) {
        const ext = getExtensionFromMime(parsed.mimeType);
        const safeName = sanitizeFileName(img.name || `work_${wIdx + 1}_img_${iIdx + 1}.${ext}`, ext);
        const uniqueFileName = `${wIdx + 1}_${iIdx + 1}_${safeName}`;
        if (parsed.isBase64) {
          imagesFolder.file(uniqueFileName, parsed.data, { base64: true });
        } else {
          imagesFolder.file(uniqueFileName, parsed.data);
        }
        assetMap.images[img.id] = `assets/images/${uniqueFileName}`;
      }
    });

    const atts = Array.isArray(work.attachments) ? work.attachments : [];
    atts.forEach((att, aIdx) => {
      const parsed = parseDataUrl(att.dataUrl);
      if (parsed) {
        const ext = getExtensionFromMime(parsed.mimeType);
        const safeName = sanitizeFileName(att.name || `work_${wIdx + 1}_file_${aIdx + 1}.${ext}`, ext);
        const uniqueFileName = `${wIdx + 1}_${aIdx + 1}_${safeName}`;
        if (parsed.isBase64) {
          attachmentsFolder.file(uniqueFileName, parsed.data, { base64: true });
        } else {
          attachmentsFolder.file(uniqueFileName, parsed.data);
        }
        assetMap.attachments[att.id] = `assets/attachments/${uniqueFileName}`;
      }
    });
  });

  const cssContent = getPortfolioTemplatesCss();
  zip.file('style.css', cssContent);

  const initialHtml = renderPortfolioHtml(state, {
    activeSubject: '전체',
    isMobile: false,
    showcaseSlideIdx: 0,
    assetMap
  });

  const tplMeta = DESIGN_TEMPLATES.find((t) => t.id === state.selectedTemplate) || DESIGN_TEMPLATES[0];
  const titleText = escapeHtml(state.profile?.portfolioTitle || '학생 포트폴리오');
  const studentName = escapeHtml(state.profile?.studentName || '학생');

  const standaloneIndexHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${titleText} - ${studentName}</title>
  <link rel="stylesheet" href="style.css" />
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #F1F5F9;
      color: #0F172A;
      font-family: 'Pretendard', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    }
    .standalone-bar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(8px);
      color: #F8FAFC;
      padding: 10px 20px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      font-size: 13px;
    }
    .standalone-bar button {
      background: #2563EB;
      color: #F8FAFC;
      border: none;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
    }
    .standalone-container {
      max-width: 1120px;
      margin: 24px auto;
      padding: 0 16px 48px;
    }
    @media print {
      .standalone-bar { display: none !important; }
      body { background: #FFFFFF !important; }
      .standalone-container { margin: 0 !important; padding: 0 !important; max-width: 100% !important; }
    }
  </style>
</head>
<body>
  <div class="standalone-bar">
    <div>
      <strong>📘 ${titleText}</strong>
      <span style="opacity:0.75;margin-left:8px;">(${studentName} · 적용 양식: ${escapeHtml(tplMeta.name)})</span>
    </div>
    <div>
      <button type="button" onclick="window.print()">🖨️ 인쇄 / PDF 저장</button>
    </div>
  </div>
  <main class="standalone-container">
    ${initialHtml}
  </main>
</body>
</html>`;

  zip.file('index.html', standaloneIndexHtml);
  zip.file('project-backup.json', JSON.stringify(state, null, 2));

  const blob = await zip.generateAsync({ type: 'blob' });
  const fileSafeStudent = sanitizeFileName(state.profile?.studentName || '학생', '').replace(/\.$/, '');
  const zipFileName = `${fileSafeStudent}_포트폴리오_${state.selectedTemplate || 'mag-life'}.zip`;

  triggerBlobDownload(blob, zipFileName);
  return zipFileName;
}

export function triggerBlobDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 500);
}

export function exportProjectJsonFile(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const name = (state.profile?.studentName || '학생').replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
  triggerBlobDownload(blob, `${name}_포트폴리오_프로젝트백업.json`);
}
