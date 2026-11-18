/**
 * 갤러리 서버(구글 Apps Script 웹 앱)와 주고받기
 *
 * - 목록:   GET  ?action=list                                      → { ok, version, title, needCode, open, canUpload, items: [...] }
 * - 썸네일: GET  ?action=thumbs&ids=a,b                            → { ok, thumbs: { a: 'data:image/jpeg;base64,…' } }
 * - 보기:   GET  ?action=file&item=<작품 번호>&start=<위치>         → { ok, name, type, size, start, data(base64) }
 * - 링크 올리기: POST { action:'add', name, title, link, desc, code } → { ok, id, token, warning, fileType }
 * - 파일 올리기: POST { action:'upload', …, data }  (작은 파일 한 번에)
 *               POST { action:'uploadStart', … } → { uploadId } → POST { action:'uploadChunk', uploadId, start, data } …
 *               → 마지막에 { ok, id, token, link, fileType }
 * - 지우기: POST { action:'delete', id, token }                    → { ok }
 * - 댓글:   POST { action:'comment', item, name, text, code }       → { ok, comment, token }
 *           POST { action:'deleteComment', id, token }              → { ok }
 * - 선생님: POST { action:'admin', key, op:'check'|'deleteItem'|'deleteComment', id } → { ok }
 *
 * POST는 'text/plain'으로 보내 브라우저의 사전 확인(CORS preflight) 없이 Apps Script에 바로 닿게 합니다.
 * GET은 fetch가 막히는 환경을 위해 JSONP(<script>) 방식으로 한 번 더 시도합니다.
 */

const TIMEOUT_MS = 20000;
const SINGLE_UPLOAD_MAX = 5 * 1024 * 1024; // 서버 한도(6MB)보다 조금 작게
const VIEW_PARALLEL = 2; // 보기: 동시에 받을 조각 수 (Apps Script 동시 실행 한도를 생각해 2)

/** Apps Script 웹 앱 주소인지(또는 시험용 주소) 대략 확인 */
export function looksLikeScriptUrl(url) {
  try {
    const u = new URL(String(url).trim());
    if (u.protocol !== 'https:' && !/^(localhost|127\.0\.0\.1)$/.test(u.hostname)) return false;
    if (/script\.google\.com$/.test(u.hostname)) return /\/macros\/s\/[\w-]+\/exec$/.test(u.pathname);
    return true;
  } catch {
    return false;
  }
}

/**
 * 학생이 붙여 넣은 갤러리 주소(…/gallery.html#s=… 또는 웹 앱 주소 그대로) → 웹 앱 주소
 * @returns {string} 알아볼 수 없으면 ''
 */
export function parseGalleryAddress(text) {
  const s = String(text || '').trim();
  if (!s) return '';
  try {
    const u = new URL(s);
    const hash = new URLSearchParams(u.hash.slice(1)).get('s');
    if (hash && looksLikeScriptUrl(hash)) return hash;
    if (/script\.google\.com$/.test(u.hostname) && looksLikeScriptUrl(`${u.origin}${u.pathname}`)) return `${u.origin}${u.pathname}`;
  } catch {
    return '';
  }
  return '';
}

function withTimeout(promise, ms = TIMEOUT_MS) {
  let t;
  return Promise.race([promise, new Promise((_, rej) => (t = setTimeout(() => rej(new Error('timeout')), ms)))]).finally(() => clearTimeout(t));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cb = `__galleryCb${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const s = document.createElement('script');
    const done = (fn, v) => {
      delete window[cb];
      s.remove();
      fn(v);
    };
    window[cb] = (data) => done(resolve, data);
    s.onerror = () => done(reject, new Error('jsonp failed'));
    s.src = `${url}${url.includes('?') ? '&' : '?'}callback=${cb}&_=${Date.now()}`;
    document.head.appendChild(s);
  });
}

const withParams = (scriptUrl, params) => `${scriptUrl}${scriptUrl.includes('?') ? '&' : '?'}${new URLSearchParams(params)}`;

async function getJson(url, ms = TIMEOUT_MS) {
  try {
    const res = await withTimeout(fetch(`${url}&_=${Date.now()}`, { method: 'GET', redirect: 'follow', cache: 'no-store' }), ms);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return withTimeout(jsonp(url), ms);
  }
}

export function fetchGallery(scriptUrl) {
  return getJson(withParams(scriptUrl, { action: 'list' }));
}

/** 카드 썸네일(앱에서 공유한 작품) */
export async function fetchThumbs(scriptUrl, ids) {
  const out = {};
  for (let i = 0; i < ids.length; i += 40) {
    const r = await getJson(withParams(scriptUrl, { action: 'thumbs', ids: ids.slice(i, i + 40).join(',') }), 30000).catch(() => null);
    if (r?.ok) Object.assign(out, r.thumbs);
  }
  return out;
}

async function post(scriptUrl, payload, ms = TIMEOUT_MS) {
  const res = await withTimeout(
    fetch(scriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }),
    ms
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function addItem(scriptUrl, item) {
  return post(scriptUrl, { action: 'add', ...item });
}

export function deleteItem(scriptUrl, id, token) {
  return post(scriptUrl, { action: 'delete', id, token });
}

/* ---------------- 💬 댓글 · 🔑 선생님 (서버 버전 4) ---------------- */
export function addComment(scriptUrl, { item, name, text, code }) {
  return post(scriptUrl, { action: 'comment', item, name, text, code });
}

export function deleteComment(scriptUrl, id, token) {
  return post(scriptUrl, { action: 'deleteComment', id, token });
}

/** op: 'check' | 'deleteItem' | 'deleteComment' */
export function adminCall(scriptUrl, key, op, id = '') {
  return post(scriptUrl, { action: 'admin', key, op, id });
}

/** Blob → base64 (data: 앞부분 뺀 것) */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).replace(/^data:[^,]*,/, ''));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** 실패하면 조금 쉬었다가 다시 (학생이 많아 Apps Script가 바쁠 때 대비) */
async function retry(fn, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fn();
      if (r?.ok || r?.error) return r; // 서버가 거절한 이유는 그대로 돌려줌
      last = new Error('bad response');
    } catch (err) {
      last = err;
    }
    await sleep(800 * (i + 1) + Math.random() * 600);
  }
  throw last;
}

/**
 * 파일을 선생님 드라이브 '작품 폴더'에 올리고 갤러리에 등록
 * @param {string} scriptUrl
 * @param {{ blob: Blob, fileName: string, name: string, title: string, desc?: string, code?: string, thumb?: string, replaceId?: string, replaceToken?: string }} item
 * @param {(sent:number,total:number)=>void} onProgress
 * @returns {Promise<{ ok, id, token, link, fileType, error?, field? }>}
 */
export async function uploadFile(scriptUrl, item, onProgress = () => {}) {
  const { blob, ...meta } = item;
  const info = { ...meta, mimeType: blob.type || 'application/octet-stream', size: blob.size };
  onProgress(0, blob.size);
  if (blob.size <= SINGLE_UPLOAD_MAX) {
    const data = await blobToBase64(blob);
    const r = await post(scriptUrl, { action: 'upload', ...info, data }, 120000);
    if (r?.ok) onProgress(blob.size, blob.size);
    return r;
  }
  const start = await retry(() => post(scriptUrl, { action: 'uploadStart', ...info }, 60000));
  if (!start?.ok) return start;
  const chunk = start.chunkSize || 4 * 1024 * 1024;
  let pos = 0;
  for (;;) {
    const data = await blobToBase64(blob.slice(pos, pos + chunk));
    const at = pos;
    const r = await retry(() => post(scriptUrl, { action: 'uploadChunk', uploadId: start.uploadId, start: at, data }, 120000));
    if (!r?.ok) return r;
    if (r.done !== false) {
      onProgress(blob.size, blob.size);
      return r;
    }
    pos = Number(r.next) || at + chunk;
    onProgress(Math.min(pos, blob.size), blob.size);
  }
}

/* ---------------- 📖 보기용 파일 받기 ---------------- */
const FILE_CACHE = 'gallery-files-v1';
const FILE_CACHE_MAX = 8; // 최근 본 작품 8개까지 이 기기에 기억 (다시 열면 바로)

const cacheKey = (scriptUrl, itemId, size) => `https://gallery-cache.local/${encodeURIComponent(scriptUrl)}/${encodeURIComponent(itemId)}/${size}`;

async function readCached(scriptUrl, itemId) {
  try {
    const cache = await caches.open(FILE_CACHE);
    const keys = await cache.keys();
    const prefix = cacheKey(scriptUrl, itemId, '');
    const hit = keys.find((k) => k.url.startsWith(prefix));
    if (!hit) return null;
    const res = await cache.match(hit);
    return res ? { name: res.headers.get('x-name') || '', type: res.headers.get('x-type') || '', bytes: new Uint8Array(await res.arrayBuffer()), url: hit.url } : null;
  } catch {
    return null;
  }
}

async function writeCached(scriptUrl, itemId, file) {
  try {
    const cache = await caches.open(FILE_CACHE);
    const old = await cache.keys();
    const prefix = cacheKey(scriptUrl, itemId, '');
    for (const k of old) if (k.url.startsWith(prefix)) await cache.delete(k);
    const rest = old.filter((k) => !k.url.startsWith(prefix));
    for (const k of rest.slice(0, Math.max(0, rest.length - (FILE_CACHE_MAX - 1)))) await cache.delete(k);
    await cache.put(
      cacheKey(scriptUrl, itemId, file.bytes.length),
      new Response(file.bytes, { headers: { 'x-name': encodeURIComponent(file.name), 'x-type': file.type } })
    );
  } catch {
    /* 기억 못 해도 괜찮음 */
  }
}

/**
 * 갤러리 작품(itemId)의 드라이브 파일을 Apps Script가 4MB씩 나눠 보내면 이어 붙입니다.
 * 첫 조각으로 크기를 알면 나머지는 2개씩 동시에 받고, 실패한 조각은 다시 받습니다.
 * 한 번 본 작품은 이 기기에 기억해 두었다가 크기가 같으면 바로 엽니다.
 * @param {{ size?: number }} hint 목록에 적힌 파일 크기(같으면 기억해 둔 것을 씀)
 * @returns {Promise<{ name, type, bytes: Uint8Array, cached?: boolean }>}
 */
export async function fetchFileBytes(scriptUrl, itemId, onProgress = () => {}, hint = {}) {
  const cached = await readCached(scriptUrl, itemId);
  if (cached && (!hint.size || cached.bytes.length === hint.size)) {
    onProgress(cached.bytes.length, cached.bytes.length);
    return { name: decodeURIComponent(cached.name), type: cached.type, bytes: cached.bytes, cached: true };
  }
  const getChunk = (start) =>
    retry(() => getJson(withParams(scriptUrl, { action: 'file', item: itemId, start }), 90000)).then((r) => {
      if (!r?.ok) throw new Error(r?.error || '파일을 받지 못했어요.');
      return r;
    });
  const decodeInto = (out, at, b64) => {
    const bin = atob(b64 || '');
    for (let i = 0; i < bin.length; i++) out[at + i] = bin.charCodeAt(i);
    return bin.length;
  };

  const first = await getChunk(0);
  const size = first.size;
  const out = new Uint8Array(size);
  let done = decodeInto(out, 0, first.data);
  onProgress(done, size);
  const chunk = done;
  if (done < size) {
    if (!chunk) throw new Error('파일을 받지 못했어요.');
    const starts = [];
    for (let s = chunk; s < size; s += chunk) starts.push(s);
    let next = 0;
    const worker = async () => {
      while (next < starts.length) {
        const at = starts[next++];
        const r = await getChunk(at);
        const n = decodeInto(out, at, r.data);
        if (!n) throw new Error('파일을 받다가 끊겼어요.');
        done += n;
        onProgress(Math.min(done, size), size);
      }
    };
    await Promise.all(Array.from({ length: Math.min(VIEW_PARALLEL, starts.length) }, worker));
  }
  if (done < size) throw new Error('파일을 끝까지 받지 못했어요.');
  const file = { name: first.name, type: first.type, bytes: out };
  writeCached(scriptUrl, itemId, file);
  return file;
}
