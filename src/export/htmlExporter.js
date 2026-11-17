/**
 * 완성된 포트폴리오를 혼자서도 열리는 웹페이지(index.html)로 만듭니다.
 * - exportSingleHtmlFile: 사진·첨부파일까지 모두 넣은 .html 파일 1개 (제출·공유가 가장 쉬움)
 * - buildStandaloneHtml: ZIP 내보내기에서도 같은 페이지 틀을 씁니다.
 */
import {
  escapeHtml,
  getPortfolioTemplatesCss,
  getTemplateMeta,
  renderPortfolioHtml,
  FONT_LINKS_HTML
} from '../templates/portfolioRenderer.js';
import runtimeSource from '../templates/portfolioRuntime.js?raw';
import { blobToDataUrl, safeFileName, triggerBlobDownload } from '../utils/files.js';
import { mediaBytes, walkMedia } from '../media/model.js';

const PAGE_CSS = `
html, body { margin: 0; padding: 0; }
body { background: var(--page-bg); }
.page { max-width: 1080px; margin: 0 auto; padding: 24px 16px 72px; }
.print-btn { position: fixed; right: 16px; bottom: 16px; z-index: 10; font: 700 14px/1 'Noto Sans KR', system-ui, sans-serif; padding: 12px 16px; border-radius: 999px; border: 0; background: #0F172A; color: #FFFFFF; cursor: pointer; box-shadow: 0 6px 18px rgba(0,0,0,0.2); }
@media (max-width: 640px) { .page { padding: 0 0 72px; } .page .pf { border-radius: 0; } }
@media print { .print-btn { display: none; } .page { max-width: none; padding: 0; } body { background: #FFFFFF; } }
`;

function inlineRuntimeScript() {
  const code = runtimeSource.replace(/^export\s+function/m, 'function').replace(/<\/script/gi, '<\\/script');
  return `<script>\n${code}\nattachPortfolioInteractions(document.querySelector('.page'));\n</script>`;
}

/**
 * @param {object} state
 * @param {object} opts
 *   assetMap  미디어 id → 주소 (ZIP: 파일 경로, 단일 파일: data URL)
 *   cssHref   CSS를 따로 둘 때의 파일 이름 (없으면 <style> 안에 넣음)
 */
export function buildStandaloneHtml(state, { assetMap = null, cssHref = '' } = {}) {
  const tpl = getTemplateMeta(state.selectedTemplate);
  const p = state.profile || {};
  const title = [p.portfolioTitle || '나의 포트폴리오', p.studentName].filter(Boolean).join(' - ');
  const pageBg = tpl.id === 'showcase' ? '#0B0B0D' : tpl.colors.bg;
  const css = cssHref
    ? `<link rel="stylesheet" href="${escapeHtml(cssHref)}" />`
    : `<style>${getPortfolioTemplatesCss()}</style>`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
${FONT_LINKS_HTML}
${css}
<style>:root { --page-bg: ${pageBg}; }${PAGE_CSS}</style>
</head>
<body>
<main class="page">
${renderPortfolioHtml(state, { assetMap })}
</main>
<button type="button" class="print-btn" onclick="window.print()">🖨️ 인쇄 · PDF</button>
${inlineRuntimeScript()}
</body>
</html>`;
}

export function portfolioFileBaseName(state) {
  return `${safeFileName(state.profile?.studentName || '나의')}_포트폴리오`;
}

/** 파일 하나 안에 넣을 수 있는 크기 (이보다 큰 동영상·파일은 썸네일·안내로 대신) */
export const SINGLE_FILE_ITEM_LIMIT = 30 * 1024 * 1024;
const SINGLE_FILE_TOTAL_LIMIT = 150 * 1024 * 1024;

/**
 * 사진·PDF·동영상을 페이지 안에 넣을 data URL 주소표를 만듭니다.
 * 너무 큰 동영상·첨부파일은 빼고, 뺀 것의 이름을 돌려줍니다.
 */
async function buildInlineAssetMap(state) {
  const assetMap = {};
  const skipped = [];
  const items = [];
  walkMedia(state, (m, w, bucket) => items.push({ m, bucket }));
  // 작은 것(사진·썸네일·쪽 그림)부터 넣고, 큰 동영상·파일은 남은 용량 안에서만
  items.sort((a, b) => mediaBytes(a.m) - mediaBytes(b.m));
  let total = 0;
  for (const { m, bucket } of items) {
    const size = mediaBytes(m);
    const big = bucket === 'videos' || bucket === 'attachments';
    if (big && (size > SINGLE_FILE_ITEM_LIMIT || total + size > SINGLE_FILE_TOTAL_LIMIT)) {
      skipped.push(m.name || '파일');
      continue;
    }
    assetMap[m.id] = m.blob ? await blobToDataUrl(m.blob) : m.dataUrl || '';
    total += size;
  }
  return { assetMap, skipped };
}

/** 사진·PDF·동영상을 모두 품은 .html 파일 하나를 내려받습니다. → { fileName, skipped } */
export async function exportSingleHtmlFile(state) {
  const { assetMap, skipped } = await buildInlineAssetMap(state);
  const html = buildStandaloneHtml(state, { assetMap });
  const fileName = `${portfolioFileBaseName(state)}.html`;
  triggerBlobDownload(new Blob([html], { type: 'text/html;charset=utf-8' }), fileName);
  return { fileName, skipped };
}
