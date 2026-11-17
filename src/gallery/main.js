/**
 * 우리 반 작품 갤러리 (gallery.html)
 *
 * 학생들이 학급 구글 드라이브에 올린 작품의 '공유 링크'를 모아 카드로 보여 줍니다.
 * 링크 목록은 선생님 구글 시트(Apps Script 웹 앱)에 쌓이고, 학생들은 언제든 새 링크를 올릴 수 있습니다.
 *
 * 주소 형식: gallery.html#s=<Apps Script 웹 앱 주소>
 *   - #s 가 없으면 선생님용 '갤러리 만들기' 안내 화면을 보여 줍니다.
 */
import '../style.css';
import './gallery.css';
import qrcode from 'qrcode-generator';
import appsScriptSource from '../../apps-script/Code.gs?raw';
import { addItem, deleteItem, fetchFileBytes, fetchGallery, looksLikeScriptUrl } from './api.js';
import { isValidLink, parseLink } from './links.js';

const root = document.getElementById('gallery-app');
const $ = (sel) => root.querySelector(sel);
const REFRESH_MS = 60000;
/** 📖 갤러리 안에서 바로 펼쳐 볼 수 있는 파일 (ZIP·웹페이지·프로젝트 파일) */
const VIEWABLE = new Set(['zip', 'portfolio', 'html']);

const esc = (s = '') =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/* ---------------- 브라우저에 기억해 두는 것 (실패해도 동작) ---------------- */
const mem = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* 저장 못 해도 괜찮음 */
    }
  }
};

const state = {
  scriptUrl: '',
  data: null, // { title, needCode, open, items }
  error: '',
  loading: false,
  search: '',
  onlyMine: false
};

function scriptFromHash() {
  const params = new URLSearchParams(location.hash.slice(1));
  const s = params.get('s');
  return s && looksLikeScriptUrl(s) ? s : '';
}

export function galleryLink(scriptUrl) {
  return `${location.origin}${location.pathname}#s=${encodeURIComponent(scriptUrl)}`;
}

const mineKey = () => `gallery:mine:${state.scriptUrl}`;
const myPosts = () => mem.get(mineKey(), {});

/* ---------------- 공통 조각 ---------------- */
let toastTimer;
function toast(msg, ms = 3500) {
  const el = $('#g-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

function qrSvg(text) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
}

function relTime(iso) {
  const t = Date.parse(iso);
  if (!t) return '';
  const diff = (t - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat('ko', { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 60) return '방금';
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day');
  return new Date(t).toLocaleDateString('ko-KR');
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

/** 이 브라우저에서 만든 포트폴리오의 이름·제목(올리기 칸 미리 채우기용) */
async function myPortfolioInfo() {
  try {
    if (indexedDB.databases) {
      const dbs = await indexedDB.databases();
      if (!dbs.some((d) => d.name === 'StudentPortfolioBuilderDB_v2')) return {};
    }
    const db = await new Promise((res, rej) => {
      const q = indexedDB.open('StudentPortfolioBuilderDB_v2');
      q.onsuccess = () => res(q.result);
      q.onerror = () => rej(q.error);
    });
    if (!db.objectStoreNames.contains('portfolioState')) return {};
    const index = await new Promise((res) => {
      const q = db.transaction('portfolioState').objectStore('portfolioState').get('index');
      q.onsuccess = () => res(q.result);
      q.onerror = () => res(null);
    });
    db.close();
    const cur = index?.items?.find((x) => x.id === index.currentId);
    return cur && !cur.isSample ? { name: cur.studentName || '', title: cur.portfolioTitle || '' } : {};
  } catch {
    return {};
  }
}

/* ================================================================== */
/* 1) 선생님용: 갤러리 만들기                                            */
/* ================================================================== */
function renderSetup() {
  document.title = '우리 반 작품 갤러리 만들기';
  root.innerHTML = `
    <header class="g-top">
      <a class="g-brand" href="./index.html"><span class="brand-logo" aria-hidden="true">🌈</span><span>우리 반 작품 갤러리</span></a>
    </header>
    <main class="g-setup">
      <h1 class="g-h1">갤러리 만들기 <small>선생님용 · 10분</small></h1>
      <p class="pane-hint">학생들이 <b>학급 구글 드라이브</b>에 작품을 올리고 <b>공유 링크</b>를 붙여 넣으면, 이 갤러리에 카드로 모여요. 링크 목록은 선생님 <b>구글 시트</b>에 쌓여서 시트에서 바로 숨기거나 지울 수 있어요. 서버·비용 없이 무료예요.</p>

      <ol class="g-steps">
        <li>
          <b>구글 시트를 새로 만들어요.</b>
          <p>링크를 모아 둘 곳이에요. 이름은 ‘우리 반 작품 갤러리’처럼 정하세요.</p>
          <a class="btn btn-sm" href="https://sheets.new" target="_blank" rel="noopener">📈 새 구글 시트 열기 ↗</a>
        </li>
        <li>
          <b>시트 메뉴 → 확장 프로그램 → Apps Script</b>를 누르고, 들어 있는 코드를 모두 지운 뒤 아래 코드를 붙여 넣고 💾 저장해요.
          <div class="g-code-actions">
            <button type="button" class="btn btn-primary btn-sm" data-g="copy-code">📋 코드 복사</button>
            <a class="btn btn-sm" href="https://github.com/janghwansangai/antigravity_code/blob/main/apps-script/Code.gs" target="_blank" rel="noopener">코드 원문 보기 ↗</a>
          </div>
          <details class="more"><summary>코드 미리 보기</summary><pre class="g-code">${esc(appsScriptSource)}</pre></details>
        </li>
        <li>
          <b>오른쪽 위 ‘배포’ → ‘새 배포’</b> → 톱니바퀴에서 <b>웹 앱</b>을 고르고
          <ul>
            <li>실행 사용자: <b>나</b></li>
            <li>액세스 권한이 있는 사용자: <b>모든 사용자</b></li>
          </ul>
          → ‘배포’ → 권한 허용 → 나오는 <b>웹 앱 URL</b>을 복사해요.
          <p class="small muted">학교 계정에서 ‘모든 사용자’가 보이지 않으면 학교 관리자가 막아 둔 것이에요. 개인 구글 계정으로 시트를 만들면 됩니다.</p>
        </li>
        <li>
          <b>웹 앱 URL을 붙여 넣고 연결을 확인해요.</b>
          <div class="g-row">
            <input class="input" id="g-script-url" type="url" placeholder="https://script.google.com/macros/s/…/exec" />
            <button type="button" class="btn btn-primary" data-g="check">연결 확인</button>
          </div>
          <p class="g-check-msg" id="g-check-msg" role="status"></p>
        </li>
      </ol>
      <div id="g-setup-result"></div>

      <div class="g-tips">
        <h2>설정 바꾸기 (시트의 ‘설정’ 탭)</h2>
        <ul>
          <li><b>갤러리 제목</b>: 갤러리 맨 위에 보이는 이름</li>
          <li><b>학급 코드</b>: 적어 두면 코드를 아는 학생만 올릴 수 있어요(낯선 사람이 올리는 것 방지)</li>
          <li><b>올리기 허용</b>: FALSE로 바꾸면 올리기를 잠시 닫아요</li>
          <li>작품 줄을 지우거나 ‘숨김’ 칸에 TRUE를 적으면 갤러리에서 사라져요</li>
        </ul>
      </div>
    </main>
    <div class="toast" id="g-toast" role="status" aria-live="polite"></div>`;
}

async function checkConnection() {
  const input = $('#g-script-url');
  const msg = $('#g-check-msg');
  const url = input.value.trim();
  if (!looksLikeScriptUrl(url)) {
    msg.textContent = '⚠️ 웹 앱 URL이 아니에요. https://script.google.com/macros/s/…/exec 모양인지 확인해 주세요.';
    msg.className = 'g-check-msg is-error';
    return;
  }
  msg.textContent = '확인하는 중…';
  msg.className = 'g-check-msg';
  try {
    const data = await fetchGallery(url);
    if (!data?.ok) throw new Error(data?.error || 'bad');
    const link = galleryLink(url);
    mem.set('gallery:last', link);
    msg.textContent = `✅ 연결됐어요! ‘${data.title}’ · 작품 ${data.items.length}개`;
    msg.className = 'g-check-msg is-ok';
    $('#g-setup-result').innerHTML = `
      <section class="g-share">
        <h2>🎉 학생들에게 이 주소를 알려 주세요</h2>
        <div class="g-qr">${qrSvg(link)}</div>
        <div class="g-row"><input class="input" readonly value="${esc(link)}" id="g-link" /><button type="button" class="btn" data-g="copy-link">주소 복사</button></div>
        <a class="btn btn-primary btn-lg btn-block" href="${esc(link)}">갤러리 열기 →</a>
      </section>`;
  } catch {
    msg.textContent =
      '⚠️ 연결하지 못했어요. ① 액세스 권한이 ‘모든 사용자’인지 ② 코드를 고친 뒤 ‘새 배포’를 했는지 ③ 주소 끝이 /exec 인지 확인해 주세요.';
    msg.className = 'g-check-msg is-error';
  }
}

/* ================================================================== */
/* 2) 갤러리                                                           */
/* ================================================================== */
function renderGalleryShell() {
  root.innerHTML = `
    <header class="g-top">
      <a class="g-brand" href="./index.html" title="포트폴리오 만들기로"><span class="brand-logo" aria-hidden="true">🌈</span><span id="g-title">우리 반 작품 갤러리</span></a>
      <span class="g-count" id="g-count"></span>
      <div class="g-top-actions">
        <button type="button" class="btn btn-sm" data-g="refresh" title="새로 고침">🔄</button>
        <button type="button" class="btn btn-sm" data-g="qr">📱 QR</button>
        <button type="button" class="btn btn-primary" data-g="open-add">＋ 내 작품 올리기</button>
      </div>
    </header>
    <main class="g-main">
      <div class="g-tools">
        <input class="input" type="search" id="g-search" placeholder="🔍 이름이나 제목으로 찾기" />
        <label class="g-mine"><input type="checkbox" id="g-only-mine" /> 내가 올린 것만</label>
      </div>
      <div id="g-status" class="g-status" role="status"></div>
      <div class="g-grid" id="g-grid"></div>
    </main>
    <div class="modal" id="g-modal" hidden></div>
    <div class="toast" id="g-toast" role="status" aria-live="polite"></div>`;
  // 드라이브 썸네일을 볼 권한이 없으면 아이콘으로 대신
  $('#g-grid').addEventListener(
    'error',
    (e) => {
      if (e.target.tagName === 'IMG') e.target.closest('.g-thumb')?.classList.add('no-thumb');
    },
    true
  );
}

function filteredItems() {
  const items = state.data?.items || [];
  const mine = myPosts();
  const q = state.search.trim().toLowerCase();
  return items.filter((it) => (!state.onlyMine || mine[it.id]) && (!q || `${it.name} ${it.title} ${it.desc}`.toLowerCase().includes(q)));
}

function cardHtml(it, mine) {
  const info = parseLink(it.link);
  const viewable = VIEWABLE.has(it.fileType);
  if (viewable) Object.assign(info, { icon: it.fileType === 'html' ? '🌐' : '📖', label: it.fileType === 'html' ? '웹페이지' : '포트폴리오' });
  const thumb = info.thumb && !viewable
    ? `<img src="${esc(info.thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer" />`
    : '';
  return `
    <article class="g-card">
      <button type="button" class="g-thumb${info.thumb && !VIEWABLE.has(it.fileType) ? '' : ' no-thumb'}" data-g="${VIEWABLE.has(it.fileType) ? 'view' : 'preview'}" data-id="${esc(it.id)}" aria-label="${esc(it.title)} ${VIEWABLE.has(it.fileType) ? '보기' : '미리 보기'}">
        ${thumb}<span class="g-icon" aria-hidden="true">${info.icon}</span>
        <span class="g-kind">${info.icon} ${esc(info.label)}</span>
      </button>
      <div class="g-body">
        <h3 class="g-card-title">${esc(it.title)}</h3>
        <p class="g-by">🙂 ${esc(it.name)} · <time datetime="${esc(it.time)}">${esc(relTime(it.time))}</time></p>
        ${it.desc ? `<p class="g-desc">${esc(it.desc)}</p>` : ''}
        <div class="g-actions">
          ${VIEWABLE.has(it.fileType) ? `<button type="button" class="btn btn-primary btn-sm" data-g="view" data-id="${esc(it.id)}">📖 포트폴리오 보기</button>` : ''}
          <a class="btn btn-sm" href="${esc(info.open)}" target="_blank" rel="noopener noreferrer">열기 ↗</a>
          ${mine[it.id] ? `<button type="button" class="btn btn-sm btn-danger-text" data-g="delete" data-id="${esc(it.id)}">지우기</button><span class="g-mine-badge">내가 올림</span>` : ''}
        </div>
      </div>
    </article>`;
}

function renderGrid() {
  if (!state.data) return;
  const title = state.data.title || '우리 반 작품 갤러리';
  document.title = title;
  $('#g-title').textContent = title;
  $('#g-count').textContent = `작품 ${state.data.items.length}개`;
  const items = filteredItems();
  const mine = myPosts();
  $('#g-grid').innerHTML = items.length
    ? items.map((it) => cardHtml(it, mine)).join('')
    : `<div class="empty"><div class="empty-icon" aria-hidden="true">${state.data.items.length ? '🔍' : '🐣'}</div><p><b>${
        state.data.items.length ? '찾는 작품이 없어요' : '아직 올라온 작품이 없어요'
      }</b><br />${state.data.items.length ? '다른 낱말로 찾아보세요.' : '‘＋ 내 작품 올리기’로 첫 작품을 올려 보세요!'}</p></div>`;
}

async function load({ quiet = false } = {}) {
  if (state.loading) return;
  state.loading = true;
  if (!quiet) $('#g-status').textContent = '작품을 불러오는 중…';
  try {
    const data = await fetchGallery(state.scriptUrl);
    if (!data?.ok) throw new Error(data?.error || '목록을 받지 못했어요.');
    state.data = data;
    state.error = '';
    $('#g-status').textContent = '';
    // 다른 기기에서 지워진 내 작품은 기억에서도 정리
    const mine = myPosts();
    const ids = new Set(data.items.map((x) => x.id));
    const kept = Object.fromEntries(Object.entries(mine).filter(([id]) => ids.has(id)));
    if (Object.keys(kept).length !== Object.keys(mine).length) mem.set(mineKey(), kept);
    renderGrid();
  } catch {
    state.error = '갤러리를 불러오지 못했어요. 인터넷 연결을 확인하고 🔄을 눌러 주세요.';
    $('#g-status').textContent = `⚠️ ${state.error}`;
  } finally {
    state.loading = false;
  }
}

/* ---------------- 올리기 창 ---------------- */
async function openAdd() {
  if (state.data && state.data.open === false) {
    toast('지금은 올리기가 닫혀 있어요. 선생님께 여쭤 보세요.');
    return;
  }
  const saved = mem.get('gallery:me', {});
  const info = await myPortfolioInfo();
  const needCode = state.data?.needCode;
  const modal = $('#g-modal');
  modal.innerHTML = `
    <form class="modal-card g-form" id="g-add-form" novalidate>
      <div class="modal-head"><h2>＋ 내 작품 올리기</h2><button type="button" class="btn btn-ghost btn-sm" data-g="close" aria-label="닫기">✕</button></div>
      <details class="more g-howto">
        <summary>📎 구글 드라이브 링크 복사하는 법</summary>
        <ol>
          <li>포트폴리오 앱에서 <b>PDF</b>·<b>웹페이지(ZIP 또는 HTML)</b>·<b>프로젝트 파일</b> 중 하나로 저장하고, 학급 구글 드라이브에 올려요. <b>ZIP은 풀지 말고 그대로</b> 올리면 돼요.</li>
          <li>올린 파일을 <b>오른쪽 클릭(휴대폰은 ⋮) → 공유 → 링크 복사</b>.</li>
          <li>‘일반 액세스’를 <b>링크가 있는 우리 학교 사용자</b>(또는 링크가 있는 모든 사용자) <b>뷰어</b>로 바꿔야 친구들이 볼 수 있어요.</li>
        </ol>
        <p class="small">💡 <b>ZIP·HTML·프로젝트 파일</b>은 갤러리에서 <b>📖 포트폴리오 보기</b>로 사진·동영상까지 그대로 펼쳐져요. (구글 드라이브는 웹페이지를 직접 보여 주지 못해서 갤러리가 대신 펼쳐 줘요)</p>
      </details>
      <label class="field"><span class="field-label">이름</span><input class="input" name="name" maxlength="20" required value="${esc(saved.name || info.name || '')}" placeholder="예: 김하늘" /></label>
      <label class="field"><span class="field-label">작품 제목</span><input class="input" name="title" maxlength="60" required value="${esc(info.title || '')}" placeholder="예: 쑥쑥 자란 나의 1년" /></label>
      <label class="field"><span class="field-label">구글 드라이브 링크</span><input class="input" name="link" type="url" required placeholder="https://drive.google.com/file/d/…/view" /></label>
      <p class="g-link-check" id="g-link-check"></p>
      <label class="field"><span class="field-label">한 줄 설명<span class="field-hint"> · 선택</span></span><input class="input" name="desc" maxlength="200" placeholder="예: 1년 동안 그린 그림을 모았어요" /></label>
      ${needCode ? `<label class="field"><span class="field-label">학급 코드<span class="field-hint"> · 선생님이 알려 준 코드</span></span><input class="input" name="code" maxlength="30" required value="${esc(saved.code || '')}" autocomplete="off" /></label>` : ''}
      <p class="g-form-error" id="g-form-error" role="alert"></p>
      <button type="submit" class="btn btn-primary btn-lg btn-block" id="g-submit">🎉 갤러리에 올리기</button>
    </form>`;
  modal.hidden = false;
  modal.querySelector(saved.name || info.name ? '[name="link"]' : '[name="name"]').focus();
}

function checkLinkField(value) {
  const el = $('#g-link-check');
  if (!el) return;
  if (!value.trim()) {
    el.textContent = '';
    el.className = 'g-link-check';
    return;
  }
  if (!isValidLink(value)) {
    el.textContent = '⚠️ https:// 로 시작하는 주소를 붙여 넣어 주세요.';
    el.className = 'g-link-check is-error';
    return;
  }
  const info = parseLink(value);
  el.textContent = info.kind === 'web' ? '🔗 구글 드라이브 링크는 아니지만 올릴 수 있어요.' : `${info.icon} ${info.label} 링크예요 ✓`;
  el.className = `g-link-check${info.kind === 'web' ? '' : ' is-ok'}`;
}

async function submitAdd(form) {
  const fd = new FormData(form);
  const item = {
    name: String(fd.get('name') || '').trim(),
    title: String(fd.get('title') || '').trim(),
    link: String(fd.get('link') || '').trim(),
    desc: String(fd.get('desc') || '').trim(),
    code: String(fd.get('code') || '').trim()
  };
  const err = $('#g-form-error');
  const fail = (msg, field) => {
    err.textContent = `⚠️ ${msg}`;
    if (field) form.querySelector(`[name="${field}"]`)?.focus();
  };
  if (!item.name) return fail('이름을 적어 주세요.', 'name');
  if (!item.title) return fail('작품 제목을 적어 주세요.', 'title');
  if (!isValidLink(item.link)) return fail('링크가 올바르지 않아요. https:// 로 시작하는 주소를 붙여 넣어 주세요.', 'link');
  if (state.data?.needCode && !item.code) return fail('학급 코드를 적어 주세요.', 'code');
  const btn = $('#g-submit');
  btn.disabled = true;
  btn.textContent = '올리는 중…';
  err.textContent = '';
  try {
    const r = await addItem(state.scriptUrl, item);
    if (!r?.ok) return fail(r?.error || '올리지 못했어요.', r?.field);
    mem.set('gallery:me', { name: item.name, code: item.code });
    mem.set(mineKey(), { ...myPosts(), [r.id]: r.token });
    closeModal();
    if (r.warning) toast(`🎉 올렸어요! 그런데 ⚠️ ${r.warning}`, 9000);
    else toast(VIEWABLE.has(r.fileType) ? '🎉 갤러리에 올렸어요! 📖 포트폴리오 보기로 펼쳐 볼 수 있어요.' : '🎉 갤러리에 올렸어요!');
    await load({ quiet: true });
  } catch {
    fail('인터넷 연결을 확인하고 다시 눌러 주세요.');
  } finally {
    btn.disabled = false;
    btn.textContent = '🎉 갤러리에 올리기';
  }
}

async function removeMine(id) {
  const token = myPosts()[id];
  if (!token || !confirm('이 작품을 갤러리에서 지울까요? (드라이브의 파일은 그대로예요)')) return;
  try {
    const r = await deleteItem(state.scriptUrl, id, token);
    if (!r?.ok) {
      toast(`⚠️ ${r?.error || '지우지 못했어요.'}`);
      return;
    }
    const mine = myPosts();
    delete mine[id];
    mem.set(mineKey(), mine);
    toast('지웠어요.');
    await load({ quiet: true });
  } catch {
    toast('⚠️ 인터넷 연결을 확인하고 다시 눌러 주세요.');
  }
}

/* ---------------- 미리보기 · QR ---------------- */
function openPreview(id) {
  const it = state.data?.items.find((x) => x.id === id);
  if (!it) return;
  const info = parseLink(it.link);
  const modal = $('#g-modal');
  modal.innerHTML = `
    <div class="modal-card g-preview" role="dialog" aria-modal="true" aria-label="${esc(it.title)}">
      <div class="modal-head"><h2>${esc(it.title)} <small>· ${esc(it.name)}</small></h2><button type="button" class="btn btn-ghost btn-sm" data-g="close" aria-label="닫기">✕</button></div>
      ${
        info.preview
          ? `<div class="g-frame"><iframe src="${esc(info.preview)}" title="${esc(it.title)}" allow="autoplay; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
             <p class="small muted">안 보이면 파일을 볼 권한이 없거나 학교 계정으로 로그인하지 않은 거예요. ‘새 창에서 열기’를 눌러 보세요.</p>`
          : `<p class="pane-hint">이 링크는 미리 보기를 할 수 없어요. 새 창에서 열어 주세요.</p>`
      }
      ${it.desc ? `<p>${esc(it.desc)}</p>` : ''}
      <a class="btn btn-primary btn-block" href="${esc(info.open)}" target="_blank" rel="noopener noreferrer">새 창에서 열기 ↗</a>
    </div>`;
  modal.hidden = false;
}

/* ---------------- 📖 포트폴리오 보기 (ZIP·HTML·프로젝트 파일 펼치기) ---------------- */
let viewSeq = 0;
let stopAssetHandoff = () => {};
async function openViewer(id) {
  const it = state.data?.items.find((x) => x.id === id);
  if (!it) return;
  const seq = ++viewSeq;
  const modal = $('#g-modal');
  modal.innerHTML = `
    <div class="g-viewer" role="dialog" aria-modal="true" aria-label="${esc(it.title)}">
      <div class="g-viewer-head">
        <h2>${esc(it.title)} <small>· ${esc(it.name)}</small></h2>
        <a class="btn btn-sm" href="${esc(parseLink(it.link).open)}" target="_blank" rel="noopener noreferrer">드라이브 ↗</a>
        <button type="button" class="btn btn-sm" data-g="close" aria-label="닫기">✕ 닫기</button>
      </div>
      <div class="g-viewer-body" id="g-viewer-body">
        <div class="g-loading">
          <div class="g-loading-icon" aria-hidden="true">📖</div>
          <p id="g-view-msg">작품을 받아 오는 중…</p>
          <div class="g-progress"><i id="g-view-bar"></i></div>
        </div>
      </div>
    </div>`;
  modal.hidden = false;
  modal.classList.add('is-viewer');
  const msg = (t) => {
    const el = $('#g-view-msg');
    if (el && seq === viewSeq) el.textContent = t;
  };
  try {
    const [{ bytes }, { buildViewHtml }] = await Promise.all([
      fetchFileBytes(state.scriptUrl, id, (done, total) => {
        if (seq !== viewSeq) return;
        const bar = $('#g-view-bar');
        if (bar) bar.style.width = `${Math.round((done / total) * 100)}%`;
        msg(`작품을 받아 오는 중… ${(done / 1048576).toFixed(1)} / ${(total / 1048576).toFixed(1)}MB`);
      }),
      import('./viewer.js')
    ]);
    if (seq !== viewSeq) return;
    msg('펼치는 중…');
    const { html, assets } = await buildViewHtml(bytes);
    if (seq !== viewSeq || modal.hidden) return;
    const frame = document.createElement('iframe');
    // 큰 사진·동영상은 iframe이 준비됐다고 알리면(gv-ready) 파일째 건넴
    const onMessage = (e) => {
      if (e.source === frame.contentWindow && e.data?.type === 'gv-ready') frame.contentWindow.postMessage({ type: 'gv-assets', assets }, '*');
    };
    window.addEventListener('message', onMessage);
    stopAssetHandoff = () => window.removeEventListener('message', onMessage);
    // 학생이 만든 웹페이지는 갤러리와 분리된 공간에서만 실행 (allow-same-origin 없음)
    frame.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals');
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.setAttribute('allow', 'fullscreen');
    frame.title = it.title;
    frame.className = 'g-viewer-frame';
    frame.srcdoc = html;
    const body = $('#g-viewer-body');
    body.innerHTML = '';
    body.appendChild(frame);
  } catch (err) {
    if (seq !== viewSeq) return;
    const body = $('#g-viewer-body');
    if (body)
      body.innerHTML = `<div class="g-loading"><div class="g-loading-icon" aria-hidden="true">😢</div><p><b>펼치지 못했어요.</b><br />${esc(
        err?.message && !/^(timeout|HTTP|Failed|jsonp)/i.test(err.message) ? err.message : '인터넷 연결을 확인하고 다시 눌러 주세요.'
      )}</p><p class="small muted">‘드라이브 ↗’로 원본 파일을 열 수 있어요.</p></div>`;
  }
}

function openQr() {
  const link = galleryLink(state.scriptUrl);
  const modal = $('#g-modal');
  modal.innerHTML = `
    <div class="modal-card g-qr-card" role="dialog" aria-modal="true" aria-label="갤러리 QR">
      <div class="modal-head"><h2>📱 휴대폰으로 갤러리 열기</h2><button type="button" class="btn btn-ghost btn-sm" data-g="close" aria-label="닫기">✕</button></div>
      <div class="g-qr">${qrSvg(link)}</div>
      <div class="g-row"><input class="input" readonly value="${esc(link)}" id="g-link" /><button type="button" class="btn" data-g="copy-link">주소 복사</button></div>
    </div>`;
  modal.hidden = false;
}

function closeModal() {
  const modal = $('#g-modal');
  if (!modal) return;
  viewSeq++;
  stopAssetHandoff();
  stopAssetHandoff = () => {};
  modal.hidden = true;
  modal.classList.remove('is-viewer');
  modal.innerHTML = '';
}

/* ================================================================== */
/* 이벤트 · 시작                                                        */
/* ================================================================== */
root.addEventListener('click', async (e) => {
  const modal = $('#g-modal');
  if (modal && e.target === modal) return closeModal();
  const el = e.target.closest('[data-g]');
  if (!el) return;
  const act = el.dataset.g;
  if (act === 'copy-code') toast((await copyText(appsScriptSource)) ? '📋 코드를 복사했어요. Apps Script에 붙여 넣으세요.' : '복사하지 못했어요. 코드 미리 보기에서 직접 복사해 주세요.');
  else if (act === 'check') await checkConnection();
  else if (act === 'copy-link') toast((await copyText($('#g-link').value)) ? '📋 주소를 복사했어요.' : '복사하지 못했어요.');
  else if (act === 'refresh') await load();
  else if (act === 'qr') openQr();
  else if (act === 'open-add') await openAdd();
  else if (act === 'close') closeModal();
  else if (act === 'preview') openPreview(el.dataset.id);
  else if (act === 'view') await openViewer(el.dataset.id);
  else if (act === 'delete') await removeMine(el.dataset.id);
});

root.addEventListener('input', (e) => {
  if (e.target.id === 'g-search') {
    state.search = e.target.value;
    renderGrid();
  } else if (e.target.name === 'link') checkLinkField(e.target.value);
});

root.addEventListener('change', (e) => {
  if (e.target.id === 'g-only-mine') {
    state.onlyMine = e.target.checked;
    renderGrid();
  }
});

root.addEventListener('submit', (e) => {
  if (e.target.id === 'g-add-form') {
    e.preventDefault();
    submitAdd(e.target);
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

function start() {
  state.scriptUrl = scriptFromHash();
  if (!state.scriptUrl) {
    renderSetup();
    return;
  }
  mem.set('gallery:last', galleryLink(state.scriptUrl));
  renderGalleryShell();
  load();
  setInterval(() => {
    if (document.visibilityState === 'visible' && $('#g-modal')?.hidden !== false) load({ quiet: true });
  }, REFRESH_MS);
}

window.addEventListener('hashchange', () => location.reload());
start();
