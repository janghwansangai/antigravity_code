/**
 * 📖 포트폴리오 보기: 드라이브에서 받은 파일을 브라우저 안에서 펼쳐 '웹페이지 한 장'으로 만듭니다.
 *
 *   - 웹페이지 파일(.html)      → 그대로 (안에 든 큰 사진·동영상은 따로 떼어 빠르게)
 *   - ZIP (HTML + 사진·동영상)  → 안의 index.html(없으면 첫 HTML)을 찾아 사진·동영상·CSS 연결을 복원
 *                                 (포트폴리오 앱의 ZIP뿐 아니라 학생이 직접 만든 HTML 묶음도 가능)
 *   - 프로젝트 파일(.portfolio) → 포트폴리오 앱 렌더러로 다시 그림
 *
 * 결과 HTML은 갤러리와 분리된 샌드박스 iframe(srcdoc)에서만 실행합니다.
 * (학생 HTML의 스크립트가 갤러리·포트폴리오 앱의 저장소에 접근할 수 없음)
 *
 * 큰 파일(동영상·PDF·큰 사진)은 글자(base64)로 바꿔 HTML에 넣으면 수십 MB짜리 HTML이 되어
 * 아주 느려지고 태블릿에서는 멈출 수 있습니다. 그래서 작은 것만 HTML에 넣고, 큰 것은
 * data-gv-src="키" 표시만 남긴 뒤 iframe이 열리면 파일(Blob)째 건네 iframe 안에서 연결합니다.
 */
import JSZip from 'jszip';

/** 이보다 작은 파일은 HTML 안에 바로 넣음 */
const INLINE_MAX = 64 * 1024;

const MIME_BY_EXT = {
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
  mjs: 'text/javascript',
  json: 'application/json',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  ico: 'image/x-icon',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  pdf: 'application/pdf',
  txt: 'text/plain',
  csv: 'text/csv',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf'
};

/** 큰 파일을 따로 건네도 되는 태그 (script·link·iframe 등은 처음부터 있어야 하므로 항상 HTML 안에) */
const DEFERRABLE_TAGS = new Set(['img', 'video', 'audio', 'source', 'track', 'a', 'object', 'embed']);

/** iframe 안에서 건네받은 파일을 연결하는 작은 스크립트 */
const BOOTSTRAP = `<script>(function(){
var ATTRS=['src','href','poster','data'];
function fill(map){
  var q=document.querySelectorAll('[data-gv-src],[data-gv-href],[data-gv-poster],[data-gv-data]');
  for(var i=0;i<q.length;i++){
    for(var j=0;j<ATTRS.length;j++){
      var el=q[i],a=ATTRS[j],k=el.getAttribute('data-gv-'+a);
      if(k===null||!map[k])continue;
      el.setAttribute(a,map[k]);el.removeAttribute('data-gv-'+a);
      if(el.tagName==='SOURCE'&&el.parentNode&&el.parentNode.load)el.parentNode.load();
    }
  }
  var byId={},ids=document.querySelectorAll('[data-pf-id]');
  for(i=0;i<ids.length;i++){var m=ids[i];byId[m.getAttribute('data-pf-id')]=m.tagName==='VIDEO'?m.getAttribute('poster'):m.getAttribute('src');}
  var same=document.querySelectorAll('[data-pf-same]');
  for(i=0;i<same.length;i++){var s=byId[same[i].getAttribute('data-pf-same')];if(s&&same[i].getAttribute('src')!==s)same[i].setAttribute('src',s);}
}
function toUrls(assets,cb){
  var keys=Object.keys(assets),map={},left=keys.length;
  if(!left)return cb(map);
  keys.forEach(function(k){
    var b=assets[k];
    try{map[k]=URL.createObjectURL(b);if(!--left)cb(map);}
    catch(e){var r=new FileReader();r.onload=function(){map[k]=r.result;if(!--left)cb(map);};r.readAsDataURL(b);}
  });
}
var got=false;
window.addEventListener('message',function(e){
  if(got||e.source!==parent||!e.data||e.data.type!=='gv-assets')return;
  got=true;
  toUrls(e.data.assets||{},function(map){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){fill(map);});
    else fill(map);
  });
});
parent.postMessage({type:'gv-ready'},'*');
})();<\/script>`;

const isExternal = (v) => /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(v.trim());

function mimeOf(path) {
  return MIME_BY_EXT[(path.split('.').pop() || '').toLowerCase()] || 'application/octet-stream';
}

/** base 폴더 기준 상대 경로 → ZIP 안 전체 경로 */
function resolvePath(base, rel) {
  let clean = rel.split(/[?#]/)[0];
  try {
    clean = decodeURIComponent(clean);
  } catch {
    /* 이미 풀린 이름 */
  }
  const parts = (clean.startsWith('/') ? clean.slice(1) : `${base}${clean}`).split('/');
  const out = [];
  for (const p of parts) {
    if (!p || p === '.') continue;
    if (p === '..') out.pop();
    else out.push(p);
  }
  return out.join('/');
}

const dirOf = (path) => (path.includes('/') ? path.slice(0, path.lastIndexOf('/') + 1) : '');

async function replaceAsync(text, re, fn) {
  const jobs = [];
  text.replace(re, (...m) => {
    jobs.push(fn(...m));
    return m[0];
  });
  const results = await Promise.all(jobs);
  let i = 0;
  return text.replace(re, () => results[i++]);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** 큰 파일은 키를 받아 두고, 작은 파일은 data 주소로 */
function makeAssetStore() {
  const assets = {};
  let n = 0;
  return {
    assets,
    /** @returns {Promise<{ url?: string, key?: string }>} */
    async ref(blob, { deferrable = true } = {}) {
      if (deferrable && blob.size > INLINE_MAX) {
        const key = `a${++n}`;
        assets[key] = blob;
        return { key };
      }
      return { url: await blobToDataUrl(blob) };
    }
  };
}

const attrHtml = (attr, q, r) => (r.key ? `data-gv-${attr}=${q}${r.key}${q}` : `${attr}=${q}${r.url}${q}`);

/** ZIP 안 HTML의 상대 경로 연결(사진·동영상·CSS·스크립트)을 복원해 한 장으로 만듦 */
async function inlineZipHtml(zip, entry, store) {
  const files = new Map(Object.values(zip.files).filter((f) => !f.dir).map((f) => [f.name, f]));
  // 대소문자가 달라도 찾을 수 있게
  const lower = new Map([...files.keys()].map((k) => [k.toLowerCase(), k]));
  const find = (path) => files.get(path) || files.get(lower.get(path.toLowerCase()));
  const blobs = new Map();
  const blobOf = (path) => {
    if (!blobs.has(path)) {
      const f = find(path);
      blobs.set(path, f ? f.async('arraybuffer').then((b) => new Blob([b], { type: mimeOf(f.name) })) : Promise.resolve(null));
    }
    return blobs.get(path);
  };
  const fixCssUrls = (css, base) =>
    replaceAsync(css, /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, async (m, q, url) => {
      if (isExternal(url)) return m;
      const b = await blobOf(resolvePath(base, url));
      return b ? `url("${(await store.ref(b, { deferrable: false })).url}")` : m;
    });

  const base = dirOf(entry.name);
  let html = await entry.async('string');
  // <link rel="stylesheet" href="style.css"> → <style>…</style>
  html = await replaceAsync(html, /<link\b[^>]*?href\s*=\s*(["'])([^"']+?\.css(?:[?#][^"']*)?)\1[^>]*>/gi, async (m, q, href) => {
    if (isExternal(href) || !/stylesheet/i.test(m)) return m;
    const path = resolvePath(base, href);
    const f = find(path);
    if (!f) return m;
    const css = await fixCssUrls(await f.async('string'), dirOf(path));
    return `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`;
  });
  // <style> 안 url()
  html = await replaceAsync(html, /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, async (m, a, css, b) => `${a}${await fixCssUrls(css, base)}${b}`);
  // 태그의 src·href·poster·data 속성
  html = await replaceAsync(html, /<([a-zA-Z][\w-]*)(\s[^>]*)>/g, async (tag, name, attrs) => {
    if (!/\s(?:src|href|poster|data)\s*=/i.test(attrs)) return tag;
    const deferrable = DEFERRABLE_TAGS.has(name.toLowerCase());
    const fixed = await replaceAsync(attrs, /(\s)(src|href|poster|data)(\s*=\s*)(["'])([^"']*)\4/gi, async (m, sp, attr, eq, q, val) => {
      if (!val || isExternal(val)) return m;
      const b = await blobOf(resolvePath(base, val));
      if (!b) return m;
      return `${sp}${attrHtml(attr.toLowerCase(), q, await store.ref(b, { deferrable }))}`;
    });
    return `<${name}${fixed}>`;
  });
  return html;
}

/** 이미 data 주소로 다 들어 있는 웹페이지: 큰 것만 떼어 내 HTML을 가볍게 */
function extractBigDataUrls(html, store) {
  return html.replace(/(\s)(src|href|poster)=(["'])data:([\w.+/-]+);base64,([A-Za-z0-9+/=\s]+)\3/g, (m, sp, attr, q, mime, b64) => {
    if (b64.length * 0.75 <= INLINE_MAX) return m;
    try {
      const bin = atob(b64.replace(/\s+/g, ''));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const key = `d${Object.keys(store.assets).length + 1}`;
      store.assets[key] = new Blob([bytes], { type: mime });
      return `${sp}data-gv-${attr}=${q}${key}${q}`;
    } catch {
      return m;
    }
  });
}

function pickHtmlEntry(zip) {
  const htmls = Object.values(zip.files).filter((f) => !f.dir && /\.html?$/i.test(f.name) && !/(^|\/)__MACOSX\//.test(f.name));
  if (!htmls.length) return null;
  const depth = (f) => f.name.split('/').length;
  const index = htmls.filter((f) => /(^|\/)index\.html?$/i.test(f.name)).sort((a, b) => depth(a) - depth(b))[0];
  return index || htmls.sort((a, b) => depth(a) - depth(b))[0];
}

/** 프로젝트 파일(.portfolio): 포트폴리오 앱 렌더러로 다시 그림 */
async function renderProject(bytes, store) {
  const [{ readProjectFile }, { normalizeState }, { buildStandaloneHtml }, { walkMedia }] = await Promise.all([
    import('../project/projectFile.js'),
    import('../state/store.js'),
    import('../export/htmlExporter.js'),
    import('../media/model.js')
  ]);
  const state = normalizeState(await readProjectFile(new Blob([bytes], { type: 'application/zip' })));
  const assetMap = {};
  const jobs = [];
  walkMedia(state, (m) => {
    if (m.blob) {
      jobs.push(
        store.ref(m.blob).then((r) => {
          assetMap[m.id] = r.key ? `gv-asset:${r.key}` : r.url;
        })
      );
    } else if (m.dataUrl) assetMap[m.id] = m.dataUrl;
  });
  await Promise.all(jobs);
  return buildStandaloneHtml(state, { assetMap }).replace(/(\s)(src|href|poster)="gv-asset:(\w+)"/g, '$1data-gv-$2="$3"');
}

function withBootstrap(html) {
  if (/<head\b[^>]*>/i.test(html)) return html.replace(/<head\b[^>]*>/i, (m) => `${m}${BOOTSTRAP}`);
  if (/<html\b[^>]*>/i.test(html)) return html.replace(/<html\b[^>]*>/i, (m) => `${m}<head>${BOOTSTRAP}</head>`);
  return `${BOOTSTRAP}${html}`;
}

/**
 * @param {Uint8Array} bytes
 * @returns {Promise<{ html: string, assets: Record<string, Blob> }>}
 *   html: 샌드박스 iframe에 넣을 HTML, assets: iframe이 'gv-ready'를 보내면 건넬 큰 파일들
 */
export async function buildViewHtml(bytes) {
  const store = makeAssetStore();
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  let html;
  if (!isZip) {
    html = extractBigDataUrls(new TextDecoder('utf-8').decode(bytes), store);
  } else {
    const zip = await JSZip.loadAsync(bytes);
    const entry = pickHtmlEntry(zip);
    if (entry) html = await inlineZipHtml(zip, entry, store);
    else if (zip.file('project.json')) html = await renderProject(bytes, store);
    else throw new Error('ZIP 안에서 웹페이지(.html)를 찾지 못했어요.');
  }
  return { html: withBootstrap(html), assets: store.assets };
}

/**
 * 앱에서 공유한 PDF(쪽마다 JPEG 한 장)는 pdf.js 없이 JPEG를 바로 꺼냄 → 아주 빠름
 * 다른 PDF면 빈 배열(그때는 pdf.js로 그림)
 * @param {Uint8Array} bytes
 * @returns {Blob[]}
 */
export function extractJpegPages(bytes) {
  const text = new TextDecoder('latin1').decode(bytes); // 1바이트 = 1글자라 위치가 그대로 맞음
  if (!text.includes('/Producer (Portfolio Maker)')) return [];
  const re = /\/Subtype \/Image \/Width \d+ \/Height \d+ \/ColorSpace \/DeviceRGB \/BitsPerComponent 8 \/Filter \/DCTDecode \/Length (\d+) >>\nstream\n/g;
  const pages = [];
  let m;
  while ((m = re.exec(text))) {
    const start = m.index + m[0].length;
    const len = Number(m[1]);
    if (start + len > bytes.length) return [];
    pages.push(new Blob([bytes.subarray(start, start + len)], { type: 'image/jpeg' }));
    re.lastIndex = start + len;
  }
  return pages;
}
