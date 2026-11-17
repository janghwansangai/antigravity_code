/**
 * 갤러리 서버(구글 Apps Script 웹 앱)와 주고받기
 *
 * - 목록: GET <웹 앱 주소>          → { ok, title, needCode, open, items: [{ id, time, name, title, link, desc, fileType }] }
 * - 올리기: POST { action:'add', name, title, link, desc, code } → { ok, id, token, warning, fileType }
 * - 지우기: POST { action:'delete', id, token }                    → { ok }
 * - 보기:   GET  ?action=file&item=<작품 번호>&start=<위치>        → { ok, name, type, size, start, data(base64) }
 *
 * POST는 'text/plain'으로 보내 브라우저의 사전 확인(CORS preflight) 없이 Apps Script에 바로 닿게 합니다.
 * 목록은 fetch가 막히는 환경을 위해 JSONP(<script>) 방식으로 한 번 더 시도합니다.
 */

const TIMEOUT_MS = 20000;

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

function withTimeout(promise, ms = TIMEOUT_MS) {
  let t;
  return Promise.race([promise, new Promise((_, rej) => (t = setTimeout(() => rej(new Error('timeout')), ms)))]).finally(() => clearTimeout(t));
}

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

export async function fetchGallery(scriptUrl) {
  const url = `${scriptUrl}${scriptUrl.includes('?') ? '&' : '?'}action=list&_=${Date.now()}`;
  try {
    const res = await withTimeout(fetch(url, { method: 'GET', redirect: 'follow', cache: 'no-store' }));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return withTimeout(jsonp(`${scriptUrl}${scriptUrl.includes('?') ? '&' : '?'}action=list`));
  }
}

async function post(scriptUrl, payload) {
  const res = await withTimeout(
    fetch(scriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    })
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

/**
 * 📖 보기용 파일 받기: 갤러리 작품(itemId)의 드라이브 파일을 Apps Script가 4MB씩 나눠 보내면 이어 붙입니다.
 * @returns {Promise<{ name, type, bytes: Uint8Array }>}
 */
export async function fetchFileBytes(scriptUrl, itemId, onProgress = () => {}) {
  const sep = scriptUrl.includes('?') ? '&' : '?';
  const getChunk = async (start) => {
    const url = `${scriptUrl}${sep}action=file&item=${encodeURIComponent(itemId)}&start=${start}`;
    try {
      const res = await withTimeout(fetch(`${url}&_=${Date.now()}`, { redirect: 'follow', cache: 'no-store' }), 60000);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return withTimeout(jsonp(url), 60000);
    }
  };
  const first = await getChunk(0);
  if (!first?.ok) throw new Error(first?.error || '파일을 받지 못했어요.');
  const size = first.size;
  const out = new Uint8Array(size);
  let pos = 0;
  let chunk = first;
  for (;;) {
    const bin = atob(chunk.data || '');
    for (let i = 0; i < bin.length; i++) out[pos + i] = bin.charCodeAt(i);
    pos += bin.length;
    onProgress(pos, size);
    if (pos >= size || !bin.length) break;
    chunk = await getChunk(pos);
    if (!chunk?.ok) throw new Error(chunk?.error || '파일을 받다가 끊겼어요.');
  }
  if (pos < size) throw new Error('파일을 끝까지 받지 못했어요.');
  return { name: first.name, type: first.type, bytes: out };
}
