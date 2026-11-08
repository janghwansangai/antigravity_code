/**
 * 포트폴리오 화면의 작은 동작들: 분류 버튼 · 슬라이드 넘기기 · 사진 크게 보기
 *
 * 앱 미리보기와 내보낸 HTML 파일(ZIP/단일 파일)이 이 함수 하나를 함께 씁니다.
 * 내보낼 때는 이 파일의 소스 텍스트가 그대로 <script> 안에 들어가므로
 * import나 바깥 변수 없이 이 함수 안에서만 완결되게 작성해야 합니다.
 *
 * root: .pf 요소를 담고 있는 상자. 미리보기를 다시 그린 뒤에 다시 호출하면
 *       고른 분류와 보고 있던 슬라이드 위치가 그대로 유지됩니다.
 */
export function attachPortfolioInteractions(root) {
  if (!root) return;

  var st = root.__pfState;
  if (!st) {
    st = root.__pfState = { filter: 'all', slide: 0 };
    root.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
  }
  apply();

  function pf() {
    return root.querySelector('.pf');
  }

  function visibleWorks(el) {
    return Array.prototype.filter.call(el.querySelectorAll('.pf-work'), function (w) {
      return st.filter === 'all' || w.getAttribute('data-kind') === st.filter;
    });
  }

  function apply() {
    var el = pf();
    if (!el) return;

    if (st.filter !== 'all' && !el.querySelector('[data-pf-filter="' + st.filter + '"]')) {
      st.filter = 'all';
    }
    el.setAttribute('data-filter', st.filter);
    Array.prototype.forEach.call(el.querySelectorAll('[data-pf-filter]'), function (b) {
      var on = b.getAttribute('data-pf-filter') === st.filter;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    if (!el.classList.contains('pf-t-showcase')) return;
    var list = visibleWorks(el);
    var count = el.querySelector('.pf-slide-count');
    Array.prototype.forEach.call(el.querySelectorAll('.pf-work'), function (w) {
      w.classList.remove('is-current');
    });
    if (!list.length) {
      if (count) count.textContent = '0 / 0';
      return;
    }
    st.slide = ((st.slide % list.length) + list.length) % list.length;
    list[st.slide].classList.add('is-current');
    if (count) count.textContent = st.slide + 1 + ' / ' + list.length;
  }

  function onClick(e) {
    var t = e.target;
    if (!t || !t.closest) return;

    var fb = t.closest('[data-pf-filter]');
    if (fb && root.contains(fb)) {
      st.filter = fb.getAttribute('data-pf-filter');
      st.slide = 0;
      apply();
      return;
    }

    var sb = t.closest('[data-pf-slide]');
    if (sb && root.contains(sb)) {
      st.slide += sb.getAttribute('data-pf-slide') === 'next' ? 1 : -1;
      apply();
      return;
    }

    var img = t.closest('.pf-fig img');
    if (img && root.contains(img)) {
      openLightbox(img);
      return;
    }

    // 내려받기 버튼: 옆의 PDF 링크 주소로 파일을 내려받습니다.
    var dl = t.closest('[data-pf-download]');
    if (dl && root.contains(dl)) {
      var link = dl.parentNode && dl.parentNode.querySelector('a[data-pf-file]');
      if (link) saveFile(link.getAttribute('href'), link.getAttribute('data-name') || 'file.pdf');
      return;
    }

    // 파일 하나로 저장한 페이지 안의 PDF(data: 주소)는 브라우저가 새 창으로 바로 열지 못하므로
    // 잠깐 Blob 주소로 바꿔서 엽니다. 창이 막히면 내려받기로 대신합니다.
    var pdf = t.closest('a[data-pf-file="pdf"]');
    if (pdf && root.contains(pdf) && /^data:/i.test(pdf.getAttribute('href') || '')) {
      e.preventDefault();
      var url = toBlobUrl(pdf.getAttribute('href'));
      var win = url && window.open(url, '_blank');
      if (!win) saveFile(pdf.getAttribute('href'), pdf.getAttribute('data-name') || 'file.pdf');
    }
  }

  function toBlobUrl(href) {
    if (!/^data:/i.test(href || '')) return href;
    try {
      var comma = href.indexOf(',');
      var mime = href.slice(5, comma).split(';')[0] || 'application/octet-stream';
      var bin = atob(href.slice(comma + 1));
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      var url = URL.createObjectURL(new Blob([bytes], { type: mime }));
      setTimeout(function () { URL.revokeObjectURL(url); }, 120000);
      return url;
    } catch (err) {
      return '';
    }
  }

  function saveFile(href, name) {
    var url = toBlobUrl(href);
    if (!url) return;
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function onKey(e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    var tag = (e.target && e.target.tagName) || '';
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || (e.target && e.target.isContentEditable)) return;
    if (document.querySelector('.pf-lightbox')) return;
    var el = pf();
    if (!el || !el.classList.contains('pf-t-showcase') || !el.offsetParent) return;
    st.slide += e.key === 'ArrowRight' ? 1 : -1;
    apply();
  }

  function openLightbox(img) {
    var box = document.createElement('div');
    box.className = 'pf-lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', '사진 크게 보기');

    var big = document.createElement('img');
    big.src = img.currentSrc || img.src;
    big.alt = img.alt || '';
    box.appendChild(big);

    var fig = img.closest('figure');
    var cap = fig && fig.querySelector('figcaption');
    if (cap && cap.textContent.trim()) {
      var p = document.createElement('p');
      p.textContent = cap.textContent.trim();
      box.appendChild(p);
    }

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'pf-lightbox-close';
    close.textContent = '닫기 ✕';
    box.appendChild(close);

    function done() {
      box.remove();
      document.removeEventListener('keydown', esc);
      if (img.focus) img.focus({ preventScroll: true });
    }
    function esc(ev) {
      if (ev.key === 'Escape') done();
    }
    box.addEventListener('click', done);
    document.addEventListener('keydown', esc);
    document.body.appendChild(box);
    close.focus();
  }
}
