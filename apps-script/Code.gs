/**
 * 우리 반 작품 갤러리 - 서버 (Google Apps Script) · 버전 4
 *
 * 선생님의 구글 시트에 붙여서 '웹 앱'으로 배포합니다.
 *   - 학생: 포트폴리오 앱의 [🚀 갤러리에 공유하기] 또는 갤러리의 [＋ 내 작품 올리기]
 *           → 파일이 이 갤러리가 만든 '작품 폴더'에 저장되고, 이 시트에 한 줄씩 쌓임
 *           (학생 자신의 구글 드라이브 공유 링크를 붙여 넣는 것도 됨)
 *   - 갤러리: 이 웹 앱에서 목록·썸네일·작품 파일을 받아 보여 줌
 *   - 선생님: 시트에서 줄을 지우거나 '숨김' 칸에 TRUE를 적으면 갤러리에서 사라짐
 *             갤러리 화면의 🔑 선생님(설정 탭의 '선생님 관리 코드')으로 작품·댓글을 바로 지울 수도 있음
 *   - 💬 댓글: 작품마다 댓글('댓글' 탭에 쌓임). 학생이 작품을 새 파일로 바꿔 올려도 댓글은 그대로
 *
 * 🔒 보안: 함께 붙여 넣는 appsscript.json이 이 코드가 쓸 수 있는 권한을 딱 세 가지로 묶습니다.
 *   - spreadsheets.currentonly : 이 시트 하나만 (다른 스프레드시트는 못 봄)
 *   - drive.file               : 이 갤러리가 직접 만든 폴더·파일만 (선생님 드라이브의 다른 파일은 목록도 내용도 못 봄)
 *   - script.external_request  : 구글 드라이브에 파일을 올리고 읽는 연결
 *   이 코드에는 DriveApp(드라이브 전체 권한)를 쓰는 곳이 없습니다.
 *   '준비하기'를 실행하면 실제 권한을 확인해 결과를 알려 줍니다.
 *
 * 설정은 '설정' 탭에서 바꿉니다(처음 실행할 때 자동으로 만들어짐).
 *   갤러리 제목 | 학급 코드 | 올리기 허용 | 작품 폴더(자동, 드라이브에서 원하는 곳으로 옮겨도 됨) | 파일 링크 공유 | 저장 용량 한도(GB)
 *   | 댓글 허용 | 선생님 관리 코드(자동으로 만듦, 바꿔도 됨)
 *
 * 처음 설치(자세한 안내는 갤러리 만들기 화면):
 *   ⭐ 쉬운 방법: 갤러리 템플릿 시트를 '사본 만들기' → 확장 프로그램 → Apps Script → 배포 → 새 배포 → 웹 앱
 *      (실행 사용자 '나', 액세스 '모든 사용자') → 권한 허용 → 웹 앱 URL 복사. 코드 붙여넣기 필요 없음.
 *   직접 만들기: 이 코드와 appsscript.json 붙여넣기 → 💾 저장 → 위와 같이 배포
 *   첫 연결 때 작품 폴더·선생님 관리 코드·권한 확인이 저절로 준비됩니다('준비하기'는 실행하지 않아도 됨).
 *   시트를 복사해 새 갤러리를 만들면, 복사본은 관리 코드·작품 폴더를 새로 만듭니다(원본과 섞이지 않음).
 * 코드를 바꾼 뒤: '준비하기' ▶ 실행 → 배포 → 배포 관리 → ✏️ 수정 → 버전 '새 버전' → 배포 (주소는 그대로)
 */

var VERSION = 4;
var ITEMS_SHEET = '작품';
var SETTINGS_SHEET = '설정';
var HEADERS = ['올린 시간', '번호', '이름', '제목', '링크', '설명', '숨김', '삭제 열쇠', '파일 이름', '파일 종류', '파일 크기', '올린 방식', '썸네일'];
var COL = { time: 0, id: 1, name: 2, title: 3, link: 4, desc: 5, hidden: 6, token: 7, fileName: 8, fileType: 9, size: 10, via: 11, thumb: 12 };
var MAX = { name: 20, title: 60, link: 500, desc: 200, fileName: 120, thumb: 45000, comment: 300 };
var COMMENTS_SHEET = '댓글';
var C_HEADERS = ['올린 시간', '댓글 번호', '작품 번호', '이름', '내용', '숨김', '삭제 열쇠'];
var CCOL = { time: 0, id: 1, item: 2, name: 3, text: 4, hidden: 5, token: 6 };
var MAX_COMMENTS = 20000; // 갤러리 전체 댓글 수
var COMMENTS_SHOWN = 200; // 작품 하나에 보여 주는 최근 댓글 수
var ADMIN_FAIL_PER_MIN = 10; // 관리 코드를 1분에 이만큼 틀리면 잠시 막음
var CACHE_PART = 25000; // 캐시 한 칸(100KB)에 한글이 넘치지 않게 나눠 담는 글자 수
var MAX_ITEMS = 2000;
var VIEW_TYPES = { zip: true, portfolio: true, html: true, pdf: true }; // 📖 보기로 펼칠 수 있는 종류
var MAX_VIEW_BYTES = 200 * 1024 * 1024; // 보기로 받을 수 있는 최대 크기
var CHUNK_MAX = 4 * 1024 * 1024; // 보기: 한 번에 보내는 크기(받는 쪽에서 이어 붙임)
var MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 올리기: 한 파일 최대 크기
var SINGLE_UPLOAD_MAX = 6 * 1024 * 1024; // 이보다 작으면 한 번에, 크면 4MB씩 나눠 올림
var UPLOAD_CHUNK = 4 * 1024 * 1024; // 나눠 올리기 크기(256KB의 배수여야 함)
var DEFAULT_TOTAL_GB = 3; // 이 갤러리에 올릴 수 있는 전체 용량(설정에서 바꿈)
var RATE_PER_MIN = 120; // 1분에 받는 올리기 요청 수(낯선 사람이 마구 올리는 것 막기)
var LIST_CACHE_SEC = 20; // 여러 학생이 한꺼번에 열어도 시트를 매번 읽지 않도록 잠깐 기억
var FOLDER_NAME = '우리 반 갤러리 작품';
var FOLDER_MIME = 'application/vnd.google-apps.folder';
var DRIVE = 'https://www.googleapis.com/drive/v3/';
var DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/';
var SAFE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets.currentonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/script.external_request'
];

/** 처음 한 번(그리고 코드를 바꾼 뒤): 위 함수 목록에서 이 함수를 고르고 ▶ 실행 → 권한 허용 */
function 준비하기() {
  var r = ensureReady_(true);
  var check = r.check;
  Logger.log('작품 폴더: ' + folderUrl_(r.folderId));
  Logger.log(check.safe
    ? '🔒 권한 확인 완료: 이 시트와 갤러리가 만든 파일만 다룹니다(선생님 드라이브의 다른 파일은 볼 수 없음).'
    : '⚠️ 권한이 너무 넓어요: ' + check.extra.join(', ') + ' — appsscript.json을 갤러리 안내대로 붙여 넣고 다시 실행해 주세요.');
  if (!check.safe) throw new Error('appsscript.json 설정을 확인해 주세요(권한이 너무 넓음).');
}

/**
 * 처음 한 번 준비(첫 목록 요청 때 저절로 실행): 탭·작품 폴더·관리 코드 만들기, 실제 권한 확인
 * force가 아니면 이미 준비된 경우 아무것도 하지 않음
 */
function ensureReady_(force) {
  var props = PropertiesService.getScriptProperties();
  var cache = CacheService.getScriptCache();
  var done = function () {
    return props.getProperty('READY') === String(VERSION) && props.getProperty('SAFE_SCOPES') === '1';
  };
  if (!force && done()) return null;
  // 권한이 아직 넓다고 나왔으면(appsscript.json 빠짐) 10분마다만 다시 확인
  if (!force && props.getProperty('READY') === String(VERSION) && cache.get('scopeCheck')) return null;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return null; // 동시에 처음 열려도 폴더를 두 번 만들지 않게
  try {
    if (!force && done()) return null;
    readSettings_();
    itemsSheet_();
    commentsSheet_();
    var check = checkScopes_();
    var folderId = check.safe || force ? uploadFolder_() : '';
    props.setProperty('READY', String(VERSION));
    props.setProperty('SAFE_SCOPES', check.safe ? '1' : '0');
    cache.put('scopeCheck', '1', 600);
    cache.remove('list');
    return { check: check, folderId: folderId };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 시트를 복사해 만든 갤러리인지 확인 → 복사본이면 관리 코드·작품 폴더·준비 상태를 새로
 * (원본의 관리 코드나 폴더를 그대로 쓰지 않게)
 */
function checkCopy_(ss, sheet) {
  var props = PropertiesService.getScriptProperties();
  var id = ss.getId();
  var saved = props.getProperty('SHEET_ID');
  if (saved === id) return;
  if (saved) {
    ['READY', 'SAFE_SCOPES', 'UPLOAD_FOLDER_ID', 'ADMIN_INIT'].forEach(function (k) {
      props.deleteProperty(k);
    });
    if (sheet) {
      sheet.getRange(4, 2, 1, 2).setValues([['', '']]);
      sheet.getRange(8, 2).setValue('');
    }
  }
  props.setProperty('SHEET_ID', id);
}

/** '준비하기'와 같음 (함수 목록에 한글 이름이 안 보이면 이것을 실행) */
function setup() {
  준비하기();
}

/** 지금 이 코드가 가진 권한이 안전한 세 가지뿐인지 확인 */
function checkScopes_() {
  var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?access_token=' + encodeURIComponent(ScriptApp.getOAuthToken()), { muteHttpExceptions: true });
  var scopes = res.getResponseCode() === 200 ? String(JSON.parse(res.getContentText()).scope || '').split(/\s+/) : [];
  var extra = scopes.filter(function (s) { return s && SAFE_SCOPES.indexOf(s) < 0; });
  var missing = SAFE_SCOPES.filter(function (s) { return scopes.indexOf(s) < 0; });
  return { safe: scopes.length > 0 && extra.length === 0 && missing.length === 0, extra: extra, missing: missing };
}

function doGet(e) {
  var params = (e && e.parameter) || {};
  var result;
  try {
    if (params.action === 'file') result = readFileChunk_(params);
    else if (params.action === 'thumbs') result = readThumbs_(params);
    else result = cachedList_();
  } catch (err) {
    result = { ok: false, error: '읽지 못했어요. 잠시 뒤 다시 해 주세요.' };
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
  try {
    if (body.action === 'add') return output_(forgetList_(withLock_(function () { return addItem_(body); })));
    if (body.action === 'delete') return output_(forgetList_(withLock_(function () { return deleteItem_(body); })));
    if (body.action === 'upload') return output_(forgetList_(uploadSingle_(body)));
    if (body.action === 'uploadStart') return output_(uploadStart_(body));
    if (body.action === 'uploadChunk') return output_(forgetList_(uploadChunk_(body)));
    if (body.action === 'comment') return output_(forgetList_(withLock_(function () { return addComment_(body); })));
    if (body.action === 'deleteComment') return output_(forgetList_(withLock_(function () { return removeComment_(String(body.id || ''), String(body.token || '')); })));
    if (body.action === 'admin') return output_(forgetList_(withLock_(function () { return admin_(body); })));
    return output_({ ok: false, error: '알 수 없는 요청이에요.' });
  } catch (err) {
    return output_({ ok: false, error: '처리하지 못했어요. 잠시 뒤 다시 해 주세요.' });
  }
}

/** 시트에 쓰는 일은 한 번에 하나씩 (여러 학생이 동시에 올려도 줄이 섞이지 않게) */
function withLock_(fn) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return { ok: false, error: '지금 올리는 친구가 많아요. 잠시 뒤 다시 눌러 주세요.' };
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- 구글 드라이브 (이 갤러리가 만든 파일만: drive.file) ---------------- */
function api_(method, url, body, headers) {
  var opt = { method: method, muteHttpExceptions: true, headers: headers || {} };
  opt.headers.Authorization = 'Bearer ' + ScriptApp.getOAuthToken();
  if (body !== undefined) {
    opt.contentType = 'application/json; charset=UTF-8';
    opt.payload = JSON.stringify(body);
  }
  return UrlFetchApp.fetch(url, opt);
}

function apiJson_(method, url, body) {
  var res = api_(method, url, body);
  var code = res.getResponseCode();
  var text = res.getContentText();
  return { code: code, data: code >= 200 && code < 300 && text ? JSON.parse(text) : null };
}

/** 파일 정보 (이 갤러리가 만든 파일이 아니면 드라이브가 '없음'으로 답함 → null) */
function fileMeta_(id) {
  if (!/^[\w-]{10,}$/.test(String(id || ''))) return null;
  return apiJson_('get', DRIVE + 'files/' + encodeURIComponent(id) + '?fields=id,name,mimeType,size,trashed&supportsAllDrives=true').data;
}

function folderUrl_(id) {
  return 'https://drive.google.com/drive/folders/' + id;
}

/**
 * 학생 작품을 저장할 폴더(이 갤러리가 만든 폴더)
 * 선생님은 드라이브에서 이 폴더를 원하는 곳(학급 폴더 등)으로 옮기거나 이름을 바꿔도 됩니다. 옮겨도 계속 이 폴더에 저장됩니다.
 */
function uploadFolder_() {
  var settings = readSettings_();
  var props = PropertiesService.getScriptProperties();
  var cache = CacheService.getScriptCache();
  var saved = props.getProperty('UPLOAD_FOLDER_ID');
  var ids = [settings.folder, saved];
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i];
    if (!id) continue;
    var good = !!cache.get('folderOk:' + id);
    if (!good) {
      var meta = fileMeta_(id);
      good = !!(meta && meta.mimeType === FOLDER_MIME && !meta.trashed);
      if (good) cache.put('folderOk:' + id, '1', 600);
    }
    if (good) {
      if (id !== saved) props.setProperty('UPLOAD_FOLDER_ID', id);
      if (id !== settings.folder) writeFolderCell_(id, settings.folder ? 'other' : '');
      return id;
    }
  }
  var made = apiJson_('post', DRIVE + 'files?fields=id&supportsAllDrives=true', { name: FOLDER_NAME, mimeType: FOLDER_MIME });
  if (!made.data) throw new Error('작품 폴더를 만들지 못했어요(' + made.code + '). appsscript.json을 확인하고 준비하기를 다시 실행해 주세요.');
  props.setProperty('UPLOAD_FOLDER_ID', made.data.id);
  cache.put('folderOk:' + made.data.id, '1', 600);
  writeFolderCell_(made.data.id, settings.folder ? 'other' : '');
  return made.data.id;
}

function writeFolderCell_(id, why) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SETTINGS_SHEET);
  if (!sheet) return;
  sheet.getRange(4, 2).setValue(folderUrl_(id));
  sheet
    .getRange(4, 3)
    .setValue(
      why === 'other'
        ? '적어 둔 폴더는 이 갤러리가 만든 폴더가 아니라서 쓸 수 없어요(보안: 갤러리는 자기가 만든 폴더만 다룸). 위 폴더를 드라이브에서 원하는 곳으로 옮겨 쓰세요.'
        : '이 폴더를 드라이브에서 원하는 곳으로 옮기거나 이름을 바꿔도 계속 여기에 저장돼요.'
    );
}

/** 이어 올리기 시작 → 드라이브가 주는 올리기 주소 */
function startSession_(v, folderId) {
  var res = api_(
    'post',
    DRIVE_UPLOAD + 'files?uploadType=resumable&supportsAllDrives=true&fields=id,name,mimeType,size',
    { name: v.fileName, parents: [folderId], mimeType: v.mimeType },
    { 'X-Upload-Content-Type': v.mimeType, 'X-Upload-Content-Length': String(v.size) }
  );
  var h = res.getAllHeaders();
  var session = h.Location || h.location;
  if (res.getResponseCode() !== 200 || !session) throw new Error('session ' + res.getResponseCode());
  return String(session);
}

/** 한 조각 올리기 → { done, next, info } */
function putChunk_(session, bytes, start, total, mimeType) {
  var end = start + bytes.length - 1;
  var res = UrlFetchApp.fetch(session, {
    method: 'put',
    contentType: mimeType,
    payload: bytes,
    headers: { 'Content-Range': 'bytes ' + start + '-' + end + '/' + total },
    muteHttpExceptions: true,
    followRedirects: false
  });
  var code = res.getResponseCode();
  if (code === 308) {
    var h = res.getAllHeaders();
    var m = String(h.Range || h.range || '').match(/bytes=0-(\d+)/);
    return { done: false, next: m ? Number(m[1]) + 1 : end + 1 };
  }
  if (code === 200 || code === 201) return { done: true, info: JSON.parse(res.getContentText()) };
  throw new Error('chunk ' + code);
}

/* ---------------- 목록 ---------------- */
function cachedList_() {
  var hit = cacheGetBig_('list');
  if (hit) return JSON.parse(hit);
  var result = listItems_();
  cachePutBig_('list', JSON.stringify(result), LIST_CACHE_SEC);
  return result;
}

function forgetList_(result) {
  if (result && result.ok) CacheService.getScriptCache().remove('list');
  return result;
}

/** 캐시 한 칸은 100KB까지라 긴 글(한글은 한 글자 3바이트)은 여러 칸에 나눠 담음 */
function cachePutBig_(key, text, sec) {
  var n = Math.ceil(text.length / CACHE_PART);
  if (n > 40) return; // 너무 크면 캐시하지 않음(그래도 동작)
  var parts = {};
  for (var i = 0; i < n; i++) parts[key + ':' + i] = text.substr(i * CACHE_PART, CACHE_PART);
  var cache = CacheService.getScriptCache();
  cache.putAll(parts, sec);
  cache.put(key, String(n), sec); // 조각을 다 넣은 뒤에 개수를 적음
}

function cacheGetBig_(key) {
  var cache = CacheService.getScriptCache();
  var n = Number(cache.get(key));
  if (!n) return null;
  var keys = [];
  for (var i = 0; i < n; i++) keys.push(key + ':' + i);
  var got = cache.getAll(keys);
  var text = '';
  for (var j = 0; j < n; j++) {
    if (got[keys[j]] == null) return null;
    text += got[keys[j]];
  }
  return text;
}

function readRows_() {
  var sheet = itemsSheet_();
  var last = sheet.getLastRow();
  return last > 1 ? sheet.getRange(2, 1, last - 1, HEADERS.length).getValues() : [];
}

/** 갤러리로 '파일'을 올린 줄인가 (링크로 올린 줄과 구분) */
function isFileRow_(r) {
  return String(r[COL.via] || '').indexOf('파일') === 0;
}

function listItems_() {
  readSettings_(); // 시트를 복사해 만든 갤러리인지 먼저 확인(복사본이면 준비를 새로)
  try {
    ensureReady_(false); // 첫 연결 때 한 번만 (그 뒤엔 바로 넘어감)
  } catch (err) {
    /* 준비에 실패해도 목록은 보여 줌(연결 확인 화면에 '준비 안 됨'으로 표시) */
  }
  var settings = readSettings_();
  var rows = readRows_();
  var props = PropertiesService.getScriptProperties();
  var comments = settings.comments ? readComments_() : {};
  var items = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (!r[COL.id] || isTrue_(r[COL.hidden])) continue; // 번호 없음 또는 숨김
    items.push({
      time: r[COL.time] instanceof Date ? r[COL.time].toISOString() : String(r[COL.time]),
      id: String(r[COL.id]),
      name: String(r[COL.name]),
      title: String(r[COL.title]),
      link: String(r[COL.link]),
      desc: String(r[COL.desc]),
      fileName: String(r[COL.fileName] || ''),
      fileType: String(r[COL.fileType] || ''),
      size: Number(r[COL.size]) || 0,
      via: isFileRow_(r) ? 'file' : 'link',
      private: String(r[COL.via]) === '파일(비공개)',
      thumb: !!r[COL.thumb],
      comments: comments[String(r[COL.id])] || []
    });
  }
  items.reverse(); // 최근 것부터
  return {
    ok: true,
    version: VERSION,
    ready: props.getProperty('READY') === String(VERSION),
    safeScopes: props.getProperty('SAFE_SCOPES') === '1',
    title: settings.title,
    needCode: !!settings.code,
    open: settings.open,
    canUpload: true,
    maxUpload: MAX_UPLOAD_BYTES,
    comments: settings.comments,
    admin: !!settings.adminKey,
    items: items
  };
}

/** 댓글: { 작품 번호: [{ id, time, name, text }] } (숨긴 댓글 빼고, 오래된 것부터, 작품마다 최근 200개) */
function readComments_() {
  var sheet = commentsSheet_();
  var last = sheet.getLastRow();
  var rows = last > 1 ? sheet.getRange(2, 1, last - 1, C_HEADERS.length).getValues() : [];
  var map = {};
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (!r[CCOL.id] || isTrue_(r[CCOL.hidden])) continue;
    var item = String(r[CCOL.item]);
    (map[item] = map[item] || []).push({
      id: String(r[CCOL.id]),
      time: r[CCOL.time] instanceof Date ? r[CCOL.time].toISOString() : String(r[CCOL.time]),
      name: String(r[CCOL.name]),
      text: String(r[CCOL.text])
    });
  }
  Object.keys(map).forEach(function (k) {
    if (map[k].length > COMMENTS_SHOWN) map[k] = map[k].slice(-COMMENTS_SHOWN);
  });
  return map;
}

/* ---------------- 💬 댓글 ---------------- */
function addComment_(b) {
  var settings = readSettings_();
  if (!settings.comments) return { ok: false, error: '지금은 댓글이 닫혀 있어요.' };
  if (settings.code && String(b.code || '').trim() !== settings.code) return { ok: false, error: '학급 코드가 맞지 않아요.', field: 'code' };
  var item = String(b.item || '');
  var name = clean_(b.name, MAX.name);
  var text = clean_(b.text, MAX.comment);
  if (!/^[\w-]{4,40}$/.test(item)) return { ok: false, error: '작품을 찾을 수 없어요.' };
  if (!name) return { ok: false, error: '이름을 적어 주세요.', field: 'name' };
  if (!text) return { ok: false, error: '댓글을 적어 주세요.', field: 'text' };
  if (tooBusy_()) return { ok: false, error: '지금 글을 쓰는 친구가 아주 많아요. 1분 뒤 다시 눌러 주세요.' };
  // 갤러리에 보이는(숨기지 않은) 작품에만
  var rows = readRows_();
  var found = false;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][COL.id]) === item && !isTrue_(rows[i][COL.hidden])) {
      found = true;
      break;
    }
  }
  if (!found) return { ok: false, error: '작품을 찾을 수 없어요(지워졌을 수 있어요).' };
  var sheet = commentsSheet_();
  if (sheet.getLastRow() - 1 >= MAX_COMMENTS) return { ok: false, error: '댓글이 가득 찼어요. 선생님께 말씀드려 주세요.' };
  var id = 'c' + Utilities.getUuid().replace(/-/g, '').slice(0, 11);
  var token = Utilities.getUuid();
  var now = new Date();
  sheet.appendRow([now, safe_(id), safe_(item), safe_(name), safe_(text), false, safe_(token)]);
  return { ok: true, token: token, comment: { id: id, time: now.toISOString(), name: name, text: text } };
}

/** 댓글 지우기: token이 있으면 쓴 사람만, null이면 선생님 */
function removeComment_(id, token) {
  if (!id || token === '') return { ok: false, error: '지울 댓글을 찾을 수 없어요.' };
  var sheet = commentsSheet_();
  var last = sheet.getLastRow();
  var rows = last > 1 ? sheet.getRange(2, 1, last - 1, C_HEADERS.length).getValues() : [];
  for (var i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i][CCOL.id]) !== id) continue;
    if (token !== null && String(rows[i][CCOL.token]) !== token) return { ok: false, error: '내가 쓴 댓글만 지울 수 있어요.' };
    sheet.deleteRow(i + 2);
    return { ok: true };
  }
  return { ok: false, error: '이미 지워졌어요.' };
}

/** 작품의 댓글을 모두 지움 (작품을 지울 때) */
function removeCommentsOf_(item) {
  var sheet = commentsSheet_();
  var last = sheet.getLastRow();
  if (last < 2) return;
  var rows = sheet.getRange(2, 1, last - 1, C_HEADERS.length).getValues();
  for (var i = rows.length - 1; i >= 0; i--) if (String(rows[i][CCOL.item]) === item) sheet.deleteRow(i + 2);
}

/* ---------------- 🔑 선생님(관리 코드) ---------------- */
function admin_(b) {
  var settings = readSettings_();
  var cache = CacheService.getScriptCache();
  var failKey = 'adminFail:' + Math.floor(Date.now() / 60000);
  var fails = Number(cache.get(failKey) || 0);
  if (fails >= ADMIN_FAIL_PER_MIN) return { ok: false, error: '관리 코드를 너무 많이 틀렸어요. 1분 뒤 다시 해 주세요.' };
  if (!settings.adminKey || String(b.key || '').trim() !== settings.adminKey) {
    cache.put(failKey, String(fails + 1), 120);
    return { ok: false, error: '관리 코드가 맞지 않아요. 시트 ‘설정’ 탭의 ‘선생님 관리 코드’를 확인해 주세요.', field: 'key' };
  }
  if (b.op === 'check') return { ok: true };
  if (b.op === 'deleteItem') return removeItem_(String(b.id || ''), null);
  if (b.op === 'deleteComment') return removeComment_(String(b.id || ''), null);
  return { ok: false, error: '알 수 없는 요청이에요.' };
}

/** 썸네일: ?action=thumbs&ids=a,b,c → { thumbs: { a: 'data:image/jpeg;base64,…' } } */
function readThumbs_(p) {
  var ids = String(p.ids || '')
    .split(',')
    .filter(function (x) { return /^[\w-]{4,40}$/.test(x); })
    .slice(0, 60);
  var cache = CacheService.getScriptCache();
  var keys = ids.map(function (id) { return 'th:' + id; });
  var hit = keys.length ? cache.getAll(keys) : {};
  var thumbs = {};
  var missing = [];
  ids.forEach(function (id) {
    var v = hit['th:' + id];
    if (v == null) missing.push(id);
    else if (v !== '-') thumbs[id] = v;
  });
  if (missing.length) {
    var want = {};
    missing.forEach(function (id) { want[id] = true; });
    var rows = readRows_();
    var put = {};
    for (var i = 0; i < rows.length; i++) {
      var id = String(rows[i][COL.id]);
      if (!want[id]) continue;
      var t = isTrue_(rows[i][COL.hidden]) ? '' : String(rows[i][COL.thumb] || '');
      if (t) thumbs[id] = t;
      put['th:' + id] = t || '-';
      delete want[id];
    }
    Object.keys(want).forEach(function (id) { put['th:' + id] = '-'; });
    cache.putAll(put, 600);
  }
  return { ok: true, thumbs: thumbs };
}

/* ---------------- 링크로 올리기 (학생 자신의 드라이브 파일 등) ---------------- */
function addItem_(b) {
  var v = checkPost_(b);
  if (!v.ok) return v;
  var link = String(b.link || '').trim();
  if (!/^https?:\/\/[^\s]+$/i.test(link) || link.length > MAX.link) return { ok: false, error: '링크가 올바르지 않아요. https:// 로 시작하는 주소를 붙여 넣어 주세요.', field: 'link' };
  var sheet = itemsSheet_();
  if (sheet.getLastRow() - 1 >= MAX_ITEMS) return { ok: false, error: '갤러리가 가득 찼어요. 선생님께 말씀드려 주세요.' };
  // 링크로 올린 파일은 갤러리가 열지 않음(보안) — 보는 사람의 구글 권한으로 드라이브에서 열림
  var id = newId_();
  var token = Utilities.getUuid();
  // 학생이 쓴 글은 모두 '글자'로 저장(수식 실행·날짜/숫자 자동 변환 막기)
  sheet.appendRow([new Date(), safe_(id), safe_(v.name), safe_(v.title), safe_(link), safe_(v.desc), false, safe_(token), '', '', '', '링크', '']);
  return { ok: true, id: id, token: token, fileType: '' };
}

/** 올리기 공통 확인: 열림·학급 코드·이름·제목·너무 많은 요청 */
function checkPost_(b) {
  var settings = readSettings_();
  if (!settings.open) return { ok: false, error: '지금은 올리기가 닫혀 있어요. 선생님께 여쭤 보세요.' };
  if (settings.code && String(b.code || '').trim() !== settings.code) return { ok: false, error: '학급 코드가 맞지 않아요.', field: 'code' };
  var name = clean_(b.name, MAX.name);
  var title = clean_(b.title, MAX.title);
  if (!name) return { ok: false, error: '이름을 적어 주세요.', field: 'name' };
  if (!title) return { ok: false, error: '제목을 적어 주세요.', field: 'title' };
  if (tooBusy_()) return { ok: false, error: '지금 올리는 친구가 아주 많아요. 1분 뒤 다시 눌러 주세요.' };
  return { ok: true, name: name, title: title, desc: clean_(b.desc, MAX.desc), settings: settings };
}

function tooBusy_() {
  var cache = CacheService.getScriptCache();
  var key = 'rate:' + Math.floor(Date.now() / 60000);
  var n = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(n), 120);
  return n > RATE_PER_MIN;
}

/* ---------------- 파일로 올리기 (이 갤러리의 작품 폴더에 저장) ---------------- */
function checkUpload_(b) {
  var v = checkPost_(b);
  if (!v.ok) return v;
  var size = Number(b.size);
  if (!(size > 0)) return { ok: false, error: '빈 파일은 올릴 수 없어요.' };
  if (size > MAX_UPLOAD_BYTES) return { ok: false, error: '파일이 너무 커요(' + Math.round(MAX_UPLOAD_BYTES / 1048576) + 'MB까지).' };
  var rows = readRows_();
  if (!b.replaceId && rows.length >= MAX_ITEMS) return { ok: false, error: '갤러리가 가득 찼어요. 선생님께 말씀드려 주세요.' };
  var used = 0;
  for (var i = 0; i < rows.length; i++) if (isFileRow_(rows[i])) used += Number(rows[i][COL.size]) || 0;
  if (used + size > v.settings.maxTotal) return { ok: false, error: '갤러리 저장 공간이 가득 찼어요. 선생님께 말씀드려 주세요.' };
  var fileName = clean_(b.fileName, MAX.fileName).replace(/[\\/:*?"<>|]/g, '_') || '작품';
  var mimeType = /^[\w.+-]+\/[\w.+-]+$/.test(String(b.mimeType || '')) ? String(b.mimeType) : 'application/octet-stream';
  var thumb = String(b.thumb || '');
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(thumb) || thumb.length > MAX.thumb) thumb = '';
  return {
    ok: true,
    name: v.name,
    title: v.title,
    desc: v.desc,
    shareFiles: v.settings.shareFiles,
    size: size,
    fileName: fileName,
    mimeType: mimeType,
    thumb: thumb,
    replaceId: String(b.replaceId || ''),
    replaceToken: String(b.replaceToken || '')
  };
}

/** 작은 파일: 한 번에 */
function uploadSingle_(b) {
  var v = checkUpload_(b);
  if (!v.ok) return v;
  var bytes = Utilities.base64Decode(String(b.data || ''));
  if (bytes.length !== v.size || bytes.length > SINGLE_UPLOAD_MAX) return { ok: false, error: '파일을 다 받지 못했어요. 다시 눌러 주세요.' };
  try {
    var session = startSession_(v, uploadFolder_());
    var r = putChunk_(session, bytes, 0, v.size, v.mimeType);
    if (!r.done) return { ok: false, error: '드라이브에 다 올리지 못했어요. 다시 눌러 주세요.' };
    return finishUpload_(v, r.info);
  } catch (err) {
    return { ok: false, error: '드라이브에 올리지 못했어요. 잠시 뒤 다시 해 주세요.' };
  }
}

/** 큰 파일: 드라이브 '이어 올리기'를 시작하고 번호를 돌려줌 */
function uploadStart_(b) {
  var v = checkUpload_(b);
  if (!v.ok) return v;
  var session;
  try {
    session = startSession_(v, uploadFolder_());
  } catch (err) {
    return { ok: false, error: '드라이브에 올릴 준비를 못 했어요. 잠시 뒤 다시 해 주세요.' };
  }
  var uploadId = Utilities.getUuid();
  CacheService.getScriptCache().put('up:' + uploadId, JSON.stringify({ session: session, meta: v }), 21600);
  return { ok: true, uploadId: uploadId, chunkSize: UPLOAD_CHUNK };
}

/** 큰 파일: 4MB씩 이어 올리기. 마지막 조각이면 갤러리에 등록 */
function uploadChunk_(b) {
  var cache = CacheService.getScriptCache();
  var saved = cache.get('up:' + String(b.uploadId || ''));
  if (!saved) return { ok: false, error: '올리기가 너무 오래 멈춰 있었어요. 처음부터 다시 해 주세요.' };
  var up = JSON.parse(saved);
  var start = Math.max(0, parseInt(b.start, 10) || 0);
  var bytes = Utilities.base64Decode(String(b.data || ''));
  if (!bytes.length || start + bytes.length > up.meta.size) return { ok: false, error: '조각이 올바르지 않아요.' };
  var r;
  try {
    r = putChunk_(up.session, bytes, start, up.meta.size, up.meta.mimeType);
  } catch (err) {
    return { ok: false, error: '드라이브에 올리다 멈췄어요. 다시 눌러 주세요.' };
  }
  if (!r.done) return { ok: true, done: false, next: r.next };
  cache.remove('up:' + b.uploadId);
  return finishUpload_(up.meta, r.info);
}

/** 올린 파일: (설정에 따라) 링크로 볼 수 있게 하고 갤러리에 등록(또는 전에 올린 것을 바꿈) */
function finishUpload_(v, info) {
  var shared = 'private';
  if (v.shareFiles) {
    // 이 파일 하나만 '링크가 있는 사람 보기'로 (폴더는 공유하지 않음 → 폴더 안 목록은 아무도 못 봄)
    var p = apiJson_('post', DRIVE + 'files/' + encodeURIComponent(info.id) + '/permissions?supportsAllDrives=true', { role: 'reader', type: 'anyone', allowFileDiscovery: false });
    if (p.data) shared = 'anyone';
  }
  var link = 'https://drive.google.com/file/d/' + info.id + '/view?usp=sharing';
  var type = fileType_(info.name, info.mimeType);
  var size = Number(info.size) || v.size;
  var via = shared === 'anyone' ? '파일' : '파일(비공개)';
  return withLock_(function () {
    var sheet = itemsSheet_();
    if (v.replaceId && v.replaceToken) {
      var rows = readRows_();
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i][COL.id]) !== v.replaceId) continue;
        if (String(rows[i][COL.token]) !== v.replaceToken) break; // 내 것이 아니면 새로 올림
        var oldId = isFileRow_(rows[i]) ? driveId_(String(rows[i][COL.link])) : '';
        sheet.getRange(i + 2, 1, 1, HEADERS.length).setValues([
          [new Date(), safe_(v.replaceId), safe_(v.name), safe_(v.title), safe_(link), safe_(v.desc), rows[i][COL.hidden], safe_(v.replaceToken), safe_(info.name), type, size, via, safe_(v.thumb)]
        ]);
        // 같은 작품의 옛 파일은 휴지통으로 (이 갤러리가 만든 파일만 가능)
        if (oldId && oldId !== info.id) apiJson_('patch', DRIVE + 'files/' + encodeURIComponent(oldId) + '?supportsAllDrives=true', { trashed: true });
        forgetItem_(v.replaceId);
        return { ok: true, id: v.replaceId, token: v.replaceToken, link: link, fileType: type, shared: shared, replaced: true };
      }
    }
    var id = newId_();
    var token = Utilities.getUuid();
    sheet.appendRow([new Date(), safe_(id), safe_(v.name), safe_(v.title), safe_(link), safe_(v.desc), false, safe_(token), safe_(info.name), type, size, via, safe_(v.thumb)]);
    return { ok: true, id: id, token: token, link: link, fileType: type, shared: shared };
  });
}

/* ---------------- 지우기(올린 사람만) ---------------- */
function deleteItem_(b) {
  return removeItem_(String(b.id || ''), String(b.token || ''));
}

/**
 * 작품 지우기: token이 있으면 올린 사람만(드라이브 파일은 그대로), null이면 선생님(갤러리가 올린 파일은 휴지통으로)
 * 그 작품의 댓글도 함께 지움
 */
function removeItem_(id, token) {
  if (!id || token === '') return { ok: false, error: '지울 작품을 찾을 수 없어요.' };
  var sheet = itemsSheet_();
  var rows = readRows_();
  for (var i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i][COL.id]) !== id) continue;
    if (token !== null && String(rows[i][COL.token]) !== token) return { ok: false, error: '내가 올린 작품만 지울 수 있어요.' };
    var fileId = token === null && isFileRow_(rows[i]) ? driveId_(String(rows[i][COL.link])) : '';
    sheet.deleteRow(i + 2);
    removeCommentsOf_(id);
    if (fileId) apiJson_('patch', DRIVE + 'files/' + encodeURIComponent(fileId) + '?supportsAllDrives=true', { trashed: true });
    forgetItem_(id);
    return { ok: true };
  }
  return { ok: false, error: '이미 지워졌어요.' };
}

function forgetItem_(id) {
  CacheService.getScriptCache().removeAll(['meta:' + id, 'th:' + id]);
}

/* ---------------- 📖 보기용 파일 나눠 보내기 ---------------- */
function readFileChunk_(p) {
  var item = String(p.item || '');
  var start = Math.max(0, parseInt(p.start, 10) || 0);
  var len = Math.min(CHUNK_MAX, Math.max(1, parseInt(p.len, 10) || CHUNK_MAX));
  if (!/^[\w-]{4,40}$/.test(item)) return { ok: false, error: '작품 번호가 올바르지 않아요.' };

  // 첫 조각은 늘 시트를 확인(숨기면 바로 못 봄). 같은 작품의 다음 조각은 2분 동안 기억해 둔 것으로 빠르게
  var cache = CacheService.getScriptCache();
  var meta = start > 0 ? cache.get('meta:' + item) : null;
  meta = meta ? JSON.parse(meta) : null;
  if (!meta) {
    // 갤러리에 올라온(숨기지 않은) 작품 중 '파일로 올린 것'만 읽음 — 링크로 올린 남의 파일은 읽지 않음
    var rows = readRows_();
    var id = '';
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][COL.id]) === item && !isTrue_(rows[i][COL.hidden])) {
        if (!isFileRow_(rows[i])) return { ok: false, error: '이 작품은 ‘열기’로 봐 주세요.' };
        id = driveId_(String(rows[i][COL.link]));
        break;
      }
    }
    if (!id) return { ok: false, error: '갤러리에 올라온 작품 파일만 볼 수 있어요.' };
    var info = fileMeta_(id);
    if (!info || info.trashed) return { ok: false, error: '작품 파일을 찾을 수 없어요(지워졌을 수 있어요).' };
    meta = { id: id, name: info.name, type: fileType_(info.name, info.mimeType), size: Number(info.size) || 0 };
    cache.put('meta:' + item, JSON.stringify(meta), 120);
  }
  if (!VIEW_TYPES[meta.type]) return { ok: false, error: '이 파일은 ‘열기’로 봐 주세요.', type: meta.type };
  if (meta.size > MAX_VIEW_BYTES) return { ok: false, error: '파일이 너무 커서(200MB 초과) 갤러리에서 바로 볼 수 없어요.' };
  if (start >= meta.size) return { ok: true, name: meta.name, type: meta.type, size: meta.size, start: start, data: '' };
  var end = Math.min(meta.size, start + len) - 1;
  // 필요한 부분만 받기(큰 파일도 메모리를 아낌)
  var res = api_('get', DRIVE + 'files/' + encodeURIComponent(meta.id) + '?alt=media&supportsAllDrives=true', undefined, { Range: 'bytes=' + start + '-' + end });
  var code = res.getResponseCode();
  if (code !== 206 && code !== 200) return { ok: false, error: '작품 파일을 읽지 못했어요. 잠시 뒤 다시 해 주세요.' };
  var bytes = res.getContent();
  if (code === 200 && bytes.length > end - start + 1) bytes = bytes.slice(start, end + 1);
  return { ok: true, name: meta.name, type: meta.type, size: meta.size, start: start, data: Utilities.base64Encode(bytes) };
}

function driveId_(link) {
  var m = String(link).match(/^https?:\/\/(?:drive|docs)\.google\.com\/(?:.*?\/)?(?:file|document|presentation|spreadsheets)\/(?:u\/\d+\/)?d\/([\w-]{10,})/) ||
    String(link).match(/^https?:\/\/(?:drive|docs)\.google\.com\/.*[?&]id=([\w-]{10,})/);
  return m ? m[1] : '';
}

function folderId_(text) {
  var s = String(text || '').trim();
  var m = s.match(/\/folders\/([\w-]{10,})/) || s.match(/[?&]id=([\w-]{10,})/);
  if (m) return m[1];
  return /^[\w-]{10,}$/.test(s) ? s : '';
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
    sheet.hideColumns(COL.thumb + 1); // 썸네일(긴 글자)은 숨겨 둠
  } else if (sheet.getLastColumn() < HEADERS.length) {
    // 예전 버전 시트: 새 칸 제목만 덧붙임 (기존 작품은 그대로)
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.hideColumns(COL.thumb + 1);
  }
  return sheet;
}

function commentsSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(COMMENTS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(COMMENTS_SHEET);
    sheet.appendRow(C_HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

var SETTING_ROWS = [
  ['갤러리 제목', '우리 반 작품 갤러리'],
  ['학급 코드', ''],
  ['올리기 허용', true],
  ['작품 폴더 (자동으로 만듦 · 드라이브에서 원하는 곳으로 옮겨도 됨)', ''],
  ['파일 링크 공유 (TRUE: 링크가 있으면 드라이브에서도 보기 · FALSE: 우리 갤러리에서만 보기)', true],
  ['저장 용량 한도 (GB)', DEFAULT_TOTAL_GB],
  ['댓글 허용', true],
  ['선생님 관리 코드 (갤러리 🔑 선생님 → 작품·댓글 지우기. 비우면 끔)', '']
];

function readSettings_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SETTINGS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(SETTINGS_SHEET);
    sheet.getRange(1, 1, SETTING_ROWS.length, 2).setValues(SETTING_ROWS);
  }
  checkCopy_(ss, sheet);
  var v = sheet.getRange(1, 1, SETTING_ROWS.length, 2).getValues();
  // 예전 버전 시트: 빠진 줄만 채움(선생님이 적은 값은 그대로)
  for (var i = 3; i < SETTING_ROWS.length; i++) {
    if (!v[i][0] || (i === 3 && String(v[i][0]).indexOf('비우면') >= 0)) {
      sheet.getRange(i + 1, 1).setValue(SETTING_ROWS[i][0]);
      v[i][0] = SETTING_ROWS[i][0];
      if (v[i][1] === '' && i > 3 && i !== 7) {
        sheet.getRange(i + 1, 2).setValue(SETTING_ROWS[i][1]);
        v[i][1] = SETTING_ROWS[i][1];
      }
    }
  }
  // 선생님 관리 코드: 처음 한 번만 무작위로 만듦(선생님이 나중에 비우면 '끔'으로 보고 다시 만들지 않음)
  if (v[7][1] === '') {
    var props = PropertiesService.getScriptProperties();
    if (props.getProperty('ADMIN_INIT') !== '1') {
      var key = 'T' + Utilities.getUuid().replace(/-/g, '').slice(0, 7);
      sheet.getRange(8, 2).setValue(safe_(key));
      props.setProperty('ADMIN_INIT', '1');
      v[7][1] = key;
    }
  }
  var gb = Number(v[5][1]);
  return {
    title: String(v[0][1] || '우리 반 작품 갤러리'),
    code: String(v[1][1] || '').trim(),
    open: v[2][1] === '' ? true : isTrue_(v[2][1]),
    folder: folderId_(v[3][1]),
    shareFiles: v[4][1] === '' ? true : isTrue_(v[4][1]),
    maxTotal: (gb > 0 ? gb : DEFAULT_TOTAL_GB) * 1024 * 1024 * 1024,
    comments: v[6][1] === '' ? true : isTrue_(v[6][1]),
    adminKey: String(v[7][1] || '').trim()
  };
}

/* ---------------- 도우미 ---------------- */
function newId_() {
  // 글자로 시작해야 시트가 숫자(예: 12e45…)로 바꾸지 않음
  return 'p' + Utilities.getUuid().replace(/-/g, '').slice(0, 11);
}

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
