/**
 * 포트폴리오 앱 ③단계의 '🌈 우리 반 갤러리'
 *
 *   - 갤러리에 연결: 선생님이 알려 준 갤러리 주소를 붙여 넣기 (또는 QR로 갤러리를 한 번 열면 자동 연결)
 *     → 학생 화면에는 '갤러리 만들기' 안내가 나오지 않음
 *   - [🚀 갤러리에 공유하기]: PDF(추천) 또는 가벼운 웹페이지 ZIP을 만들어 선생님 드라이브 '작품 폴더'에 올리고
 *     갤러리에 바로 등록 (링크를 복사해 붙여 넣을 필요 없음). 다시 공유하면 전에 올린 것을 새것으로 바꿈.
 *
 * 갤러리 페이지(gallery.html)와 같은 주소(origin)라서 브라우저 기억(localStorage)을 함께 씁니다.
 *   gallery:last              마지막으로 연 갤러리 주소
 *   gallery:mine:<웹 앱 주소>  내가 올린 작품 { 번호: 지우기 열쇠 }
 *   gallery:shared:<웹 앱 주소> 포트폴리오별로 마지막에 공유한 작품 { 포트폴리오 id: { id, title } }
 *   gallery:me                이름·학급 코드
 */
import { fetchGallery, parseGalleryAddress, uploadFile } from '../gallery/api.js';
import { escapeHtml as esc } from '../templates/portfolioRenderer.js';
import { formatBytes } from '../utils/files.js';

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

export function galleryLinkFor(scriptUrl) {
  return `${new URL('./gallery.html', location.href).href}#s=${encodeURIComponent(scriptUrl)}`;
}

/** 이 브라우저가 기억하는 우리 반 갤러리 → { scriptUrl, link } 또는 null */
export function currentGallery() {
  const last = mem.get('gallery:last', '');
  const scriptUrl = typeof last === 'string' ? parseGalleryAddress(last) : '';
  return scriptUrl ? { scriptUrl, link: galleryLinkFor(scriptUrl) } : null;
}

let infoCache = null; // { scriptUrl, data, at }

async function galleryInfo(scriptUrl, { fresh = false } = {}) {
  if (!fresh && infoCache?.scriptUrl === scriptUrl && Date.now() - infoCache.at < 60000) return infoCache.data;
  const data = await fetchGallery(scriptUrl);
  if (!data?.ok) throw new Error(data?.error || 'bad');
  infoCache = { scriptUrl, data, at: Date.now() };
  mem.set('gallery:title', { scriptUrl, title: data.title });
  return data;
}

/* ---------------- ③단계 화면 조각 ---------------- */
let changing = false; // '다른 갤러리로 바꾸기'를 누른 상태(새 주소로 연결될 때까지 지금 갤러리는 그대로)

/** 다른 갤러리로 바꾸기 시작 / 취소 */
export function setChangingGallery(on) {
  changing = !!on;
}

export function gallerySectionHtml(exportItemHtml) {
  const g = currentGallery();
  if (!g || changing) {
    return `
    <p class="pane-hint">${
      g
        ? '바꿀 <b>갤러리 주소</b>를 붙여 넣고 ‘연결’을 누르세요. (그 갤러리의 QR을 열어도 바뀌어요)'
        : '선생님이 알려 준 <b>우리 반 갤러리 주소</b>를 붙여 넣으면, 버튼 하나로 내 작품을 갤러리에 올릴 수 있어요. (선생님이 보여 준 QR로 갤러리를 한 번 열어도 자동으로 연결돼요)'
    }</p>
    <div class="gallery-connect">
      <input class="input" id="gallery-address" type="url" inputmode="url" autocomplete="off" placeholder="갤러리 주소 붙여 넣기" aria-label="갤러리 주소" />
      <button type="button" class="btn btn-primary" data-action="gallery-connect">연결</button>
      ${g ? '<button type="button" class="btn" data-action="gallery-change-cancel">취소</button>' : ''}
    </div>
    <p class="gallery-msg" id="gallery-msg" role="status"></p>`;
  }
  const saved = mem.get('gallery:title', null);
  const title = saved?.scriptUrl === g.scriptUrl ? saved.title : '우리 반 갤러리';
  return `
    <div class="gallery-connected">
      <span class="gallery-connected-icon" aria-hidden="true">🌈</span>
      <div class="gallery-connected-text"><small>연결된 갤러리</small><b id="gallery-title">${esc(title)}</b></div>
      <button type="button" class="btn btn-sm" data-action="gallery-change">🔄 다른 갤러리로 바꾸기</button>
    </div>
    <div class="export-list">
      ${exportItemHtml('share-gallery', '🚀', '갤러리에 공유하기', '버튼 하나로 선생님 드라이브에 저장되고 우리 반 갤러리에 바로 올라가요. 링크를 복사할 필요 없어요.', true)}
      <a class="export-item" href="${esc(g.link)}" target="_blank" rel="noopener">
        <span class="export-icon" aria-hidden="true">🌈</span>
        <span class="export-text"><b>우리 반 갤러리 열기 ↗</b><small>친구들 작품을 보고, 내가 올린 것을 확인해요.</small></span>
      </a>
    </div>`;
}

/** 화면을 그린 뒤: 갤러리 제목을 최신으로 */
export async function hydrateGallerySection($) {
  const g = currentGallery();
  const el = $('#gallery-title');
  if (!g || !el) return;
  try {
    const data = await galleryInfo(g.scriptUrl);
    if ($('#gallery-title')) $('#gallery-title').textContent = data.title;
  } catch {
    /* 인터넷이 안 되면 기억해 둔 제목 그대로 */
  }
}

export async function connectGallery($) {
  const input = $('#gallery-address');
  const msg = $('#gallery-msg');
  const scriptUrl = parseGalleryAddress(input?.value);
  const say = (t, cls = '') => {
    if (msg) {
      msg.textContent = t;
      msg.className = `gallery-msg ${cls}`;
    }
  };
  if (!scriptUrl) {
    say('⚠️ 갤러리 주소가 아니에요. 선생님이 알려 준 주소(…gallery.html#s=…)를 그대로 붙여 넣어 주세요.', 'is-error');
    return false;
  }
  say('확인하는 중…');
  try {
    const data = await galleryInfo(scriptUrl, { fresh: true });
    mem.set('gallery:last', galleryLinkFor(scriptUrl));
    changing = false;
    say(`✅ ‘${data.title}’에 연결했어요!`, 'is-ok');
    return true;
  } catch {
    say('⚠️ 갤러리에 연결하지 못했어요. 주소와 인터넷 연결을 확인해 주세요.', 'is-error');
    return false;
  }
}


/* ---------------- 🚀 공유 창 ---------------- */
/**
 * @param {{ modal: HTMLElement, state: object, portfolioId: string, flush: ()=>Promise<void>, getState: ()=>object, toast: Function }} ctx
 */
export async function openShareModal(ctx) {
  const g = currentGallery();
  if (!g) return;
  const { modal } = ctx;
  modal.innerHTML = `<div class="modal-card share-card" role="dialog" aria-modal="true" aria-label="갤러리에 공유하기"><div class="modal-head"><h2>🚀 갤러리에 공유하기</h2><button type="button" class="btn btn-ghost btn-sm" data-action="close-share" aria-label="닫기">✕</button></div><p class="pane-hint">갤러리를 확인하는 중…</p></div>`;
  modal.hidden = false;
  let data;
  try {
    data = await galleryInfo(g.scriptUrl, { fresh: true });
  } catch {
    modal.querySelector('.pane-hint').textContent = '⚠️ 갤러리에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.';
    return;
  }
  if (modal.hidden) return;
  const card = modal.querySelector('.share-card');
  if (!data.canUpload) {
    card.querySelector('.pane-hint').innerHTML =
      '선생님 갤러리가 예전 버전이라 바로 올리기를 쓸 수 없어요. 선생님께 <b>‘갤러리 코드를 새 버전으로 바꿔 주세요’</b>라고 말씀드려 주세요.<br />지금은 ‘웹페이지 파일’이나 ‘PDF’로 저장해 드라이브에 올리고, 갤러리의 ‘＋ 내 작품 올리기’에 링크를 붙여 넣으면 돼요.';
    return;
  }
  if (data.open === false) {
    card.querySelector('.pane-hint').textContent = '지금은 올리기가 닫혀 있어요. 선생님께 여쭤 보세요.';
    return;
  }
  const state = ctx.getState();
  const p = state.profile || {};
  const me = mem.get('gallery:me', {});
  const mine = mem.get(`gallery:mine:${g.scriptUrl}`, {});
  const shared = mem.get(`gallery:shared:${g.scriptUrl}`, {});
  const prev = shared[ctx.portfolioId];
  const canReplace = prev && mine[prev.id] && data.items.some((x) => x.id === prev.id);
  card.innerHTML = `
    <form id="share-form" novalidate>
      <div class="modal-head"><h2>🚀 갤러리에 공유하기</h2><button type="button" class="btn btn-ghost btn-sm" data-action="close-share" aria-label="닫기">✕</button></div>
      <p class="pane-hint">‘<b>${esc(data.title)}</b>’에 올려요. <button type="button" class="link-btn" data-action="share-change-gallery">다른 갤러리로 바꾸기</button><br />파일은 선생님 구글 드라이브에 저장되고, 친구들은 갤러리에서 바로 볼 수 있어요.</p>
      <div class="share-formats" role="radiogroup" aria-label="올릴 형식">
        <label class="share-format"><input type="radio" name="format" value="pdf" checked /><span><b>📄 PDF</b><em>추천</em><small>가볍고 빨리 열려요 · 갤러리에 표지 그림이 보여요 · 동영상은 썸네일로</small></span></label>
        <label class="share-format"><input type="radio" name="format" value="zip" /><span><b>🌐 웹페이지</b><small>고른 디자인 그대로 · 동영상도 재생 · 큰 동영상(10MB 넘음)은 썸네일로</small></span></label>
      </div>
      <label class="field"><span class="field-label">이름</span><input class="input" name="name" maxlength="20" required value="${esc(p.studentName || me.name || '')}" /></label>
      <label class="field"><span class="field-label">작품 제목</span><input class="input" name="title" maxlength="60" required value="${esc(p.portfolioTitle || '')}" /></label>
      <label class="field"><span class="field-label">한 줄 설명<span class="field-hint"> · 선택</span></span><input class="input" name="desc" maxlength="200" placeholder="예: 1년 동안의 작품을 모았어요" /></label>
      ${data.needCode ? `<label class="field"><span class="field-label">학급 코드<span class="field-hint"> · 선생님이 알려 준 코드</span></span><input class="input" name="code" maxlength="30" required autocomplete="off" value="${esc(me.code || '')}" /></label>` : ''}
      ${
        canReplace
          ? `<label class="share-replace"><input type="checkbox" name="replace" checked /> 전에 올린 ‘${esc(prev.title)}’을(를) 새것으로 바꾸기 <small>(끄면 하나 더 올라가요)</small></label>`
          : ''
      }
      <div class="share-progress" id="share-progress" hidden><div class="share-bar"><i id="share-bar"></i></div><p id="share-status" role="status"></p></div>
      <p class="share-error" id="share-error" role="alert"></p>
      <button type="submit" class="btn btn-primary btn-lg btn-block" id="share-submit">🚀 올리기</button>
    </form>`;
  const form = card.querySelector('#share-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitShare(ctx, g, data, form, canReplace ? prev : null);
  });
  form.querySelector(p.studentName ? '[name="desc"]' : '[name="name"]')?.focus();
}

async function submitShare(ctx, g, data, form, prev) {
  const fd = new FormData(form);
  const item = {
    name: String(fd.get('name') || '').trim(),
    title: String(fd.get('title') || '').trim(),
    desc: String(fd.get('desc') || '').trim(),
    code: String(fd.get('code') || '').trim()
  };
  const format = fd.get('format') === 'zip' ? 'zip' : 'pdf';
  const errEl = form.querySelector('#share-error');
  const fail = (msg, field) => {
    errEl.textContent = `⚠️ ${msg}`;
    if (field) form.querySelector(`[name="${field}"]`)?.focus();
  };
  if (!item.name) return fail('이름을 적어 주세요.', 'name');
  if (!item.title) return fail('작품 제목을 적어 주세요.', 'title');
  if (data.needCode && !item.code) return fail('학급 코드를 적어 주세요.', 'code');
  errEl.textContent = '';

  const btn = form.querySelector('#share-submit');
  const box = form.querySelector('#share-progress');
  const bar = form.querySelector('#share-bar');
  const status = form.querySelector('#share-status');
  const step = (text, pct = null) => {
    status.textContent = text;
    if (pct != null) bar.style.width = `${Math.round(pct)}%`;
  };
  btn.disabled = true;
  btn.textContent = '올리는 중…';
  box.hidden = false;
  form.querySelectorAll('input').forEach((i) => (i.disabled = true));
  try {
    await ctx.flush();
    const state = ctx.getState();
    const share = await import('../export/shareBuild.js');
    step('준비하는 중…', 3);
    let blob;
    let skipped = 0;
    if (format === 'pdf') {
      blob = await share.buildSharePdf(state, (t) => step(t, 15));
    } else {
      const r = await share.buildShareZip(state, (t) => step(t, 15));
      blob = r.blob;
      skipped = r.skipped;
    }
    if (blob.size > (data.maxUpload || 100 * 1048576)) throw new Error(`파일이 너무 커요(${formatBytes(blob.size)}). PDF로 올려 보세요.`);
    step('표지 그림 만드는 중…', 30);
    const thumb = await share.buildShareThumb(state).catch(() => '');
    const fileName = `${share.shareFileBase(state)}.${format}`;
    const r = await uploadFile(
      g.scriptUrl,
      { blob, fileName, ...item, thumb, replaceId: prev && fd.get('replace') ? prev.id : '', replaceToken: prev && fd.get('replace') ? mem.get(`gallery:mine:${g.scriptUrl}`, {})[prev.id] : '' },
      (sent, total) => step(`선생님 드라이브에 올리는 중… ${Math.round((sent / total) * 100)}% (${formatBytes(sent)} / ${formatBytes(total)})`, 30 + (sent / total) * 70)
    );
    if (!r?.ok) {
      box.hidden = true;
      return fail(r?.error || '올리지 못했어요.', r?.field);
    }
    mem.set('gallery:me', { name: item.name, code: item.code });
    mem.set(`gallery:mine:${g.scriptUrl}`, { ...mem.get(`gallery:mine:${g.scriptUrl}`, {}), [r.id]: r.token });
    mem.set(`gallery:shared:${g.scriptUrl}`, { ...mem.get(`gallery:shared:${g.scriptUrl}`, {}), [ctx.portfolioId]: { id: r.id, title: item.title } });
    infoCache = null;
    let copied = false;
    try {
      await navigator.clipboard.writeText(r.link);
      copied = true;
    } catch {
      /* 복사 버튼으로 */
    }
    showDone(ctx, g, { r, blob, format, skipped, copied });
  } catch (err) {
    console.warn(err);
    box.hidden = true;
    fail(err?.message && !/fetch|timeout|HTTP|network/i.test(err.message) ? err.message : '인터넷 연결을 확인하고 다시 눌러 주세요.');
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 올리기';
    form.querySelectorAll('input').forEach((i) => (i.disabled = false));
  }
}

function showDone(ctx, g, { r, blob, format, skipped, copied }) {
  const card = ctx.modal.querySelector('.share-card');
  if (!card) return;
  card.innerHTML = `
    <div class="modal-head"><h2>🎉 갤러리에 올렸어요!</h2><button type="button" class="btn btn-ghost btn-sm" data-action="close-share" aria-label="닫기">✕</button></div>
    <p class="share-done">${r.replaced ? '전에 올린 작품을 새것으로 바꿨어요.' : '친구들이 우리 반 갤러리에서 바로 볼 수 있어요.'}<br />
      <small>${format === 'pdf' ? '📄 PDF' : '🌐 웹페이지'} · ${formatBytes(blob.size)}${skipped ? ` · 큰 동영상·파일 ${skipped}개는 썸네일·안내로 바꿔 가볍게 올렸어요` : ''}</small></p>
    ${r.shared === 'private' ? '<p class="pane-hint small">선생님 드라이브 설정 때문에 링크로는 열리지 않을 수 있지만, 갤러리에서는 볼 수 있어요.</p>' : ''}
    <div class="share-done-actions">
      <a class="btn btn-primary btn-lg" href="${esc(g.link)}" target="_blank" rel="noopener">🌈 갤러리에서 보기 ↗</a>
      <button type="button" class="btn" data-action="share-copy-link" data-link="${esc(r.link)}">🔗 ${copied ? '링크 복사됨 ✓' : '드라이브 링크 복사'}</button>
    </div>
    <p class="pane-hint small">링크는 선생님께 따로 낼 때(예: 클래스룸) 붙여 넣으면 돼요. 갤러리에는 이미 올라가 있어요.</p>`;
  ctx.toast('🎉 갤러리에 올렸어요!');
}

export async function copyShareLink(el, toast) {
  try {
    await navigator.clipboard.writeText(el.dataset.link);
    el.textContent = '🔗 링크 복사됨 ✓';
  } catch {
    toast('복사하지 못했어요. 갤러리에서 열기를 눌러 주소를 복사해 주세요.');
  }
}
