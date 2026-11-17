/**
 * 올린 파일을 포트폴리오 미디어로 바꿉니다.
 *   사진   → 화질 설정에 맞춰 줄인 Blob + 크기
 *   동영상 → 원본 Blob + 썸네일 그림 + 크기·길이
 *   PDF    → 원본 Blob + 쪽 그림들(내용 보이기) + 기본 배치(1쪽이면 크게, 여러 쪽이면 2×2)
 *   그 밖의 파일 → 원본 Blob (첨부파일)
 */
import { MAX_FILE_BYTES, formatBytes, isImageFile, isPdfBlob, isVideoFile, prepareImage, uid } from '../utils/files.js';
import { makeVideoPoster } from '../utils/video.js';
import { renderPdfPages } from '../utils/pdf.js';

/**
 * @param {File[]} files
 * @param {{ maxSide:number, onProgress:(text:string)=>void }} opts
 * @returns {Promise<{ photos, videos, attachments, problems }>}
 */
export async function ingestFiles(files, { maxSide, onProgress = () => {} } = {}) {
  const photos = [];
  const videos = [];
  const attachments = [];
  const problems = [];

  for (const [i, file] of files.entries()) {
    const step = `(${i + 1}/${files.length})`;
    try {
      if (file.size > MAX_FILE_BYTES) {
        problems.push(`${file.name}: ${formatBytes(MAX_FILE_BYTES)}보다 커서 올릴 수 없어요.`);
        continue;
      }
      if (isImageFile(file)) {
        onProgress(`사진 줄이는 중… ${step}`);
        photos.push({ id: uid('ph'), name: file.name, caption: '', ...(await prepareImage(file, { maxSide })) });
      } else if (isVideoFile(file)) {
        onProgress(`동영상 썸네일 만드는 중… ${step}`);
        const info = await makeVideoPoster(file);
        videos.push({
          id: uid('vid'),
          name: file.name,
          caption: '',
          size: formatBytes(file.size),
          mimeType: file.type || 'video/mp4',
          blob: file,
          width: info.width,
          height: info.height,
          duration: Math.round(info.duration || 0),
          playable: info.playable,
          poster: { id: uid('poster'), blob: info.poster, width: info.width, height: info.height }
        });
        if (!info.playable) problems.push(`${file.name}: 이 브라우저에서는 미리보기가 안 되는 동영상 형식이라 기본 썸네일을 넣었어요.`);
      } else {
        const item = {
          id: uid('att'),
          name: file.name,
          size: formatBytes(file.size),
          mimeType: file.type || (isPdfBlob(file) ? 'application/pdf' : 'application/octet-stream'),
          blob: file
        };
        if (isPdfBlob(file)) {
          try {
            const { pageCount, pages } = await renderPdfPages(file, (d, t) => onProgress(`PDF 쪽 그림 만드는 중… ${d}/${t}쪽 ${step}`));
            item.pages = pages.map((pg) => ({ id: uid('page'), ...pg }));
            item.pageCount = pageCount;
            item.docCols = pages.length === 1 ? 1 : 2;
            item.docPages = pages.slice(0, pages.length === 1 ? 1 : 4).map((_, n) => n);
          } catch (err) {
            console.warn('PDF 쪽 그림 실패', err);
            problems.push(`${file.name}: PDF 내용을 그림으로 만들지 못해 파일로만 올렸어요.`);
          }
        }
        attachments.push(item);
      }
    } catch (err) {
      console.warn(err);
      problems.push(
        /\.(heic|heif)$/i.test(file.name)
          ? `${file.name}: 이 브라우저는 아이폰 HEIC 사진을 열 수 없어요. JPG로 바꿔서 올려 주세요.`
          : `${file.name}: 열 수 없는 파일이에요.`
      );
    }
  }
  return { photos, videos, attachments, problems };
}

/** 저장 공간 확인용: 올릴 파일들의 대략적인 저장 크기 */
export function estimateStoredBytes(files) {
  return files.reduce((a, f) => a + (isImageFile(f) ? Math.min(f.size, 1.5 * 1024 * 1024) : f.size * (isPdfBlob(f) ? 1.6 : 1.05)), 0);
}
