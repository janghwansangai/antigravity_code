/**
 * PDF 저장: A4 인쇄용 문서를 새 창에 열고 인쇄 창을 띄웁니다.
 * 인쇄 창의 '대상'에서 'PDF로 저장'을 고르면 PDF 파일이 됩니다.
 */
import { renderPrintDocumentHtml, getPrintDocumentCss, escapeHtml, FONT_LINKS_HTML } from '../templates/portfolioRenderer.js';

/**
 * @param {object} state
 * @param {Function} fallback 팝업이 막혔을 때 실행할 함수 (앱이 PDF 미리보기로 바꾼 뒤 window.print 호출)
 * @returns {boolean} 새 창을 열었으면 true
 */
export function triggerPdfPrint(state, fallback) {
  const p = state.profile || {};
  const title = [p.portfolioTitle || '나의 포트폴리오', p.studentName].filter(Boolean).join('_');
  const win = window.open('', '_blank', 'width=900,height=1000');
  if (!win || !win.document) {
    if (typeof fallback === 'function') fallback();
    return false;
  }

  win.document.open();
  win.document.write(`<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(title)}</title>
${FONT_LINKS_HTML}
<style>
${getPrintDocumentCss()}
@page { size: A4 portrait; margin: 14mm; }
body { margin: 0; background: #E2E8F0; }
@media print { body { background: #FFFFFF; } }
</style>
</head>
<body>
${renderPrintDocumentHtml(state)}
<script>
(function () {
  var imgs = Array.prototype.slice.call(document.images);
  var waitImages = Promise.all(imgs.map(function (img) {
    return img.complete ? null : new Promise(function (r) { img.onload = img.onerror = r; });
  }));
  var waitFonts = document.fonts ? document.fonts.ready : null;
  var timeout = new Promise(function (r) { setTimeout(r, 2500); });
  Promise.race([Promise.all([waitImages, waitFonts]), timeout]).then(function () {
    window.focus();
    window.print();
  });
})();
<\/script>
</body>
</html>`);
  win.document.close();
  return true;
}
