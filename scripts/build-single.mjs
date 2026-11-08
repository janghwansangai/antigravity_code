/**
 * 설치 없이 두 번 눌러 바로 여는 단일 파일 버전 만들기: student_portfolio_webapp.html
 *
 *   npm run build:single
 *
 * Vite로 앱을 빌드한 뒤 CSS·JS를 HTML 한 파일 안에 넣습니다.
 * 앱(src/)과 같은 코드라서 기능이 어긋나지 않습니다.
 */
import { build } from 'vite';
import { readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'dist-single');

await build({
  root,
  logLevel: 'warn',
  build: {
    outDir,
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    modulePreload: { polyfill: false }
  }
});

let html = readFileSync(join(outDir, 'index.html'), 'utf8');
const assetsDir = join(outDir, 'assets');
const files = readdirSync(assetsDir);

for (const file of files.filter((f) => f.endsWith('.css'))) {
  const css = readFileSync(join(assetsDir, file), 'utf8');
  const tag = new RegExp(`<link[^>]+href="[^"]*${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`);
  html = html.replace(tag, () => `<style>\n${css}\n</style>`);
}

for (const file of files.filter((f) => f.endsWith('.js'))) {
  // HTML 안에 넣을 때 '</script'가 스크립트를 끝내 버리지 않도록 바꿉니다.
  const js = readFileSync(join(assetsDir, file), 'utf8').replace(/<\/script/gi, '<\\/script');
  const tag = new RegExp(`<script[^>]+src="[^"]*${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*></script>`);
  html = html.replace(tag, () => `<script type="module">\n${js}\n</script>`);
}

if (/src="\.?\/?assets\//.test(html) || /href="\.?\/?assets\//.test(html)) {
  throw new Error('인라인하지 못한 파일이 남아 있습니다: ' + html.match(/(src|href)="[^"]*assets\/[^"]*"/g));
}

html = html.replace(
  '<head>',
  '<head>\n  <!-- 이 파일은 scripts/build-single.mjs 로 자동 생성됩니다. 직접 고치지 말고 src/ 를 고친 뒤 npm run build:single 을 실행하세요. -->'
);

writeFileSync(resolve(root, 'student_portfolio_webapp.html'), html);
rmSync(outDir, { recursive: true, force: true });
console.log(`student_portfolio_webapp.html 생성 (${Math.round(html.length / 1024)}KB)`);
