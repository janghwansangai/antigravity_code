/**
 * 🐞 오류 신고 연동 (다있쌤 오류 취합 센터)
 *
 * 각 HTML의 <head>에 신고 위젯 스크립트가 한 번씩 들어 있습니다(index.html · gallery.html · guide.html).
 * 위젯이 화면 오른쪽 아래에 '🐞 오류 신고' 버튼을 만들고, 여기서는
 *   - 화면이 바뀔 때 화면 이름만 알려 주고(setContext — 이름·작품 내용 같은 개인정보는 넣지 않음)
 *   - 메뉴의 '오류 신고'를 누르면 위젯 창을 엽니다(위젯이 막혀 있으면 신고 페이지를 새 창으로).
 * 비밀 키는 필요 없습니다.
 */
const REPORT_URL = 'https://script.google.com/macros/s/AKfycbxsRD7vRlEP9oKlvlDDPww8cYaDadTTIp1KrqYWSVU5qE5_gUh3bNUskBhHDlXH6FskvA/exec';
const APP_ID = 'portpolio';
const APP_VERSION = '1.0.0';

let current = '';

/** 지금 화면 이름 알리기 (예: '학생앱 ② 활동 편집') */
export function setBugScreen(screen) {
  if (!screen || screen === current) return;
  current = screen;
  try {
    if (window.BugReporter) window.BugReporter.setContext({ screen });
  } catch {
    /* 신고 위젯이 없어도 앱은 그대로 */
  }
}

/** 메뉴의 '🐞 오류 신고' */
export function openBugReport() {
  try {
    if (window.BugReporter && window.BugReporter.open) {
      window.BugReporter.open();
      return;
    }
  } catch {
    /* 아래 새 창으로 */
  }
  const url = `${REPORT_URL}?app=${APP_ID}&v=${encodeURIComponent(APP_VERSION)}${current ? `&where=${encodeURIComponent(current)}` : ''}`;
  window.open(url, '_blank', 'noopener');
}

// 위젯은 defer로 늦게 불러지므로, 다 불러진 뒤 지금 화면 이름을 한 번 더 알림
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    const s = current;
    current = '';
    setBugScreen(s);
  });
}
