/**
 * PDF 쪽 그림 만들기 (pdf.js)
 *
 * PDF를 올리면 각 쪽을 그림으로 바꿔 포트폴리오에 '내용이 보이게' 넣을 수 있게 합니다.
 * pdf.js는 PDF를 처음 올릴 때만 불러옵니다(첫 화면을 가볍게 유지).
 * 오래된 아이패드 등도 지원하도록 legacy 빌드를 씁니다.
 */
import { canvasToBlob } from './files.js';

export const MAX_PDF_PAGES = 60; // 이보다 많으면 앞쪽 60쪽만 그림으로 만듦
const PAGE_SIDE = 1400; // 쪽 그림 긴 변 길이(px)
const PDFJS_VERSION = '6.4.299';

let pdfjsPromise = null;
function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs'),
      import('pdfjs-dist/legacy/build/pdf.worker.mjs?worker&inline')
    ]).then(([pdfjs, Worker]) => {
      pdfjs.GlobalWorkerOptions.workerPort = new Worker.default();
      return pdfjs;
    });
    pdfjsPromise.catch(() => (pdfjsPromise = null));
  }
  return pdfjsPromise;
}

/**
 * @param {Blob} blob PDF 파일
 * @param {(done:number,total:number)=>void} onProgress
 * @returns {Promise<{ pageCount, pages: [{ blob, width, height }] }>}
 */
export async function renderPdfPages(blob, onProgress = () => {}) {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(await blob.arrayBuffer());
  const task = pdfjs.getDocument({
    data,
    // 글꼴이 들어 있지 않은 한글 PDF를 위해 CMap을 인터넷에서 가져옵니다(없어도 대부분 정상 표시).
    cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/standard_fonts/`,
    isEvalSupported: false
  });
  const doc = await task.promise;
  const pageCount = doc.numPages;
  const total = Math.min(pageCount, MAX_PDF_PAGES);
  const pages = [];
  try {
    for (let i = 1; i <= total; i++) {
      const page = await doc.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(3, PAGE_SIDE / Math.max(base.width, base.height));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, canvas, viewport }).promise;
      pages.push({ blob: await canvasToBlob(canvas, false, 0.85), width: canvas.width, height: canvas.height });
      page.cleanup();
      onProgress(i, total);
    }
  } finally {
    // 문서 정리(버전에 따라 이름이 달라 안전하게 호출)
    await Promise.resolve(task.destroy?.()).catch(() => {});
  }
  return { pageCount, pages };
}
