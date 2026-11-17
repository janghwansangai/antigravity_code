/**
 * 우리 반 작품 갤러리 - 링크 모음 서버 (Google Apps Script)
 *
 * 선생님의 구글 시트에 붙여서 '웹 앱'으로 배포합니다.
 *   - 학생: 갤러리 페이지에서 구글 드라이브 공유 링크를 올림 → 이 시트의 '작품' 탭에 한 줄씩 쌓임
 *   - 갤러리: 이 웹 앱에서 목록을 받아 카드로 보여 줌
 *   - 선생님: 시트에서 줄을 지우거나 '숨김' 칸을 체크하면 갤러리에서 사라짐
 *
 * 📖 포트폴리오 보기: 학생이 올린 링크가 ZIP·웹페이지(.html)·프로젝트 파일(.portfolio)이면
 *   갤러리가 이 웹 앱을 통해 파일을 조금씩 받아 브라우저 안에서 펼쳐 보여 줍니다.
 *   - 갤러리에 올라온(숨기지 않은) 링크의 파일만 읽습니다. 다른 드라이브 파일은 읽지 않습니다.
 *   - 선생님 계정으로 읽으므로, 드라이브 공유는 '우리 학교 사용자'로 두어도 됩니다
 *     (선생님이 그 파일을 볼 수 있어야 함: 학급 공유 드라이브·폴더에 올리면 됨).
 *
 * 설정은 '설정' 탭에서 바꿉니다(처음 실행할 때 자동으로 만들어짐).
 *   갤러리 제목 | 학급 코드(비워 두면 코드 없이 올리기) | 올리기 허용(TRUE/FALSE)
 *
 * 배포: 확장 프로그램 → Apps Script → 이 코드 붙여넣기 → 배포 → 새 배포 → 유형 '웹 앱'
 *       실행 사용자: 나 / 액세스 권한: 모든 사용자 → 배포 → 웹 앱 URL 복사
 */

var ITEMS_SHEET = '작품';
var SETTINGS_SHEET = '설정';
var HEADERS = ['올린 시간', '번호', '이름', '제목', '링크', '설명', '숨김', '삭제 열쇠', '파일 이름', '파일 종류', '파일 크기'];
var MAX = { name: 20, title: 60, link: 500, desc: 200 };
var MAX_ITEMS = 2000;
var VIEW_TYPES = { zip: true, portfolio: true, html: true }; // 📖 보기로 펼칠 수 있는 종류
var MAX_VIEW_BYTES = 200 * 1024 * 1024; // 보기로 받을 수 있는 최대 크기
var CHUNK_MAX = 4 * 1024 * 1024; // 한 번에 보내는 크기(받는 쪽에서 이어 붙임)
var LIST_CACHE_SEC = 20; // 여러 학생이 한꺼번에 열어도 시트를 매번 읽지 않도록 잠깐 기억

function doGet(e) {
  var params = (e && e.parameter) || {};
  var result;
  try {
    result = params.action === 'file' ? readFileChunk_(params) : cachedList_();
  } catch (err) {
    result = { ok: false, error: '읽지 못했어요: ' + err };
  }
  return output_(result, params.callback);
}

function doPost(e) {
  var body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return output_({ ok: false, error: '보낸 내용을 읽을 수 없어요.' });
  }
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000); // 여러 학생이 동시에 올려도 한 줄씩 차례로
  } catch (err) {
    return output_({ ok: false, error: '지금 올리는 친구가 많아요. 잠시 뒤 다시 눌러 주세요.' });
  }
  try {
    if (body.action === 'add') return output_(forgetList_(addItem_(body)));
    if (body.action === 'delete') return output_(forgetList_(deleteItem_(body)));
    return output_({ ok: false, error: '알 수 없는 요청이에요.' });
  } catch (err) {
    return output_({ ok: false, error: '처리하지 못했어요: ' + err });
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- 목록 ---------------- */
function cachedList_() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get('list');
  if (hit) return JSON.parse(hit);
  var result = listItems_();
  var json = JSON.stringify(result);
  if (json.length < 90000) cache.put('list', json, LIST_CACHE_SEC); // 캐시 한 칸은 100KB까지
  return result;
}

function forgetList_(result) {
  if (result && result.ok) CacheService.getScriptCache().remove('list');
  return result;
}

function listItems_() {
  var settings = readSettings_();
  var sheet = itemsSheet_();
  var last = sheet.getLastRow();
  var rows = last > 1 ? sheet.getRange(2, 1, last - 1, HEADERS.length).getValues() : [];
  var items = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (!r[1] || isTrue_(r[6])) continue; // 번호 없음 또는 숨김
    items.push({
      time: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
      id: String(r[1]),
      name: String(r[2]),
      title: String(r[3]),
      link: String(r[4]),
      desc: String(r[5]),
      fileName: String(r[8] || ''),
      fileType: String(r[9] || ''),
      size: Number(r[10]) || 0
    });
  }
  items.reverse(); // 최근 것부터
  return { ok: true, title: settings.title, needCode: !!settings.code, open: settings.open, items: items };
}

/* ---------------- 올리기 ---------------- */
function addItem_(b) {
  var settings = readSettings_();
  if (!settings.open) return { ok: false, error: '지금은 올리기가 닫혀 있어요. 선생님께 여쭤 보세요.' };
  if (settings.code && String(b.code || '').trim() !== settings.code) return { ok: false, error: '학급 코드가 맞지 않아요.', field: 'code' };
  var name = clean_(b.name, MAX.name);
  var title = clean_(b.title, MAX.title);
  var link = String(b.link || '').trim();
  var desc = clean_(b.desc, MAX.desc);
  if (!name) return { ok: false, error: '이름을 적어 주세요.', field: 'name' };
  if (!title) return { ok: false, error: '제목을 적어 주세요.', field: 'title' };
  if (!/^https?:\/\/[^\s]+$/i.test(link) || link.length > MAX.link) return { ok: false, error: '링크가 올바르지 않아요. https:// 로 시작하는 주소를 붙여 넣어 주세요.', field: 'link' };

  var sheet = itemsSheet_();
  if (sheet.getLastRow() - 1 >= MAX_ITEMS) return { ok: false, error: '갤러리가 가득 찼어요. 선생님께 말씀드려 주세요.' };
  // 글자로 시작해야 시트가 숫자(예: 12e45…)로 바꾸지 않음
  var id = 'p' + Utilities.getUuid().replace(/-/g, '').slice(0, 11);
  var token = Utilities.getUuid();
  // 드라이브 파일이면 이름·종류·크기를 미리 적어 둠(선생님이 볼 수 없으면 학생에게 공유 설정을 알려 줌)
  var meta = { name: '', type: '', size: '' };
  var warning = '';
  var fileId = driveId_(link);
  if (fileId) {
    try {
      var f = DriveApp.getFileById(fileId);
      meta = { name: f.getName(), type: fileType_(f.getName(), f.getMimeType()), size: f.getSize() };
    } catch (err) {
      warning = '선생님이 이 파일을 열 수 없어요. 드라이브 공유를 ‘링크가 있는 우리 학교 사용자(또는 모든 사용자)’로 바꾸거나 학급 드라이브 폴더에 올려 주세요.';
    }
  }
  // 학생이 쓴 글은 모두 '글자'로 저장(수식 실행·날짜/숫자 자동 변환 막기)
  sheet.appendRow([new Date(), safe_(id), safe_(name), safe_(title), safe_(link), safe_(desc), false, safe_(token), safe_(meta.name), meta.type, meta.size]);
  return { ok: true, id: id, token: token, warning: warning, fileType: meta.type };
}

/* ---------------- 지우기(올린 사람만) ---------------- */
function deleteItem_(b) {
  var id = String(b.id || '');
  var token = String(b.token || '');
  if (!id || !token) return { ok: false, error: '지울 작품을 찾을 수 없어요.' };
  var sheet = itemsSheet_();
  var last = sheet.getLastRow();
  if (last < 2) return { ok: false, error: '지울 작품을 찾을 수 없어요.' };
  var rows = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  for (var i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i][1]) === id) {
      if (String(rows[i][7]) !== token) return { ok: false, error: '내가 올린 작품만 지울 수 있어요.' };
      sheet.deleteRow(i + 2);
      return { ok: true };
    }
  }
  return { ok: false, error: '이미 지워졌어요.' };
}

/* ---------------- 📖 보기용 파일 나눠 보내기 ---------------- */
function readFileChunk_(p) {
  var item = String(p.item || '');
  var start = Math.max(0, parseInt(p.start, 10) || 0);
  var len = Math.min(CHUNK_MAX, Math.max(1, parseInt(p.len, 10) || CHUNK_MAX));
  if (!/^[\w-]{4,40}$/.test(item)) return { ok: false, error: '작품 번호가 올바르지 않아요.' };

  // 갤러리에 올라온(숨기지 않은) 작품의 드라이브 파일만 읽음
  var sheet = itemsSheet_();
  var last = sheet.getLastRow();
  var rows = last > 1 ? sheet.getRange(2, 1, last - 1, HEADERS.length).getValues() : [];
  var id = '';
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][1]) === item && !isTrue_(rows[i][6])) {
      id = driveId_(String(rows[i][4]));
      break;
    }
  }
  if (!id) return { ok: false, error: '갤러리에 올라온 드라이브 파일만 볼 수 있어요.' };

  var file = DriveApp.getFileById(id);
  var name = file.getName();
  var type = fileType_(name, file.getMimeType());
  var size = file.getSize();
  if (!VIEW_TYPES[type]) return { ok: false, error: '이 파일은 ‘열기’로 봐 주세요.', type: type };
  if (size > MAX_VIEW_BYTES) return { ok: false, error: '파일이 너무 커서(200MB 초과) 갤러리에서 바로 볼 수 없어요.' };
  if (start >= size) return { ok: true, name: name, type: type, size: size, start: start, data: '' };
  var end = Math.min(size, start + len) - 1;

  var bytes;
  try {
    // 필요한 부분만 받기(큰 파일도 메모리를 아낌)
    var res = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '?alt=media&supportsAllDrives=true', {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), Range: 'bytes=' + start + '-' + end },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 206 && res.getResponseCode() !== 200) throw new Error('HTTP ' + res.getResponseCode());
    bytes = res.getContent();
    if (res.getResponseCode() === 200 && bytes.length > end - start + 1) bytes = bytes.slice(start, end + 1);
  } catch (err) {
    bytes = file.getBlob().getBytes().slice(start, end + 1);
  }
  return { ok: true, name: name, type: type, size: size, start: start, data: Utilities.base64Encode(bytes) };
}

function driveId_(link) {
  var m = String(link).match(/^https?:\/\/(?:drive|docs)\.google\.com\/(?:.*?\/)?(?:file|document|presentation|spreadsheets)\/(?:u\/\d+\/)?d\/([\w-]{10,})/) ||
    String(link).match(/^https?:\/\/(?:drive|docs)\.google\.com\/.*[?&]id=([\w-]{10,})/);
  return m ? m[1] : '';
}

function fileType_(name, mime) {
  var n = String(name).toLowerCase();
  if (/\.portfolio$/.test(n)) return 'portfolio';
  if (/\.zip$/.test(n) || /zip/.test(mime)) return 'zip';
  if (/\.html?$/.test(n) || mime === 'text/html') return 'html';
  if (/\.pdf$/.test(n) || mime === 'application/pdf') return 'pdf';
  if (/^image\//.test(mime)) return 'image';
  if (/^video\//.test(mime)) return 'video';
  if (/google-apps/.test(mime)) return 'google';
  return 'file';
}

/* ---------------- 시트 · 설정 ---------------- */
function itemsSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(ITEMS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(ITEMS_SHEET);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function readSettings_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SETTINGS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(SETTINGS_SHEET);
    sheet.getRange(1, 1, 3, 2).setValues([
      ['갤러리 제목', '우리 반 작품 갤러리'],
      ['학급 코드', ''],
      ['올리기 허용', true]
    ]);
  }
  var v = sheet.getRange(1, 2, 3, 1).getValues();
  return {
    title: String(v[0][0] || '우리 반 작품 갤러리'),
    code: String(v[1][0] || '').trim(),
    open: v[2][0] === '' ? true : isTrue_(v[2][0])
  };
}

/* ---------------- 도우미 ---------------- */
function clean_(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

/**
 * 앞에 ' 를 붙여 시트가 '글자 그대로' 저장하게 함 (' 는 칸에 보이지 않고 값에도 들어가지 않음)
 *   - '=IMPORTXML(…)' 같은 수식이 실행되지 않음
 *   - '6/12'(날짜), '0012'(숫자) 같은 제목·번호가 바뀌지 않음
 */
function safe_(v) {
  var s = String(v == null ? '' : v);
  return s ? "'" + s : '';
}

function isTrue_(v) {
  return v === true || /^(true|yes|y|o|1|예|네|숨김)$/i.test(String(v).trim());
}

function output_(obj, callback) {
  var json = JSON.stringify(obj);
  if (callback && /^[A-Za-z_$][\w$]{0,40}$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
