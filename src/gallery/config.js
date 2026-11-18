/**
 * 선생님 '갤러리 만들기' 설정
 *
 * 📋 갤러리 템플릿 시트: 다있쌤이 만든 템플릿 구글 시트(코드·권한 설정이 들어 있음)의 주소나 번호.
 *    선생님은 이 시트를 '사본 만들기' 한 뒤 배포만 하면 갤러리가 생깁니다(코드 붙여넣기 없음).
 *    비어 있으면 갤러리 만들기 화면에 '직접 만들기(코드 붙여넣기)' 안내만 보여요.
 *    예: 'https://docs.google.com/spreadsheets/d/1AbC…xyz/edit'
 */
export const TEMPLATE_SHEET = '';

/** 시트 주소 → 번호 */
export function templateId(text = TEMPLATE_SHEET) {
  const s = String(text || '').trim();
  const m = s.match(/\/spreadsheets\/d\/([\w-]{20,})/) || s.match(/^([\w-]{20,})$/);
  return m ? m[1] : '';
}
