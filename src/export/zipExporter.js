/**
 * ZIP 내보내기: 웹페이지 + 사진·첨부파일 폴더 + 작업 백업
 *
 *   index.html            두 번 눌러 바로 여는 포트폴리오
 *   style.css             디자인
 *   assets/photos/        사진
 *   assets/files/         첨부파일
 *   project-backup.json   앱에서 '백업 불러오기'로 다시 편집할 수 있는 파일
 */
import JSZip from 'jszip';
import { getPortfolioTemplatesCss } from '../templates/portfolioRenderer.js';
import { buildStandaloneHtml, portfolioFileBaseName } from './htmlExporter.js';
import { triggerBlobDownload } from '../utils/files.js';

function parseDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null;
  const comma = dataUrl.indexOf(',');
  if (comma === -1) return null;
  const header = dataUrl.slice(5, comma);
  const body = dataUrl.slice(comma + 1);
  const mimeType = header.split(';')[0] || 'application/octet-stream';
  return header.includes(';base64')
    ? { base64: true, mimeType, data: body }
    : { base64: false, mimeType, data: decodeURIComponent(body) };
}

const EXT_BY_MIME = {
  'image/svg+xml': 'svg',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'text/csv': 'csv',
  'text/plain': 'txt'
};

// ZIP 안 파일 이름은 영문·숫자로만 만듭니다. (한글 이름은 오래된 Windows 압축 풀기에서 깨져
// 페이지의 사진 링크가 끊길 수 있음) 화면에 보이는 이름은 원래 파일 이름 그대로입니다.
function zipFileName(index, name, mimeType, fallback) {
  const ext = (EXT_BY_MIME[mimeType] || (name.includes('.') ? name.split('.').pop() : 'bin')).replace(/[^a-zA-Z0-9]/g, '') || 'bin';
  const stem = name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || fallback;
  return `${String(index).padStart(2, '0')}_${stem}.${ext.toLowerCase()}`;
}

export async function generatePortfolioZip(state) {
  const zip = new JSZip();
  const assetMap = { activityPhotos: {}, images: {}, attachments: {} };
  let photoCount = 0;
  let fileCount = 0;

  const addAsset = (folder, item, bucket, counter) => {
    const parsed = parseDataUrl(item.dataUrl);
    if (!parsed) return;
    const name = zipFileName(counter, item.name || '', parsed.mimeType, folder === 'photos' ? 'photo' : 'file');
    zip.file(`assets/${folder}/${name}`, parsed.data, { base64: parsed.base64 });
    assetMap[bucket][item.id] = `assets/${folder}/${name}`;
  };

  (state.works || []).forEach((work) => {
    (work.activityPhotos || []).forEach((p) => addAsset('photos', p, 'activityPhotos', ++photoCount));
    (work.images || []).forEach((p) => addAsset('photos', p, 'images', ++photoCount));
    (work.attachments || []).forEach((a) => addAsset('files', a, 'attachments', ++fileCount));
  });

  zip.file('style.css', getPortfolioTemplatesCss());
  zip.file('index.html', buildStandaloneHtml(state, { assetMap, cssHref: 'style.css' }));
  const { isSample, ...backup } = state;
  zip.file('project-backup.json', JSON.stringify(backup, null, 2));

  const blob = await zip.generateAsync({ type: 'blob' });
  const fileName = `${portfolioFileBaseName(state)}.zip`;
  triggerBlobDownload(blob, fileName);
  return fileName;
}
