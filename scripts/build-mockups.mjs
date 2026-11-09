/**
 * 시안 비교 페이지 만들기: portfolio_design_mockups.html
 *
 *   npm run build:mockups
 *
 * 앱과 같은 렌더러(src/templates/portfolioRenderer.js)와 예시 데이터로 모든 시안을 한 페이지에 그립니다.
 * 시안을 고치면 이 명령으로 다시 만들면 되므로, 비교 파일이 앱과 어긋나지 않습니다.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { DESIGN_TEMPLATES, createSamplePortfolioData } from '../src/data/sampleData.js';
import { escapeHtml, getPortfolioTemplatesCss, renderPortfolioHtml, FONT_LINKS_HTML } from '../src/templates/portfolioRenderer.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runtime = readFileSync(resolve(root, 'src/templates/portfolioRuntime.js'), 'utf8')
  .replace(/^export\s+function/m, 'function')
  .replace(/<\/script/gi, '<\\/script');

const sample = createSamplePortfolioData();
const groups = [
  { title: '🧸 귀여운 디자인', items: DESIGN_TEMPLATES.filter((t) => t.group === 'cute') },
  { title: '✨ 깔끔한 디자인', items: DESIGN_TEMPLATES.filter((t) => t.group !== 'cute') }
];

const nav = groups
  .map(
    (g) =>
      `<span class="nav-group">${g.title}</span>${g.items
        .map((t) => `<a href="#tpl-${t.id}"><b>${t.num}</b>${escapeHtml(t.name)}</a>`)
        .join('')}`
  )
  .join('');

const sections = groups
  .flatMap((g) => g.items)
  .map(
    (t) => `
<section class="mock" id="tpl-${t.id}">
  <header class="mock-head">
    <h2><span class="num" style="background:${t.colors.accent}">${t.num}</span>${escapeHtml(t.name)}${
      t.group === 'cute' ? ' <span class="cute">귀여운</span>' : ''
    }</h2>
    <p>${escapeHtml(t.description)} <span class="best">이럴 때 좋아요: ${escapeHtml(t.bestFor)}</span></p>
  </header>
  <div class="frame" data-frame>${renderPortfolioHtml({ ...sample, selectedTemplate: t.id })}</div>
</section>`
  )
  .join('\n');

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>포트폴리오 디자인 ${DESIGN_TEMPLATES.length}종 미리보기</title>
<!-- 이 파일은 scripts/build-mockups.mjs 로 자동 생성됩니다. 직접 고치지 말고 렌더러를 고친 뒤 npm run build:mockups 를 실행하세요. -->
${FONT_LINKS_HTML}
<style>${getPortfolioTemplatesCss()}</style>
<style>
body { margin: 0; background: #FFF8F0; color: #3A3247; font-family: 'Noto Sans KR', system-ui, sans-serif; }
.top { position: sticky; top: 0; z-index: 20; background: rgba(255, 255, 255, 0.95); border-bottom: 2px solid #F1E6DA; padding: 12px 16px; }
.top h1 { margin: 0 0 8px; font-family: 'Jua', sans-serif; font-weight: 400; font-size: 22px; }
.top nav { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.top nav a { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 999px; border: 2px solid #F1E6DA; background: #FFF; color: inherit; text-decoration: none; font-size: 13px; font-weight: 700; }
.top nav a b { font-size: 11px; color: #8A8094; }
.nav-group { font-family: 'Jua', sans-serif; font-size: 14px; margin: 0 4px 0 8px; }
.size { margin-left: auto; display: inline-flex; gap: 4px; padding: 3px; border-radius: 12px; background: #FFF8F0; border: 2px solid #F1E6DA; }
.size button { border: 0; background: transparent; padding: 5px 12px; border-radius: 9px; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; color: #8A8094; }
.size button.on { background: #FFF; color: #3A3247; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
main { max-width: 1120px; margin: 0 auto; padding: 16px 16px 80px; }
.mock { margin: 36px 0 56px; scroll-margin-top: 120px; }
.mock-head h2 { display: flex; align-items: center; gap: 10px; margin: 0 0 4px; font-family: 'Jua', sans-serif; font-weight: 400; font-size: 24px; }
.mock-head .num { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; color: #FFF; font-size: 15px; }
.mock-head .cute { padding: 2px 10px; border-radius: 999px; background: #FFF0F2; color: #E85D70; font-size: 14px; }
.mock-head p { margin: 0 0 14px; color: #6B6275; font-size: 14.5px; }
.mock-head .best { display: inline-block; margin-left: 6px; color: #8A8094; }
.frame { margin: 0 auto; max-width: 1080px; box-shadow: 0 12px 30px rgba(58, 50, 71, 0.12); border-radius: 16px; transition: max-width 0.2s ease; }
body.mobile .frame { max-width: 390px; border: 10px solid #3A3247; border-radius: 36px; overflow: hidden; }
body.mobile .frame .pf { border-radius: 0; }
</style>
</head>
<body>
<div class="top">
  <h1>🌱 포트폴리오 디자인 ${DESIGN_TEMPLATES.length}종 미리보기</h1>
  <nav>${nav}
    <span class="size" role="group" aria-label="화면 크기"><button type="button" class="on" data-size="pc">💻 PC</button><button type="button" data-size="mobile">📱 휴대폰</button></span>
  </nav>
</div>
<main>
${sections}
</main>
<script>
${runtime}
document.querySelectorAll('[data-frame]').forEach(function (el) { attachPortfolioInteractions(el); });
document.querySelectorAll('[data-size]').forEach(function (b) {
  b.addEventListener('click', function () {
    document.body.classList.toggle('mobile', b.getAttribute('data-size') === 'mobile');
    document.querySelectorAll('[data-size]').forEach(function (x) { x.classList.toggle('on', x === b); });
  });
});
</script>
</body>
</html>
`;

writeFileSync(resolve(root, 'portfolio_design_mockups.html'), html);
console.log(`portfolio_design_mockups.html 생성 (${Math.round(html.length / 1024)}KB, 시안 ${DESIGN_TEMPLATES.length}종)`);
