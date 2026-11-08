import { renderPrintDocumentHtml, getPortfolioTemplatesCss, escapeHtml } from '../templates/portfolioRenderer.js';

export function triggerPdfPrint(state, onBeforePrintViewSwitch) {
  // Ensure the main app switches to the PDF print preview container so @media print works directly
  if (typeof onBeforePrintViewSwitch === 'function') {
    onBeforePrintViewSwitch();
  }

  const printHtml = renderPrintDocumentHtml(state);
  const css = getPortfolioTemplatesCss();
  const titleText = escapeHtml(state.profile?.portfolioTitle || '학생 포트폴리오');
  const studentName = escapeHtml(state.profile?.studentName || '학생');

  // Try opening a clean print window for crisp vector PDF saving; fallback to window.print()
  const printWin = window.open('', '_blank', 'width=900,height=1000');
  if (printWin && printWin.document) {
    printWin.document.open();
    printWin.document.write(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>${titleText}_${studentName}_포트폴리오_출력물</title>
  <style>
    ${css}
    @page {
      size: A4 portrait;
      margin: 12mm;
    }
    body {
      margin: 0;
      padding: 0;
      background: #FFFFFF;
      color: #0F172A;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .pf-print-wrapper {
      background: #FFFFFF !important;
      padding: 0 !important;
    }
    .pf-a4-page {
      box-shadow: none !important;
      border: none !important;
      margin: 0 auto !important;
      padding: 0 !important;
      max-width: 100% !important;
    }
  </style>
</head>
<body>
  ${printHtml}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`);
    printWin.document.close();
  } else {
    // Fallback to in-page @media print
    setTimeout(() => {
      window.print();
    }, 150);
  }
}
