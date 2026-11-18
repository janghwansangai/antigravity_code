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
import manifestSource from '../../apps-script/appsscript.json?raw';
import { templateId } from './config.js';
import { addComment, addItem, adminCall, deleteComment, deleteItem, fetchFileBytes, fetchGallery, fetchThumbs, looksLikeScriptUrl, parseGalleryAddress, uploadFile } from './api.js';
import { isValidLink, parseLink } from './links.js';
import { openBugReport, setBugScreen } from '../utils/bugReport.js';

const root = document.getElementById('gallery-app');
const $ = (sel) => root.querySelector(sel);
/** 📖 갤러리 안에서 바로 펼쳐 볼 수 있는 파일 (ZIP·웹페이지·프로젝트 파일, 새 버전 서버는 PDF도) */
const VIEWABLE = new Set(['zip', 'portfolio', 'html']);
const PDF_VIEW_MAX = 40 * 1024 * 1024; // 이보다 큰 PDF는 드라이브 미리보기로
const isViewable = (it) => {
  // 새 서버(v3)는 보안을 위해 '파일로 올린 작품'만 열어 줌 (링크로 올린 남의 파일은 드라이브에서 열기)
  if (state.data?.version >= 3 && it.via !== 'file') return false;
  return VIEWABLE.has(it.fileType) || (it.fileType === 'pdf' && state.data?.version >= 2 && it.size > 0 && it.size <= PDF_VIEW_MAX);
};
const KIND_LABEL = { pdf: ['📄', 'PDF'], html: ['🌐', '웹페이지'], zip: ['📖', '포트폴리오'], portfolio: ['📖', '포트폴리오'] };

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
const myCommentsKey = () => `gallery:mycm:${state.scriptUrl}`;
const myComments = () => mem.get(myCommentsKey(), {});
const adminKeyName = () => `gallery:admin:${state.scriptUrl}`;
const adminKey = () => (state.data?.admin ? mem.get(adminKeyName(), '') : '');
const commentsOn = () => state.data?.version >= 4 && state.data.comments;

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
  setBugScreen('갤러리 만들기 안내');
  root.innerHTML = `
    <header class="g-top">
      <a class="g-brand" href="./index.html"><span class="brand-logo" aria-hidden="true">🌈</span><span>우리 반 작품 갤러리</span></a>
    </header>
    <main class="g-setup">
      <div class="g-student-note" role="note">
        <span class="g-student-face" aria-hidden="true">🧒</span>
        <div>
          <b>학생이에요? 여기서는 아무것도 하지 않아도 돼요!</b>
          <p>이 화면은 <b>선생님</b>이 갤러리를 처음 한 번 만드는 곳이에요. 선생님이 알려 준 <b>갤러리 주소</b>나 <b>QR</b>로 들어가세요.<br />실수로 눌러도 괜찮아요. 여기서 버튼을 눌러도 아무것도 만들어지지 않아요.</p>
          <a class="btn btn-sm" href="./index.html">← 포트폴리오 만들기로 돌아가기</a>
        </div>
      </div>
      <h1 class="g-h1">갤러리 만들기 <small>선생님용 · 10분</small></h1>
      <p class="pane-hint">학생들이 포트폴리오 앱에서 <b>🚀 갤러리에 공유하기</b>를 누르면 작품이 <b>이 갤러리가 만든 드라이브 폴더</b>에 저장되고, 갤러리에 카드로 바로 모여요. 목록은 선생님 <b>구글 시트</b>에 쌓여서 시트에서 바로 숨기거나 지울 수 있어요. 서버·비용 없이 무료예요.</p>
      <div class="g-safe">
        <b>🔒 선생님 드라이브는 안전해요</b>
        <p>갤러리 코드는 딱 세 가지 권한만 받아요: <b>① 이 시트 하나</b>, <b>② 갤러리가 직접 만든 폴더·파일</b>, <b>③ 파일을 올리고 읽는 연결</b>. 선생님 드라이브의 다른 파일·폴더는 <b>목록도 내용도 볼 수 없어요</b>(구글이 막아 줌). 권한 허용 화면에도 ‘이 앱에서 사용하는 특정 Google Drive 파일만’이라고 나와요.</p>
      </div>

      ${setupStepsHtml()}
      <div id="g-setup-result"></div>

      <div class="g-tips">
        <h2>설정 바꾸기 (시트의 ‘설정’ 탭)</h2>
        <ul>
          <li><b>갤러리 제목</b>: 갤러리 맨 위에 보이는 이름</li>
          <li><b>학급 코드</b>: 적어 두면 코드를 아는 학생만 올릴 수 있어요(낯선 사람이 올리는 것 방지)</li>
          <li><b>올리기 허용</b>: FALSE로 바꾸면 올리기를 잠시 닫아요</li>
          <li><b>작품 폴더</b>: 첫 연결 때 갤러리가 만든 폴더 주소가 적혀요. <b>드라이브에서 이 폴더를 원하는 곳(학급 폴더 등)으로 옮기거나 이름을 바꿔도</b> 계속 그 폴더에 저장돼요. (보안 때문에 갤러리는 자기가 만든 폴더에만 저장해요)</li>
          <li><b>파일 링크 공유</b>: TRUE면 올린 파일 하나하나를 ‘링크가 있는 사람 보기’로 공유(폴더는 공유하지 않음), FALSE면 공유하지 않고 우리 갤러리에서만 보여요</li>
          <li><b>저장 용량 한도(GB)</b>: 이 갤러리에 올릴 수 있는 전체 용량(기본 3GB)</li>
          <li><b>댓글 허용</b>: FALSE로 바꾸면 댓글 칸이 사라져요</li>
          <li><b>선생님 관리 코드</b>: 갤러리 위쪽 <b>🔑 선생님</b>에 이 코드를 적으면 그 기기에서 모든 작품·댓글을 지울 수 있어요(학생에게는 알려 주지 마세요). 바꿔도 되고, 비우면 꺼져요</li>
          <li>작품 줄을 지우거나 ‘숨김’ 칸에 TRUE를 적으면 갤러리에서 사라져요(‘댓글’ 탭도 같아요)</li>
        </ul>
      </div>
      <p class="g-guide-link"><a href="./guide.html">❓ 사용법 안내 페이지</a> · <button type="button" class="link-btn" data-g="bug">🐞 오류 신고</button></p>
    </main>
    <div class="toast" id="g-toast" role="status" aria-live="polite"></div>`;
}

/** 갤러리 만들기 단계: 템플릿 시트가 있으면 '복사하기'(쉬움), 없으면 '직접 만들기(코드 붙여넣기)' */
function setupStepsHtml() {
  const tid = templateId();
  const deploy = `
          <b>시트 메뉴 → 확장 프로그램 → Apps Script</b> → 오른쪽 위 파란 <b>배포 → 새 배포</b> → 톱니바퀴 ⚙️에서 <b>웹 앱</b>을 고르고
          <ul>
            <li>실행 사용자: <b>나</b></li>
            <li>액세스 권한이 있는 사용자: <b>모든 사용자</b></li>
          </ul>
          → ‘배포’ → <b>액세스 승인</b>(계정 고르기 → ‘Google에서 확인하지 않은 앱’이 나오면 <b>고급 → (프로젝트 이름)(으)로 이동</b> → 허용) → 나오는 <b>웹 앱 URL</b>을 복사해요.
          <p class="small muted">권한 화면에는 ‘이 스프레드시트’와 ‘이 앱에서 사용하는 특정 Google Drive 파일만’이 나와요. 선생님 드라이브의 다른 파일은 볼 수 없어요. 학교 계정에서 ‘모든 사용자’가 보이지 않으면 학교 관리자가 막아 둔 것이라 개인 구글 계정으로 만들면 됩니다.</p>`;
  const connect = `
        <li>
          <b>웹 앱 URL을 붙여 넣고 연결을 확인해요.</b> 첫 연결 때 작품 폴더·선생님 관리 코드·권한 확인이 저절로 준비돼요.
          <div class="g-row">
            <input class="input" id="g-script-url" type="url" placeholder="https://script.google.com/macros/s/…/exec" />
            <button type="button" class="btn btn-primary" data-g="check">연결 확인</button>
          </div>
          <p class="g-check-msg" id="g-check-msg" role="status"></p>
        </li>`;
  const manual = `
        <li>
          <b>구글 시트를 원하는 곳에 만들어요.</b>
          <div class="g-code-actions">
            <a class="btn btn-sm" href="https://sheets.new" target="_blank" rel="noopener">📈 내 드라이브에 바로 만들기 ↗</a>
            <a class="btn btn-sm" href="https://drive.google.com/drive/my-drive" target="_blank" rel="noopener">📁 원하는 폴더에 만들기 ↗</a>
          </div>
          <p class="small muted">드라이브에서 폴더를 열고 ＋ 새로 만들기 → Google 스프레드시트. 나중에 옮겨도 돼요.</p>
        </li>
        <li>
          <b>시트 메뉴 → 확장 프로그램 → Apps Script</b>를 열고, 파일 두 개를 붙여 넣어요.
          <ol class="g-substeps">
            <li><b>Code.gs</b>: 들어 있는 코드를 모두 지우고 붙여 넣기
              <div class="g-code-actions">
                <button type="button" class="btn btn-primary btn-sm" data-g="copy-code">📋 Code.gs 복사</button>
                <a class="btn btn-sm" href="https://github.com/janghwansangai/antigravity_code/blob/main/apps-script/Code.gs" target="_blank" rel="noopener">원문 보기 ↗</a>
              </div>
            </li>
            <li><b>appsscript.json</b>(권한을 좁히는 설정 파일): Apps Script 화면 맨 왼쪽 아이콘 줄의 <b>⚙️(프로젝트 설정)</b> → 맨 위 ‘일반 설정’의 <b>‘편집기에 "appsscript.json" 매니페스트 파일 표시’</b> 체크 → 다시 왼쪽 <b>&lt;&gt;(편집기)</b>로 돌아가 파일 목록의 <b>appsscript.json</b>을 열고 모두 지운 뒤 붙여 넣기
              <small class="g-hint">시트 메뉴의 설정이 아니라 Apps Script 화면의 ⚙️예요. 아이콘에 마우스를 올리면 이름이 보여요.</small>
              <div class="g-code-actions">
                <button type="button" class="btn btn-primary btn-sm" data-g="copy-manifest">📋 appsscript.json 복사</button>
              </div>
            </li>
            <li>💾 저장</li>
          </ol>
          <details class="more"><summary>코드 미리 보기</summary><pre class="g-code">${esc(manifestSource)}</pre><pre class="g-code">${esc(appsScriptSource)}</pre></details>
        </li>
        <li>${deploy}</li>`;
  if (!tid) return `<ol class="g-steps">${manual}${connect}</ol>`;
  return `
      <ol class="g-steps">
        <li>
          <b>갤러리 시트를 복사해요.</b> 코드와 권한 설정이 이미 들어 있어서 붙여 넣을 것이 없어요.
          <div class="g-code-actions">
            <a class="btn btn-primary" id="g-template-copy" href="https://docs.google.com/spreadsheets/d/${esc(tid)}/copy" target="_blank" rel="noopener">📋 갤러리 시트 복사하기 ↗</a>
          </div>
          <p class="small muted">‘사본 만들기’를 누르면 내 드라이브에 생겨요. 이름을 ‘6학년 3반 작품 갤러리’처럼 바꾸고, 원하는 폴더로 옮겨도 돼요. 반이 여러 개면 반마다 한 번씩 복사하세요.</p>
        </li>
        <li>${deploy}</li>
        ${connect}
      </ol>
      <details class="more g-manual"><summary>템플릿 없이 직접 만들기(코드 붙여넣기)</summary><ol class="g-steps">${manual}</ol></details>`;
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
    const safety =
      data.version >= 3
        ? data.ready && data.safeScopes
          ? ' · 🔒 권한 확인 완료(이 시트와 갤러리가 만든 파일만)'
          : ' · ⚠️ 권한 확인이 안 됐어요. appsscript.json이 빠졌는지 확인하고(직접 만들기 2단계), 10분 뒤 다시 연결 확인을 눌러 주세요.'
        : ' · ⚠️ 예전 버전 코드예요. 새 Code.gs와 appsscript.json으로 바꿔 주세요(보안 강화).';
    msg.textContent = `✅ 연결됐어요! ‘${data.title}’ · 작품 ${data.items.length}개${safety}`;
    msg.className = `g-check-msg ${data.version >= 3 && data.ready && data.safeScopes ? 'is-ok' : 'is-warn'}`;
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
  setBugScreen('갤러리 목록');
  root.innerHTML = `
    <header class="g-top">
      <a class="g-brand" href="./index.html" title="포트폴리오 만들기로"><span class="brand-logo" aria-hidden="true">🌈</span><span id="g-title">우리 반 작품 갤러리</span></a>
      <span class="g-count" id="g-count"></span>
      <div class="g-top-actions">
        <button type="button" class="btn btn-sm" data-g="refresh" title="새로 고침">🔄</button>
        <button type="button" class="btn btn-sm" data-g="qr">📱 QR</button>
        <button type="button" class="btn btn-sm" data-g="switch" title="다른 반·다른 선생님 갤러리로 가기">🔀 다른 갤러리</button>
        <button type="button" class="btn btn-sm" data-g="admin" id="g-admin-btn" hidden title="선생님: 작품·댓글 지우기">🔑 선생님</button>
        <button type="button" class="btn btn-primary" data-g="open-add">＋ 내 작품 올리기</button>
      </div>
    </header>
    <main class="g-main">
      <div class="g-tools">
        <input class="input" type="search" id="g-search" placeholder="🔍 이름이나 제목으로 찾기" />
        <label class="g-mine"><input type="checkbox" id="g-only-mine" /> 내가 올린 것만</label>
      </div>
      <div id="g-status" class="g-status" role="status"></div>
      <p class="g-old" id="g-old" hidden>🔧 <b>선생님께:</b> 갤러리 코드가 예전 버전이에요. 갤러리 만들기 화면의 새 <b>Code.gs·appsscript.json</b>으로 바꾸고 ‘배포 관리 → ✏️ 수정 → 새 버전’으로 다시 배포해 주세요. <b>💬 댓글</b>, <b>🔑 선생님 지우기</b>가 생기고 드라이브 권한이 <b>갤러리가 만든 파일만</b>으로 좁아져요. (갤러리 주소는 그대로)</p>
      <p class="g-admin-bar" id="g-admin-bar" hidden>🔑 <b>선생님 모드</b> · 작품과 댓글에 지우기 버튼이 보여요. <button type="button" class="link-btn" data-g="admin-off">선생님 모드 끄기</button></p>
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
  const viewable = isViewable(it);
  if (KIND_LABEL[it.fileType]) Object.assign(info, { icon: KIND_LABEL[it.fileType][0], label: KIND_LABEL[it.fileType][1] });
  // 썸네일: 앱에서 공유한 작품은 갤러리 서버의 썸네일, 아니면 드라이브 썸네일(PDF·사진·동영상)
  const own = it.thumb ? thumbCache.get(thumbKey(it)) : '';
  const driveThumb = !it.thumb && info.thumb && !['zip', 'html', 'portfolio'].includes(it.fileType) ? info.thumb : '';
  const src = own || driveThumb;
  const img = it.thumb
    ? `<img ${own ? `src="${esc(own)}"` : ''} data-thumb="${esc(it.id)}" alt="" />`
    : driveThumb
      ? `<img src="${esc(driveThumb)}" alt="" loading="lazy" referrerpolicy="no-referrer" />`
      : '';
  return `
    <article class="g-card">
      <button type="button" class="g-thumb${src ? '' : ' no-thumb'}" data-g="${viewable ? 'view' : 'preview'}" data-id="${esc(it.id)}" aria-label="${esc(it.title)} ${viewable ? '보기' : '미리 보기'}">
        ${img}<span class="g-icon" aria-hidden="true">${info.icon}</span>
        <span class="g-kind">${info.icon} ${esc(info.label)}</span>
      </button>
      <div class="g-body">
        <h3 class="g-card-title">${esc(it.title)}</h3>
        <p class="g-by">🙂 ${esc(it.name)} · <time datetime="${esc(it.time)}">${esc(relTime(it.time))}</time></p>
        ${it.desc ? `<p class="g-desc">${esc(it.desc)}</p>` : ''}
        <div class="g-actions">
          ${viewable ? `<button type="button" class="btn btn-primary btn-sm" data-g="view" data-id="${esc(it.id)}">📖 보기</button>` : ''}
          ${it.private ? '' : `<a class="btn btn-sm" href="${esc(info.open)}" target="_blank" rel="noopener noreferrer">열기 ↗</a>`}
          ${mine[it.id] ? `<button type="button" class="btn btn-sm btn-danger-text" data-g="delete" data-id="${esc(it.id)}">지우기</button><span class="g-mine-badge">내가 올림</span>` : ''}
          ${adminKey() && !mine[it.id] ? `<button type="button" class="btn btn-sm btn-danger-text" data-g="admin-del" data-id="${esc(it.id)}">🗑 작품 지우기</button>` : ''}
        </div>
        ${commentsHtml(it)}
      </div>
    </article>`;
}

/* ---------------- 💬 댓글 (카드 안에서 스크롤) ---------------- */
function commentLi(c, mineC, admin) {
  const del = mineC[c.id] || admin ? `<button type="button" class="g-cm-del" data-g="cm-del" data-id="${esc(c.id)}" aria-label="댓글 지우기" title="지우기">✕</button>` : '';
  return `<li data-cm="${esc(c.id)}"><b>${esc(c.name)}</b> <span class="g-cm-text">${esc(c.text)}</span> <time datetime="${esc(c.time)}">${esc(relTime(c.time))}</time>${del}</li>`;
}

function commentsHtml(it) {
  if (!commentsOn()) return '';
  const list = it.comments || [];
  const mineC = myComments();
  const admin = !!adminKey();
  return `<div class="g-comments" data-item="${esc(it.id)}">
      <p class="g-cm-head">💬 댓글 <b data-cm-count>${list.length}</b></p>
      <ul class="g-cm-list" data-cm-list>${list.length ? list.map((c) => commentLi(c, mineC, admin)).join('') : '<li class="g-cm-empty">첫 댓글을 남겨 보세요!</li>'}</ul>
      <form class="g-cm-form" data-cm-form="${esc(it.id)}" autocomplete="off" novalidate>
        <input class="input input-sm" name="text" maxlength="300" placeholder="응원·칭찬 댓글 쓰기" aria-label="${esc(it.title)}에 댓글 쓰기" />
        <button type="submit" class="btn btn-sm btn-primary">등록</button>
      </form>
    </div>`;
}

/** 한 카드의 댓글만 다시 그림(전체 목록을 다시 받지 않음) */
function redrawComments(itemId) {
  const it = state.data?.items.find((x) => x.id === itemId);
  const box = root.querySelector(`.g-comments[data-item="${CSS.escape(itemId)}"]`);
  if (!it || !box) return;
  const list = it.comments || [];
  const mineC = myComments();
  const admin = !!adminKey();
  box.querySelector('[data-cm-count]').textContent = list.length;
  const ul = box.querySelector('[data-cm-list]');
  ul.innerHTML = list.length ? list.map((c) => commentLi(c, mineC, admin)).join('') : '<li class="g-cm-empty">첫 댓글을 남겨 보세요!</li>';
  ul.scrollTop = ul.scrollHeight;
}

/** 이름(과 학급 코드)을 아직 모르면 한 번 물어봄 */
function askIdentity(pending, message = '') {
  const me = mem.get('gallery:me', {});
  const needCode = state.data?.needCode;
  const modal = $('#g-modal');
  modal.innerHTML = `
    <form class="modal-card g-form" id="g-id-form" novalidate>
      <div class="modal-head"><h2>💬 댓글 쓰기</h2><button type="button" class="btn btn-ghost btn-sm" data-g="close" aria-label="닫기">✕</button></div>
      <p class="pane-hint">처음 한 번만 적으면 다음부터는 바로 올라가요.</p>
      <label class="field"><span class="field-label">이름</span><input class="input" name="name" maxlength="20" required value="${esc(me.name || '')}" placeholder="예: 김하늘" /></label>
      ${needCode ? `<label class="field"><span class="field-label">학급 코드<span class="field-hint"> · 선생님이 알려 준 코드</span></span><input class="input" name="code" maxlength="30" required value="${esc(me.code || '')}" autocomplete="off" /></label>` : ''}
      <p class="g-form-error" id="g-form-error" role="alert">${message ? `⚠️ ${esc(message)}` : ''}</p>
      <button type="submit" class="btn btn-primary btn-lg btn-block">💬 댓글 올리기</button>
    </form>`;
  modal.hidden = false;
  modal.querySelector(me.name ? (needCode ? '[name="code"]' : '[name="name"]') : '[name="name"]').focus();
  pendingComment = pending;
}
let pendingComment = null;

function submitIdentity(form) {
  const fd = new FormData(form);
  const name = String(fd.get('name') || '').trim();
  const code = String(fd.get('code') || '').trim();
  if (!name) return ($('#g-form-error').textContent = '⚠️ 이름을 적어 주세요.');
  if (state.data?.needCode && !code) return ($('#g-form-error').textContent = '⚠️ 학급 코드를 적어 주세요.');
  mem.set('gallery:me', { ...mem.get('gallery:me', {}), name, code });
  closeModal();
  if (pendingComment) sendComment(pendingComment.item, pendingComment.text);
}

async function sendComment(item, text, form = null) {
  const me = mem.get('gallery:me', {});
  if (!me.name || (state.data?.needCode && !me.code)) return askIdentity({ item, text });
  const btn = form?.querySelector('button');
  if (btn) btn.disabled = true;
  try {
    const r = await addComment(state.scriptUrl, { item, text, name: me.name, code: me.code });
    if (!r?.ok) {
      if (r?.field === 'code' || r?.field === 'name') return askIdentity({ item, text }, r.error);
      toast(`⚠️ ${r?.error || '댓글을 올리지 못했어요.'}`);
      return;
    }
    mem.set(myCommentsKey(), { ...myComments(), [r.comment.id]: r.token });
    const it = state.data.items.find((x) => x.id === item);
    if (it) (it.comments = it.comments || []).push(r.comment);
    const input = (form || root.querySelector(`[data-cm-form="${CSS.escape(item)}"]`))?.querySelector('[name="text"]');
    if (input) input.value = '';
    redrawComments(item);
  } catch {
    toast('⚠️ 인터넷 연결을 확인하고 다시 눌러 주세요.');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function removeComment(commentId) {
  const item = state.data?.items.find((x) => (x.comments || []).some((c) => c.id === commentId));
  if (!item || !confirm('이 댓글을 지울까요?')) return;
  const token = myComments()[commentId];
  try {
    const r = token ? await deleteComment(state.scriptUrl, commentId, token) : await adminCall(state.scriptUrl, adminKey(), 'deleteComment', commentId);
    if (!r?.ok) {
      if (r?.field === 'key') leaveAdmin();
      if (!/이미 지워졌어요/.test(r?.error || '')) return toast(`⚠️ ${r?.error || '지우지 못했어요.'}`);
    }
    const mine = myComments();
    delete mine[commentId];
    mem.set(myCommentsKey(), mine);
    item.comments = item.comments.filter((c) => c.id !== commentId);
    redrawComments(item.id);
  } catch {
    toast('⚠️ 인터넷 연결을 확인하고 다시 눌러 주세요.');
  }
}

/* ---------------- 🔑 선생님 모드 (관리 코드: 시트 ‘설정’ 탭) ---------------- */
function openAdmin() {
  const modal = $('#g-modal');
  modal.innerHTML = `
    <form class="modal-card g-form" id="g-admin-form" novalidate>
      <div class="modal-head"><h2>🔑 선생님 모드</h2><button type="button" class="btn btn-ghost btn-sm" data-g="close" aria-label="닫기">✕</button></div>
      <p class="pane-hint">갤러리 구글 시트의 <b>‘설정’ 탭 → 선생님 관리 코드</b>를 적으면, 이 기기에서 모든 작품과 댓글을 지울 수 있어요. (학생에게는 알려 주지 마세요)</p>
      <label class="field"><span class="field-label">선생님 관리 코드</span><input class="input" name="key" maxlength="40" autocomplete="off" required /></label>
      <p class="g-form-error" id="g-form-error" role="alert"></p>
      <button type="submit" class="btn btn-primary btn-lg btn-block">선생님 모드 켜기</button>
    </form>`;
  modal.hidden = false;
  modal.querySelector('[name="key"]').focus();
}

async function submitAdmin(form) {
  const key = String(new FormData(form).get('key') || '').trim();
  if (!key) return ($('#g-form-error').textContent = '⚠️ 관리 코드를 적어 주세요.');
  try {
    const r = await adminCall(state.scriptUrl, key, 'check');
    if (!r?.ok) return ($('#g-form-error').textContent = `⚠️ ${r?.error || '확인하지 못했어요.'}`);
    mem.set(adminKeyName(), key);
    closeModal();
    renderGrid();
    toast('🔑 선생님 모드예요. 작품·댓글에 지우기 버튼이 보여요.');
  } catch {
    $('#g-form-error').textContent = '⚠️ 인터넷 연결을 확인하고 다시 눌러 주세요.';
  }
}

function leaveAdmin() {
  mem.set(adminKeyName(), '');
  renderGrid();
}

async function adminDeleteItem(id) {
  const it = state.data?.items.find((x) => x.id === id);
  if (!it || !confirm(`‘${it.title}’(${it.name}) 작품을 지울까요?\n댓글도 함께 지워지고, 갤러리로 올린 파일은 드라이브 휴지통으로 가요.`)) return;
  try {
    const r = await adminCall(state.scriptUrl, adminKey(), 'deleteItem', id);
    if (!r?.ok) {
      if (r?.field === 'key') leaveAdmin();
      return toast(`⚠️ ${r?.error || '지우지 못했어요.'}`);
    }
    toast('지웠어요.');
    await load({ quiet: true });
  } catch {
    toast('⚠️ 인터넷 연결을 확인하고 다시 눌러 주세요.');
  }
}

/* ---------------- 썸네일 (앱에서 공유한 작품) ---------------- */
const thumbCache = new Map();
const THUMB_CACHE = 'gallery-thumbs-v1';
const thumbKey = (it) => `${it.id}@${it.time}`;
const thumbUrl = (it) => `https://gallery-cache.local/thumb/${encodeURIComponent(state.scriptUrl)}/${encodeURIComponent(thumbKey(it))}`;
let thumbsLoading = false;

async function loadThumbs() {
  if (thumbsLoading || !state.data) return;
  const need = state.data.items.filter((it) => it.thumb && !thumbCache.has(thumbKey(it)));
  if (!need.length) return;
  thumbsLoading = true;
  try {
    let cache = null;
    try {
      cache = await caches.open(THUMB_CACHE);
    } catch {
      cache = null;
    }
    const missing = [];
    for (const it of need) {
      const hit = cache && (await cache.match(thumbUrl(it)).catch(() => null));
      if (hit) thumbCache.set(thumbKey(it), await hit.text());
      else missing.push(it);
    }
    if (missing.length) {
      const got = await fetchThumbs(state.scriptUrl, missing.map((it) => it.id));
      for (const it of missing) {
        const v = got[it.id] || '';
        thumbCache.set(thumbKey(it), v);
        if (v && cache) cache.put(thumbUrl(it), new Response(v)).catch(() => {});
      }
    }
  } finally {
    thumbsLoading = false;
  }
  root.querySelectorAll('img[data-thumb]').forEach((img) => {
    const it = state.data.items.find((x) => x.id === img.dataset.thumb);
    const v = it && thumbCache.get(thumbKey(it));
    if (v && img.getAttribute('src') !== v) {
      img.src = v;
      img.closest('.g-thumb')?.classList.remove('no-thumb');
    }
  });
}

function renderGrid() {
  if (!state.data) return;
  const title = state.data.title || '우리 반 작품 갤러리';
  document.title = title;
  $('#g-title').textContent = title;
  $('#g-count').textContent = `작품 ${state.data.items.length}개`;
  const items = filteredItems();
  const mine = myPosts();
  $('#g-old').hidden = state.data.version >= 4;
  $('#g-grid').classList.toggle('has-comments', !!commentsOn());
  $('#g-admin-btn').hidden = !state.data.admin || !!adminKey();
  $('#g-admin-bar').hidden = !adminKey();
  $('#g-grid').innerHTML = items.length
    ? items.map((it) => cardHtml(it, mine)).join('')
    : `<div class="empty"><div class="empty-icon" aria-hidden="true">${state.data.items.length ? '🔍' : '🐣'}</div><p><b>${
        state.data.items.length ? '찾는 작품이 없어요' : '아직 올라온 작품이 없어요'
      }</b><br />${state.data.items.length ? '다른 낱말로 찾아보세요.' : '‘＋ 내 작품 올리기’로 첫 작품을 올려 보세요!'}</p></div>`;
  loadThumbs();
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
const UPLOAD_ACCEPT = '.pdf,.zip,.html,.htm,.portfolio,image/*,video/*';

async function openAdd() {
  if (state.data && state.data.open === false) {
    toast('지금은 올리기가 닫혀 있어요. 선생님께 여쭤 보세요.');
    return;
  }
  setBugScreen('갤러리 올리기');
  const saved = mem.get('gallery:me', {});
  const info = await myPortfolioInfo();
  const needCode = state.data?.needCode;
  const canUpload = !!state.data?.canUpload;
  const mine = myPosts();
  const myItems = (state.data?.items || []).filter((it) => mine[it.id]);
  const modal = $('#g-modal');
  modal.innerHTML = `
    <form class="modal-card g-form" id="g-add-form" novalidate data-mode="${canUpload ? 'file' : 'link'}">
      <div class="modal-head"><h2>＋ 내 작품 올리기</h2><button type="button" class="btn btn-ghost btn-sm" data-g="close" aria-label="닫기">✕</button></div>
      <p class="g-tip">💡 포트폴리오 앱에서 만들었다면 <b>③ 꾸미기·저장 → 🚀 갤러리에 공유하기</b>가 가장 편해요(파일을 고를 필요 없음).</p>
      ${
        canUpload
          ? `<div class="g-tabs" role="tablist">
              <button type="button" role="tab" class="g-tab is-on" data-g="mode" data-mode="file" aria-selected="true">📁 파일 올리기</button>
              <button type="button" role="tab" class="g-tab" data-g="mode" data-mode="link" aria-selected="false">🔗 드라이브 링크</button>
            </div>`
          : ''
      }
      <label class="field" data-for="file"${canUpload ? '' : ' hidden'}><span class="field-label">올릴 파일<span class="field-hint"> · PDF·웹페이지(ZIP·HTML)·사진·동영상 · ${Math.round((state.data?.maxUpload || 104857600) / 1048576)}MB까지</span></span>
        <input class="input" name="file" type="file" accept="${UPLOAD_ACCEPT}" /></label>
      ${
        canUpload && myItems.length
          ? `<label class="field" data-for="file"><span class="field-label">어떻게 올릴까요?</span><select class="select" name="replace">
              <option value="">새 작품으로 올리기</option>
              ${myItems.map((it) => `<option value="${esc(it.id)}">‘${esc(it.title)}’ 새 파일로 바꾸기 (댓글은 그대로)</option>`).join('')}
            </select></label>`
          : ''
      }
      <div data-for="link"${canUpload ? ' hidden' : ''}>
        <details class="more g-howto">
          <summary>📎 구글 드라이브 링크 복사하는 법</summary>
          <ol>
            <li>포트폴리오 앱에서 <b>PDF</b>·<b>웹페이지(ZIP 또는 HTML)</b>·<b>프로젝트 파일</b> 중 하나로 저장하고, 학급 구글 드라이브에 올려요. <b>ZIP은 풀지 말고 그대로</b> 올리면 돼요.</li>
            <li>올린 파일을 <b>오른쪽 클릭(휴대폰은 ⋮) → 공유 → 링크 복사</b>.</li>
            <li>‘일반 액세스’를 <b>링크가 있는 우리 학교 사용자</b>(또는 링크가 있는 모든 사용자) <b>뷰어</b>로 바꿔야 친구들이 볼 수 있어요.</li>
          </ol>
          <p class="small">💡 링크로 올린 파일은 드라이브에서 열려요. <b>ZIP·웹페이지(HTML)</b>를 갤러리에서 바로 펼쳐 보려면 <b>📁 파일 올리기</b>로 올려 주세요.</p>
        </details>
        <label class="field"><span class="field-label">구글 드라이브 링크</span><input class="input" name="link" type="url" placeholder="https://drive.google.com/file/d/…/view" /></label>
        <p class="g-link-check" id="g-link-check"></p>
      </div>
      <label class="field"><span class="field-label">이름</span><input class="input" name="name" maxlength="20" required value="${esc(saved.name || info.name || '')}" placeholder="예: 김하늘" /></label>
      <label class="field"><span class="field-label">작품 제목</span><input class="input" name="title" maxlength="60" required value="${esc(info.title || '')}" placeholder="예: 쑥쑥 자란 나의 1년" /></label>
      <label class="field"><span class="field-label">한 줄 설명<span class="field-hint"> · 선택</span></span><input class="input" name="desc" maxlength="200" placeholder="예: 1년 동안 그린 그림을 모았어요" /></label>
      ${needCode ? `<label class="field"><span class="field-label">학급 코드<span class="field-hint"> · 선생님이 알려 준 코드</span></span><input class="input" name="code" maxlength="30" required value="${esc(saved.code || '')}" autocomplete="off" /></label>` : ''}
      <p class="g-form-error" id="g-form-error" role="alert"></p>
      <button type="submit" class="btn btn-primary btn-lg btn-block" id="g-submit">🎉 갤러리에 올리기</button>
    </form>`;
  modal.hidden = false;
  modal.querySelector(saved.name || info.name ? (canUpload ? '[name="file"]' : '[name="link"]') : '[name="name"]').focus();
}

function setAddMode(mode) {
  const form = $('#g-add-form');
  if (!form) return;
  form.dataset.mode = mode;
  form.querySelectorAll('[data-for]').forEach((el) => (el.hidden = el.dataset.for !== mode));
  form.querySelectorAll('.g-tab').forEach((b) => {
    b.classList.toggle('is-on', b.dataset.mode === mode);
    b.setAttribute('aria-selected', b.dataset.mode === mode ? 'true' : 'false');
  });
  $('#g-form-error').textContent = '';
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

/** 올리는 파일의 카드 썸네일(사진·동영상만, 400×300). PDF는 드라이브 썸네일을 씀 */
async function fileThumb(file) {
  const draw = (src, w, h) => {
    const c = document.createElement('canvas');
    c.width = 400;
    c.height = 300;
    const s = Math.max(400 / w, 300 / h);
    c.getContext('2d').drawImage(src, (400 - w * s) / 2, (300 - h * s) / 2, w * s, h * s);
    for (const q of [0.72, 0.5]) {
      const url = c.toDataURL('image/jpeg', q);
      if (url.length <= 44000) return url;
    }
    return '';
  };
  try {
    if (/^image\//.test(file.type)) {
      const bmp = await createImageBitmap(file);
      const url = draw(bmp, bmp.width, bmp.height);
      bmp.close?.();
      return url;
    }
    if (/^video\//.test(file.type)) {
      const { makeVideoPoster } = await import('../utils/video.js');
      const { poster } = await makeVideoPoster(file);
      const bmp = await createImageBitmap(poster);
      const url = draw(bmp, bmp.width, bmp.height);
      bmp.close?.();
      return url;
    }
  } catch {
    /* 썸네일 없이 */
  }
  return '';
}

async function submitAdd(form) {
  const fd = new FormData(form);
  const mode = form.dataset.mode || 'link';
  const item = {
    name: String(fd.get('name') || '').trim(),
    title: String(fd.get('title') || '').trim(),
    link: String(fd.get('link') || '').trim(),
    desc: String(fd.get('desc') || '').trim(),
    code: String(fd.get('code') || '').trim()
  };
  const file = fd.get('file');
  const err = $('#g-form-error');
  const fail = (msg, field) => {
    err.textContent = `⚠️ ${msg}`;
    if (field) form.querySelector(`[name="${field}"]`)?.focus();
  };
  if (mode === 'file') {
    if (!(file instanceof File) || !file.size) return fail('올릴 파일을 골라 주세요.', 'file');
    if (file.size > (state.data?.maxUpload || 104857600)) return fail('파일이 너무 커요. 포트폴리오 앱의 🚀 갤러리에 공유하기(가볍게 만들어 올림)를 써 보세요.', 'file');
  } else if (!isValidLink(item.link)) return fail('링크가 올바르지 않아요. https:// 로 시작하는 주소를 붙여 넣어 주세요.', 'link');
  if (!item.name) return fail('이름을 적어 주세요.', 'name');
  if (!item.title) return fail('작품 제목을 적어 주세요.', 'title');
  if (state.data?.needCode && !item.code) return fail('학급 코드를 적어 주세요.', 'code');
  const btn = $('#g-submit');
  btn.disabled = true;
  btn.textContent = '올리는 중…';
  err.textContent = '';
  try {
    let r;
    if (mode === 'file') {
      const thumb = await fileThumb(file);
      const { link: _l, ...meta } = item;
      const replaceId = String(fd.get('replace') || '');
      const replace = replaceId && myPosts()[replaceId] ? { replaceId, replaceToken: myPosts()[replaceId] } : {};
      r = await uploadFile(state.scriptUrl, { ...meta, ...replace, blob: file, fileName: file.name, thumb }, (sent, total) => {
        btn.textContent = `올리는 중… ${Math.round((sent / total) * 100)}%`;
      });
    } else r = await addItem(state.scriptUrl, item);
    if (!r?.ok) return fail(r?.error || '올리지 못했어요.', r?.field);
    mem.set('gallery:me', { name: item.name, code: item.code });
    mem.set(mineKey(), { ...myPosts(), [r.id]: r.token });
    closeModal();
    if (r.replaced) toast('🎉 새 파일로 바꿨어요! 댓글은 그대로예요.');
    else if (r.warning) toast(`🎉 올렸어요! 그런데 ⚠️ ${r.warning}`, 9000);
    else toast(isViewable({ fileType: r.fileType, size: file?.size || 1, via: mode === 'file' ? 'file' : 'link' }) ? '🎉 갤러리에 올렸어요! 📖 보기로 바로 열어 볼 수 있어요.' : '🎉 갤러리에 올렸어요!');
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
  if (!token || !confirm('이 작품을 갤러리에서 지울까요?\n작품의 댓글도 함께 지워져요. (드라이브의 파일은 그대로예요)\n💡 새 파일로 바꾸려면 ‘＋ 내 작품 올리기’에서 ‘바꾸기’를 고르면 댓글이 남아요.')) return;
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
  setBugScreen('갤러리 작품 보기');
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
      fetchFileBytes(
        state.scriptUrl,
        id,
        (done, total) => {
          if (seq !== viewSeq) return;
          const bar = $('#g-view-bar');
          if (bar) bar.style.width = `${Math.round((done / total) * 100)}%`;
          msg(`작품을 받아 오는 중… ${(done / 1048576).toFixed(1)} / ${(total / 1048576).toFixed(1)}MB`);
        },
        { size: it.size }
      ),
      import('./viewer.js')
    ]);
    if (seq !== viewSeq) return;
    msg('펼치는 중…');
    if (isPdfBytes(bytes)) {
      await showPdf(bytes, seq, msg);
      return;
    }
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

const isPdfBytes = (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46; // %PDF
let pageUrls = [];

/** PDF: 쪽 그림을 차례로 보여 줌. 앱에서 공유한 PDF는 들어 있는 JPEG를 바로 꺼내고(빠름), 다른 PDF는 pdf.js로 그림 */
async function showPdf(bytes, seq, msg) {
  const { extractJpegPages } = await import('./viewer.js');
  let pages = extractJpegPages(bytes);
  if (!pages.length) {
    msg('PDF 쪽 그림 만드는 중…');
    const { renderPdfPages } = await import('../utils/pdf.js');
    const r = await renderPdfPages(new Blob([bytes], { type: 'application/pdf' }), (d, t) => msg(`PDF 쪽 그림 만드는 중… ${d}/${t}쪽`));
    pages = r.pages.map((p) => p.blob);
  }
  if (seq !== viewSeq) return;
  pageUrls.forEach((u) => URL.revokeObjectURL(u));
  pageUrls = pages.map((b) => URL.createObjectURL(b));
  const body = $('#g-viewer-body');
  body.innerHTML = `<div class="g-pdf-pages">${pageUrls.map((u, i) => `<img src="${u}" alt="${i + 1}쪽" loading="${i < 2 ? 'eager' : 'lazy'}" />`).join('')}</div>`;
}

/* ---------------- 🔀 다른 갤러리로 가기 ---------------- */
function openSwitch() {
  const modal = $('#g-modal');
  modal.innerHTML = `
    <form class="modal-card g-form" id="g-switch-form" novalidate>
      <div class="modal-head"><h2>🔀 다른 갤러리로 가기</h2><button type="button" class="btn btn-ghost btn-sm" data-g="close" aria-label="닫기">✕</button></div>
      <p class="pane-hint">다른 반·다른 선생님의 <b>갤러리 주소</b>를 붙여 넣으세요. 이 브라우저에서 <b>🚀 갤러리에 공유하기</b>를 누르면 그 갤러리로 올라가요.</p>
      <label class="field"><span class="field-label">갤러리 주소</span><input class="input" name="address" type="url" inputmode="url" autocomplete="off" placeholder="https://…/gallery.html#s=…" /></label>
      <p class="g-form-error" id="g-form-error" role="alert"></p>
      <button type="submit" class="btn btn-primary btn-lg btn-block">이 갤러리로 가기</button>
    </form>`;
  modal.hidden = false;
  modal.querySelector('[name="address"]').focus();
}

function submitSwitch(form) {
  const scriptUrl = parseGalleryAddress(new FormData(form).get('address'));
  if (!scriptUrl) {
    $('#g-form-error').textContent = '⚠️ 갤러리 주소가 아니에요. 선생님이 알려 준 주소(…gallery.html#s=…)를 그대로 붙여 넣어 주세요.';
    return;
  }
  if (scriptUrl === state.scriptUrl) {
    closeModal();
    toast('지금 보고 있는 갤러리예요.');
    return;
  }
  location.href = galleryLink(scriptUrl); // 주소가 바뀌면 새 갤러리로 다시 열림(이 브라우저의 공유 대상도 바뀜)
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
  if (state.scriptUrl) setBugScreen('갤러리 목록');
  viewSeq++;
  pageUrls.forEach((u) => URL.revokeObjectURL(u));
  pageUrls = [];
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
  if (act === 'copy-code') toast((await copyText(appsScriptSource)) ? '📋 Code.gs를 복사했어요. Apps Script에 붙여 넣으세요.' : '복사하지 못했어요. 코드 미리 보기에서 직접 복사해 주세요.');
  else if (act === 'copy-manifest') toast((await copyText(manifestSource)) ? '📋 appsscript.json을 복사했어요. 매니페스트 파일에 붙여 넣으세요.' : '복사하지 못했어요. 코드 미리 보기에서 직접 복사해 주세요.');
  else if (act === 'check') await checkConnection();
  else if (act === 'copy-link') toast((await copyText($('#g-link').value)) ? '📋 주소를 복사했어요.' : '복사하지 못했어요.');
  else if (act === 'refresh') await load();
  else if (act === 'qr') openQr();
  else if (act === 'open-add') await openAdd();
  else if (act === 'close') closeModal();
  else if (act === 'preview') openPreview(el.dataset.id);
  else if (act === 'view') await openViewer(el.dataset.id);
  else if (act === 'mode') setAddMode(el.dataset.mode);
  else if (act === 'switch') openSwitch();
  else if (act === 'cm-del') await removeComment(el.dataset.id);
  else if (act === 'admin') openAdmin();
  else if (act === 'admin-off') leaveAdmin();
  else if (act === 'admin-del') await adminDeleteItem(el.dataset.id);
  else if (act === 'bug') openBugReport();
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
  } else if (e.target.id === 'g-switch-form') {
    e.preventDefault();
    submitSwitch(e.target);
  } else if (e.target.id === 'g-id-form') {
    e.preventDefault();
    submitIdentity(e.target);
  } else if (e.target.id === 'g-admin-form') {
    e.preventDefault();
    submitAdmin(e.target);
  } else if (e.target.dataset.cmForm) {
    e.preventDefault();
    const text = String(e.target.querySelector('[name="text"]').value || '').trim();
    if (text) sendComment(e.target.dataset.cmForm, text, e.target);
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
  // 목록은 이 페이지를 열 때와 🔄를 누를 때만 받음(자동 갱신 없음 → 학생이 많아도 서버 부담이 적음)
  load();
}

window.addEventListener('hashchange', () => location.reload());
start();
