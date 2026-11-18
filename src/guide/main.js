/**
 * 사용법 안내 페이지 (guide.html)
 *   - 🎬 사용법 영상 (config.js의 유튜브 주소)
 *   - 🧒 학생 접속 주소 · QR
 *   - 👩‍🏫 선생님 갤러리 만들기 바로가기
 *   - 아주 쉬운 사용법 · 안전하게 쓰기 · 자주 묻는 질문 · 만든 사람(다있쌤) · 🐞 오류 신고
 */
import '../style.css';
import './guide.css';
import qrcode from 'qrcode-generator';
import { GUIDE_VIDEOS, MAKER } from './config.js';
import { youtubeId } from './youtube.js';
import { templateId } from '../gallery/config.js';
import { escapeHtml as esc } from '../templates/portfolioRenderer.js';
import { openBugReport, setBugScreen } from '../utils/bugReport.js';

const root = document.getElementById('guide-app');
const studentUrl = new URL('./', location.href).href;
const galleryUrl = new URL('./gallery.html', location.href).href;


function qrSvg(text) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
}

function videoHtml(v, i) {
  const id = youtubeId(v.url);
  if (!id) {
    return `<div class="gd-video gd-video-empty"><div><span aria-hidden="true">🎬</span><b>${esc(v.title)}</b><small>사용법 영상이 곧 올라와요</small></div></div>`;
  }
  return `<figure class="gd-video-wrap">
      <div class="gd-video"><iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0" title="${esc(v.title)}" loading="${i ? 'lazy' : 'eager'}"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
      <figcaption>${esc(v.title)} · <a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">유튜브에서 보기 ↗</a></figcaption>
    </figure>`;
}

/** 선생님 카드: 템플릿 시트가 정해져 있으면 ‘📋 갤러리 시트 복사하기’(3단계), 없으면 직접 만들기 안내 */
function teacherCardHtml() {
  const tid = templateId();
  if (tid) {
    return `
        <h2>👩‍🏫 선생님: 우리 반 갤러리 만들기</h2>
        <p>구글 계정만 있으면 <b>5분, 반마다 한 번</b>이면 돼요. 코드를 붙여 넣을 필요 없어요. 서버·비용 없이 무료예요.</p>
        <a class="btn btn-primary btn-lg btn-block gd-copy-btn" id="gd-template-copy" href="https://docs.google.com/spreadsheets/d/${esc(tid)}/copy" target="_blank" rel="noopener">📋 1. 갤러리 시트 복사하기 ↗</a>
        <ol class="gd-steps gd-steps-small">
          <li><b>1</b><span>위 버튼 → <b>‘사본 만들기’</b> (내 드라이브에 생겨요 · 원하는 폴더로 옮겨도 돼요)</span></li>
          <li><b>2</b><span>복사한 시트의 확장 프로그램 → Apps Script → <b>배포 → 새 배포 → 웹 앱</b>(실행: 나, 액세스: 모든 사용자) → 권한 허용 → 웹 앱 주소 복사</span></li>
          <li><b>3</b><span>아래 ‘갤러리 연결하기’에 웹 앱 주소를 붙여 넣고 <b>연결 확인</b> → 나오는 <b>갤러리 주소·QR</b>을 학생들에게 알려 줘요.</span></li>
        </ol>
        <a class="btn btn-lg btn-block" href="./gallery.html">2·3. 갤러리 연결하기 (자세한 안내) →</a>`;
  }
  return `
        <h2>👩‍🏫 선생님: 우리 반 갤러리 만들기</h2>
        <p>구글 계정만 있으면 <b>10분, 반마다 한 번</b>이면 돼요. 서버·비용 없이 무료예요.</p>
        <ol class="gd-steps gd-steps-small">
          <li><b>1</b><span>구글 시트를 원하는 폴더에 새로 만들어요.</span></li>
          <li><b>2</b><span>확장 프로그램 → Apps Script에 <b>Code.gs</b>와 <b>appsscript.json</b>을 붙여 넣어요(복사 버튼 있음).</span></li>
          <li><b>3</b><span><b>배포 → 새 배포 → 웹 앱</b>(실행: 나, 액세스: 모든 사용자) → 권한 허용</span></li>
          <li><b>4</b><span>웹 앱 주소를 붙여 넣고 <b>연결 확인</b> → 나오는 <b>갤러리 주소·QR</b>을 학생들에게 알려 줘요.</span></li>
        </ol>
        <p class="gd-note">📋 곧 <b>갤러리 시트 복사하기</b>(코드 붙여넣기 없이 3단계)가 생겨요.</p>
        <a class="btn btn-primary btn-lg btn-block" href="./gallery.html">갤러리 만들기 시작 →</a>`;
}

function render() {
  root.innerHTML = `
  <header class="gd-top">
    <a class="gd-brand" href="./guide.html"><span class="brand-logo" aria-hidden="true">🌱</span><span>나의 포트폴리오 · 우리 반 갤러리</span></a>
    <nav class="gd-nav" aria-label="바로가기">
      <a href="#student">🧒 학생</a>
      <a href="#teacher">👩‍🏫 선생님</a>
      <a href="#faq">❓ 질문</a>
    </nav>
  </header>

  <main class="gd-main">
    <section class="gd-hero">
      <p class="gd-kicker">초등학생도 혼자 만드는 디지털 포트폴리오</p>
      <h1>사진 올리고, 글 쓰고, 꾸미면 <em>끝!</em></h1>
      <p class="gd-lead">작품 사진 · 활동 사진 · 동영상 · PDF를 모아 예쁜 포트폴리오를 만들고, 버튼 하나로 <b>우리 반 갤러리</b>에 올려 친구들과 함께 봐요.</p>
      <div class="gd-cta">
        <a class="btn btn-primary btn-lg" href="./" data-go="student">🧒 포트폴리오 만들기</a>
        <a class="btn btn-lg" href="./gallery.html" data-go="teacher">👩‍🏫 우리 반 갤러리 만들기</a>
      </div>
    </section>

    <section class="gd-section" id="video" aria-label="사용법 영상">
      <h2>🎬 영상으로 보기</h2>
      <div class="gd-videos">${GUIDE_VIDEOS.map(videoHtml).join('')}</div>
    </section>

    <section class="gd-section gd-two" id="student">
      <div class="gd-card gd-card-student">
        <h2>🧒 학생 접속 주소</h2>
        <p>휴대폰·태블릿 카메라로 QR을 찍거나 주소를 입력하세요.</p>
        <div class="gd-qr" id="gd-qr">${qrSvg(studentUrl)}</div>
        <div class="gd-url"><input class="input" readonly value="${esc(studentUrl)}" aria-label="학생 접속 주소" /><button type="button" class="btn" data-copy="${esc(studentUrl)}">주소 복사</button></div>
        <button type="button" class="btn btn-block" data-act="qr-big">📺 QR 크게 띄우기 (칠판·TV용)</button>
      </div>
      <div class="gd-card">
        <h2>✏️ 학생은 3단계면 끝</h2>
        <ol class="gd-steps">
          <li><b>① 내 소개</b><span>이름·학교·포트폴리오 제목을 적어요.</span></li>
          <li><b>② 활동 기록</b><span>활동마다 <b>사진·동영상·PDF</b>를 올리고 글을 써요. 📷 카메라로 찍기, 📄 문서 스캔, 캡처 붙여넣기(Ctrl+V)도 돼요.</span></li>
          <li><b>③ 꾸미기·저장</b><span>디자인 15가지 중 고르고 <b>🚀 갤러리에 공유하기</b>를 누르면 우리 반 갤러리에 올라가요. 웹페이지·PDF·ZIP으로 저장도 돼요.</span></li>
        </ol>
        <p class="gd-note">💾 작업은 <b>내 기기 안에만</b> 자동 저장돼요. 학교 컴퓨터를 쓰거나 다른 기기에서 이어 하려면 ③단계의 <b>프로젝트 파일 저장</b>을 꼭 해 두세요.</p>
      </div>
    </section>

    <section class="gd-section gd-two" id="teacher">
      <div class="gd-card gd-card-teacher">${teacherCardHtml()}</div>
      <div class="gd-card">
        <h2>🔒 안전하게 쓰기</h2>
        <ul class="gd-list">
          <li><b>학생 작업</b>은 학생 기기 안에만 저장돼요. 사이트로 보내지 않아요.</li>
          <li><b>공유한 작품</b>은 그 갤러리를 만든 <b>선생님 드라이브의 갤러리 폴더</b>에만 저장돼요.</li>
          <li>갤러리는 <b>이 시트와 갤러리가 만든 파일만</b> 다뤄요. 선생님 드라이브의 다른 파일은 <b>목록도 내용도 볼 수 없어요</b>.</li>
          <li>갤러리 주소·QR은 <b>우리 반에만</b> 알려 주세요. <b>학급 코드</b>를 정하면 모르는 사람이 올리지 못해요.</li>
          <li>친구 얼굴은 <b>✏️ 고치기 → 모자이크·스티커</b>로 가리고, 이름은 이름만·별명으로 적게 지도해 주세요.</li>
        </ul>
      </div>
    </section>

    <section class="gd-section" id="faq">
      <h2>❓ 자주 묻는 질문</h2>
      <div class="gd-faq">
        <details><summary>학교 컴퓨터에서 써도 되나요?</summary><p>네. 다만 작업은 그 컴퓨터 브라우저에 저장되니, 다 쓴 뒤 ③단계의 <b>💾 프로젝트 파일 저장</b>으로 파일을 챙기세요. 다른 컴퓨터에서 ‘프로젝트 파일 열기’로 이어서 할 수 있어요. 한 컴퓨터를 여러 학생이 쓰면 위쪽 이름표(🙂)로 내 포트폴리오를 골라요.</p></details>
        <details><summary>휴대폰·태블릿에서도 되나요?</summary><p>네. 크롬·사파리·삼성 인터넷·웨일에서 돼요. 카메라로 바로 찍어 올릴 수도 있어요.</p></details>
        <details><summary>동영상이 너무 커요.</summary><p>올릴 때 자동으로 <b>720p(1분 약 12MB)</b>로 줄여요. 더 작게 하려면 ‘새로 올릴 동영상 크기’를 480p로 바꾸세요. 이미 올린 동영상은 ③단계 ‘저장 공간’의 🎬 버튼으로 줄여요.</p></details>
        <details><summary>갤러리에 올릴 때 PDF와 웹페이지 중 무엇이 좋아요?</summary><p><b>PDF(추천)</b>가 가장 가볍고 빨리 열려요. 동영상까지 재생하고 싶으면 <b>웹페이지</b>를 고르세요(큰 동영상은 썸네일로 바뀌어요).</p></details>
        <details><summary>다른 반 갤러리에 올려야 해요.</summary><p>③단계 ‘우리 반 갤러리’에서 <b>🔄 다른 갤러리로 바꾸기</b>를 누르거나, 그 반 갤러리 QR을 한 번 열면 바뀌어요. 공유 창에 올라갈 갤러리 이름이 보이니 확인하세요.</p></details>
        <details><summary>인터넷이 없는 곳에서도 쓸 수 있나요?</summary><p>포트폴리오 만들기는 한 번 열어 두면 대부분 동작해요. 갤러리 올리기·보기는 인터넷이 필요해요.</p></details>
        <details><summary>친구 작품에 댓글을 달 수 있나요?</summary><p>네. 갤러리의 작품마다 <b>💬 댓글</b> 칸이 있어요. 댓글이 많아져도 그 작품 칸 안에서만 스크롤되니 갤러리가 길어지지 않아요. 작품을 새 파일로 바꿔 올려도(🚀 다시 공유하기·‘바꾸기’) 댓글은 그대로 남아요.</p></details>
        <details><summary>선생님이 작품이나 댓글을 지울 수 있나요?</summary><p>네. 갤러리 위쪽 <b>🔑 선생님</b>을 누르고 시트 ‘설정’ 탭의 <b>선생님 관리 코드</b>를 적으면, 그 기기에서 모든 작품과 댓글에 지우기 버튼이 생겨요. 시트에서 줄을 지우거나 ‘숨김’에 TRUE를 적어도 돼요.</p></details>
        <details><summary>오류가 생기거나 좋은 생각이 있어요.</summary><p>화면 오른쪽 아래 <b>🐞 오류 신고</b> 버튼이나 아래 링크로 알려 주세요. 다있쌤이 확인해요.</p></details>
      </div>
    </section>
  </main>

  <footer class="gd-footer">
    <div class="gd-maker">
      <span class="dy-logo" aria-hidden="true"><span>다있</span><b>쌤</b></span>
      <div>
        <small>만든 사람</small>
        <b>${esc(MAKER.name)}</b>
      </div>
    </div>
    <div class="gd-footer-links">
      <a class="btn" href="${esc(MAKER.toolsUrl)}" target="_blank" rel="noopener">🧰 다있쌤 툴 더 보기 (hwansang.kr/tools) ↗</a>
      <button type="button" class="btn" data-act="bug">🐞 오류 신고 · 개선 의견</button>
    </div>
    <p class="gd-copy">© ${new Date().getFullYear()} ${esc(MAKER.name)} · 학생 작업은 각자의 기기에만 저장됩니다.</p>
  </footer>

  <div class="gd-qr-big" id="gd-qr-big" hidden role="dialog" aria-modal="true" aria-label="학생 접속 QR">
    <div class="gd-qr-big-card">
      <p>📷 카메라로 찍어서 들어오세요</p>
      <div class="gd-qr">${qrSvg(studentUrl)}</div>
      <p class="gd-qr-big-url">${esc(studentUrl)}</p>
      <button type="button" class="btn btn-lg" data-act="qr-close">닫기</button>
    </div>
  </div>
  <div class="toast" id="gd-toast" role="status" aria-live="polite"></div>`;
}

let toastTimer;
function toast(msg) {
  const el = document.getElementById('gd-toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

async function copy(text) {
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

render();
document.addEventListener('click', async (e) => {
  const copyBtn = e.target.closest('[data-copy]');
  if (copyBtn) return toast((await copy(copyBtn.dataset.copy)) ? '📋 주소를 복사했어요.' : '복사하지 못했어요.');
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'qr-big') document.getElementById('gd-qr-big').hidden = false;
  else if (act === 'qr-close' || e.target.id === 'gd-qr-big') document.getElementById('gd-qr-big').hidden = true;
  else if (act === 'bug') openBugReport();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.getElementById('gd-qr-big').hidden = true;
});
setBugScreen('안내 사이트');
export { galleryUrl, studentUrl };
