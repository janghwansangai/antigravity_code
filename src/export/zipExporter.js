/**
 * ZIP 내보내기: 웹페이지 + 사진·동영상·파일 폴더
 *
 *   index.html          두 번 눌러 바로 여는 포트폴리오
 *   style.css           디자인
 *   assets/photos/      사진(작품·활동), 동영상 썸네일
 *   assets/videos/      동영상 원본
 *   assets/files/       PDF·첨부파일 원본
 *   assets/pages/       PDF 쪽 그림
 *
 * 다시 편집하려면 ZIP이 아니라 '프로젝트 파일(.portfolio)'을 저장해 두세요.
 */
import JSZip from 'jszip';
import { BIG_FILE_NOTE, BIG_VIDEO_NOTE, getPortfolioTemplatesCss } from '../templates/portfolioRenderer.js';
import { buildStandaloneHtml, portfolioFileBaseName } from './htmlExporter.js';
import { dataUrlToBlob, triggerBlobDownload } from '../utils/files.js';
import { walkMedia } from '../media/model.js';

const EXT_BY_MIME = {
  'image/svg+xml': 'svg',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'text/csv': 'csv',
  'text/plain': 'txt',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov'
};

const FOLDER_BY_BUCKET = {
  images: 'photos',
  activityPhotos: 'photos',
  'videos.poster': 'photos',
  videos: 'videos',
  attachments: 'files',
  'attachments.pages': 'pages'
};

// ZIP 안 파일 이름은 영문·숫자로만 만듭니다. (한글 이름은 오래된 Windows 압축 풀기에서 깨져
// 페이지의 링크가 끊길 수 있음) 화면에 보이는 이름은 원래 파일 이름 그대로입니다.
function zipFileName(index, name, mimeType, fallback) {
  const ext = (EXT_BY_MIME[mimeType] || (name.includes('.') ? name.split('.').pop() : 'bin')).replace(/[^a-zA-Z0-9]/g, '') || 'bin';
  const stem = name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || fallback;
  return `${String(index).padStart(3, '0')}_${stem}.${ext.toLowerCase()}`;
}

/**
 * ZIP 파일(Blob) 만들기
 * @param {{ onProgress?: (pct:number)=>void, include?: (m, bucket, blob)=>boolean, notes?: { video?: string, file?: string } }} opts
 *   include: false를 돌려준 동영상·첨부파일은 넣지 않음(동영상은 썸네일, 파일은 안내만) — 갤러리 공유용 가벼운 ZIP
 */
export async function buildPortfolioZip(state, { onProgress, include = null, notes = {} } = {}) {
  const zip = new JSZip();
  const assetMap = {};
  let n = 0;

  walkMedia(state, (m, w, bucket) => {
    const blob = m.blob || (m.dataUrl ? dataUrlToBlob(m.dataUrl) : null);
    if (!blob) return;
    if (include && !include(m, bucket, blob)) return;
    const folder = FOLDER_BY_BUCKET[bucket] || 'files';
    const name = zipFileName(++n, m.name || '', blob.type || m.mimeType || '', folder.replace(/s$/, ''));
    const path = `assets/${folder}/${name}`;
    zip.file(path, blob, { compression: 'STORE' });
    assetMap[m.id] = path;
  });

  zip.file('style.css', getPortfolioTemplatesCss());
  let html = buildStandaloneHtml(state, { assetMap, cssHref: 'style.css' });
  if (notes.video) html = html.split(BIG_VIDEO_NOTE).join(notes.video);
  if (notes.file) html = html.split(BIG_FILE_NOTE).join(notes.file);
  zip.file('index.html', html);

  return zip.generateAsync({ type: 'blob', streamFiles: true }, (meta) => onProgress?.(meta.percent));
}

export async function generatePortfolioZip(state, onProgress) {
  const blob = await buildPortfolioZip(state, { onProgress });
  const fileName = `${portfolioFileBaseName(state)}.zip`;
  triggerBlobDownload(blob, fileName);
  return fileName;
}
