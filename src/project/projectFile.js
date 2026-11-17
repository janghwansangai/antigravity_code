/**
 * 프로젝트 파일 저장·열기 (.portfolio)
 *
 * 파일 구조(ZIP 형식)
 *   project.json     글·설정 + 각 미디어의 파일 위치(file)
 *   media/<id>.<ext> 사진·동영상·PDF·쪽 그림·썸네일 원본
 *
 * - 크롬·엣지(컴퓨터)에서는 처음 고른 파일 위치를 기억해 다음부터 '저장'만 누르면 같은 파일에 덮어씁니다.
 *   다른 브라우저에서는 '내려받기' 폴더에 저장됩니다.
 * - 예전 버전의 작업 백업(.json)도 그대로 열 수 있습니다.
 */
import JSZip from 'jszip';
import { walkMedia, stripState } from '../media/model.js';
import { dataUrlToBlob, safeFileName, triggerBlobDownload } from '../utils/files.js';

export const PROJECT_EXT = '.portfolio';
const FORMAT = 'student-portfolio-project';
const handles = new Map(); // 포트폴리오 id → 저장 파일 위치(이번 창에서만 기억)

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov'
};

function extOf(blob, name = '') {
  return EXT_BY_MIME[blob.type] || (name.includes('.') ? name.split('.').pop().replace(/[^a-zA-Z0-9]/g, '').slice(0, 5) : '') || 'bin';
}

/** 저장할 ZIP(아직 압축 전) 만들기 */
export function buildProjectZip(state) {
  const zip = new JSZip();
  const files = new Map();
  walkMedia(state, (m) => {
    const blob = m.blob || (m.dataUrl ? dataUrlToBlob(m.dataUrl) : null);
    if (!blob) return;
    const path = `media/${safeFileName(m.id)}.${extOf(blob, m.name)}`;
    files.set(m.id, path);
    // 사진·동영상은 이미 압축돼 있어 다시 압축하지 않음(빠름)
    zip.file(path, blob, { compression: 'STORE' });
  });
  const light = stripState({ ...state, isSample: false });
  walkMedia(light, (m) => {
    if (files.has(m.id)) m.file = files.get(m.id);
  });
  zip.file('project.json', JSON.stringify({ format: FORMAT, version: 2, savedAt: new Date().toISOString(), state: light }, null, 2));
  return zip;
}

export function projectFileName(state) {
  return `${safeFileName(state.profile?.studentName || '나의')}_포트폴리오${PROJECT_EXT}`;
}

export function canSaveInPlace() {
  return typeof window.showSaveFilePicker === 'function';
}

async function writeZipToHandle(zip, handle, onProgress) {
  const writable = await handle.createWritable();
  try {
    await new Promise((resolve, reject) => {
      const stream = zip.generateInternalStream({ type: 'uint8array', streamFiles: true });
      let queue = Promise.resolve();
      stream
        .on('data', (chunk, meta) => {
          stream.pause();
          queue = queue.then(() => writable.write(chunk)).then(() => {
            onProgress?.(meta.percent);
            stream.resume();
          }, reject);
        })
        .on('error', reject)
        .on('end', () => queue.then(resolve, reject))
        .resume();
    });
    await writable.close();
  } catch (err) {
    await writable.abort?.().catch(() => {});
    throw err;
  }
}

/**
 * 프로젝트 파일 저장
 * @param {{ portfolioId, saveAs?: boolean, onProgress?: (percent)=>void }} opts
 * @returns {Promise<{ name, inPlace } | null>} 사용자가 취소하면 null
 */
export async function saveProjectFile(state, { portfolioId, saveAs = false, onProgress } = {}) {
  const zip = buildProjectZip(state);
  if (canSaveInPlace()) {
    let handle = !saveAs && handles.get(portfolioId);
    if (!handle) {
      try {
        handle = await window.showSaveFilePicker({
          suggestedName: projectFileName(state),
          types: [{ description: '포트폴리오 프로젝트 파일', accept: { 'application/zip': [PROJECT_EXT] } }]
        });
      } catch (err) {
        if (err?.name === 'AbortError') return null;
        handle = null; // 지원하지만 막힌 경우(iframe 등) → 내려받기로
      }
    }
    if (handle) {
      await writeZipToHandle(zip, handle, onProgress);
      handles.set(portfolioId, handle);
      return { name: handle.name, inPlace: true };
    }
  }
  const blob = await zip.generateAsync({ type: 'blob', streamFiles: true }, (m) => onProgress?.(m.percent));
  const name = projectFileName(state);
  triggerBlobDownload(blob, name);
  return { name, inPlace: false };
}

/** 이 포트폴리오를 저장했던 파일 이름(있으면) */
export function savedFileName(portfolioId) {
  return handles.get(portfolioId)?.name || '';
}

export function forgetSavedFile(portfolioId) {
  handles.delete(portfolioId);
}

/**
 * 프로젝트 파일(.portfolio) 또는 예전 백업(.json) 열기
 * @returns {Promise<object>} 포트폴리오 상태(검사 전 원본)
 */
export async function readProjectFile(file) {
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  const isZip = head[0] === 0x50 && head[1] === 0x4b; // 'PK'
  if (!isZip) {
    const data = JSON.parse(await file.text());
    if (data?.format === FORMAT && data.state) return data.state;
    return data; // 예전 버전 작업 백업(.json): 사진이 dataUrl로 들어 있음
  }
  const zip = await JSZip.loadAsync(file);
  const json = zip.file('project.json');
  if (!json) {
    // ZIP 내보내기 파일 안의 예전 백업도 받아 줌
    const legacy = zip.file('project-backup.json');
    if (legacy) return JSON.parse(await legacy.async('string'));
    throw new Error('프로젝트 파일이 아니에요.');
  }
  const data = JSON.parse(await json.async('string'));
  const state = data.state || data;
  const jobs = [];
  walkMedia(state, (m) => {
    if (!m.file) return;
    const entry = zip.file(m.file);
    delete m.file;
    if (!entry) return;
    jobs.push(
      entry.async('blob').then((b) => {
        const type = m.mimeType || Object.keys(EXT_BY_MIME).find((k) => entry.name.endsWith(`.${EXT_BY_MIME[k]}`)) || '';
        m.blob = type ? new Blob([b], { type }) : b;
      })
    );
  });
  await Promise.all(jobs);
  return state;
}
