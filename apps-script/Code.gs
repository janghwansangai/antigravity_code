/**
 * 우리 반 작품 갤러리 - 서버 (Google Apps Script) · 버전 2
 *
 * 선생님의 구글 시트에 붙여서 '웹 앱'으로 배포합니다.
 *   - 학생: 포트폴리오 앱의 [🚀 갤러리에 공유하기] 또는 갤러리의 [＋ 내 작품 올리기]
 *           → 파일이 선생님 드라이브의 '작품 폴더'에 저장되고, 링크가 이 시트에 자동으로 한 줄씩 쌓임
 *           (구글 드라이브 공유 링크를 직접 붙여 넣는 것도 됨)
 *   - 갤러리: 이 웹 앱에서 목록·썸네일을 받아 카드로 보여 줌
 *   - 선생님: 시트에서 줄을 지우거나 '숨김' 칸에 TRUE를 적으면 갤러리에서 사라짐
 *
 * 📖 포트폴리오 보기: PDF·ZIP·웹페이지(.html)·프로젝트 파일(.portfolio)은 갤러리가 이 웹 앱을 통해
 *   파일을 조금씩 받아 브라우저 안에서 펼쳐 보여 줍니다.
 *   - 갤러리에 올라온(숨기지 않은) 작품의 파일만 읽습니다. 다른 드라이브 파일은 읽지 않습니다.
 *
 * 설정은 '설정' 탭에서 바꿉니다(처음 실행할 때 자동으로 만들어짐).
 *   갤러리 제목 | 학급 코드(비워 두면 코드 없이 올리기) | 올리기 허용(TRUE/FALSE) | 작품 폴더(드라이브 폴더 주소, 비우면 자동으로 만듦)
 *
 * 처음 설치: 이 코드 붙여넣기 → 💾 저장 → 위 함수 목록에서 '준비하기' 선택 → ▶ 실행 → 권한 허용
 *            → 배포 → 새 배포 → 유형 '웹 앱' · 실행 사용자 '나' · 액세스 '모든 사용자' → 웹 앱 URL 복사
 * 코드를 바꾼 뒤: '준비하기' ▶ 실행(권한 허용) → 배포 → 배포 관리 → ✏️ 수정 → 버전 '새 버전' → 배포 (주소는 그대로)
 */

var VERSION = 2;
var ITEMS_SHEET = '작품';
var SETTINGS_SHEET = '설정';
var HEADERS = ['올린 시간', '번호', '이름', '제목', '링크', '설명', '숨김', '삭제 열쇠', '파일 이름', '파일 종류', '파일 크기', '올린 방식', '썸네일'];
var COL = { time: 0, id: 1, name: 2, title: 3, link: 4, desc: 5, hidden: 6, token: 7, fileName: 8, fileType: 9, size: 10, via: 11, thumb: 12 };
var MAX = { name: 20, title: 60, link: 500, desc: 200, fileName: 120, thumb: 45000 };
var MAX_ITEMS = 2000;
var VIEW_TYPES = { zip: true, portfolio: true, html: true, pdf: true }; // 📖 보기로 펼칠 수 있는 종류
var MAX_VIEW_BYTES = 200 * 1024 * 1024; // 보기로 받을 수 있는 최대 크기
var CHUNK_MAX = 4 * 1024 * 1024; // 보기: 한 번에 보내는 크기(받는 쪽에서 이어 붙임)
var MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 올리기: 한 파일 최대 크기
var SINGLE_UPLOAD_MAX = 6 * 1024 * 1024; // 이보다 작으면 한 번에, 크면 4MB씩 나눠 올림
var UPLOAD_CHUNK = 4 * 1024 * 1024; // 나눠 올리기 크기(256KB의 배수여야 함)
var LIST_CACHE_SEC = 20; // 여러 학생이 한꺼번에 열어도 시트를 매번 읽지 않도록 잠깐 기억
var FOLDER_NAME = '우리 반 갤러리 작품';

/** 처음 한 번(그리고 코드를 바꾼 뒤): 위 함수 목록에서 이 함수를 고르고 ▶ 실행 → 권한 허용 */
function 준비하기() {
  readSettings_();
  itemsSheet_();
  var folder = uploadFolder_();
  Logger.log('준비 완료! 학생 작품이 저장될 폴더: ' + folder.getUrl());
}

/** '준비하기'와 같음 (함수 목록에 한글 이름이 안 보이면 이것을 실행) */
function setup() {
  준비하기();
}

function doGet(e) {
  var params = (e && e.parameter) || {};
  var result;
  try {
    if (params.action === 'file') result = readFileChunk_(params);
    else if (params.action === 'thumbs') result = readThumbs_(params);
    else result = cachedList_();
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
  try {
    if (body.action === 'add') return output_(forgetList_(withLock_(function () { return addItem_(body); })));
    if (body.action === 'delete') return output_(forgetList_(withLock_(function () { return deleteItem_(body); })));
    if (body.action === 'upload') return output_(forgetList_(uploadSingle_(body)));
    if (body.action === 'uploadStart') return output_(uploadStart_(body));
    if (body.action === 'uploadChunk') return output_(forgetList_(uploadChunk_(body)));
    return output_({ ok: false, error: '알 수 없는 요청이에요.' });
  } catch (err) {
    return output_({ ok: false, error: '처리하지 못했어요: ' + err });
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

function readRows_() {
  var sheet = itemsSheet_();
  var last = sheet.getLastRow();
  return last > 1 ? sheet.getRange(2, 1, last - 1, HEADERS.length).getValues() : [];
}

function listItems_() {
  var settings = readSettings_();
  var rows = readRows_();
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
      via: String(r[COL.via] || '') === '파일' ? 'file' : 'link',
      thumb: !!r[COL.thumb]
    });
  }
  items.reverse(); // 최근 것부터
  return {
    ok: true,
    version: VERSION,
    title: settings.title,
    needCode: !!settings.code,
    open: settings.open,
    canUpload: true,
    maxUpload: MAX_UPLOAD_BYTES,
    items: items
  };
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

/* ---------------- 링크로 올리기 ---------------- */
function addItem_(b) {
  var v = checkPost_(b);
  if (!v.ok) return v;
  var link = String(b.link || '').trim();
  if (!/^https?:\/\/[^\s]+$/i.test(link) || link.length > MAX.link) return { ok: false, error: '링크가 올바르지 않아요. https:// 로 시작하는 주소를 붙여 넣어 주세요.', field: 'link' };

  var sheet = itemsSheet_();
  if (sheet.getLastRow() - 1 >= MAX_ITEMS) return { ok: false, error: '갤러리가 가득 찼어요. 선생님께 말씀드려 주세요.' };
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
  var id = newId_();
  var token = Utilities.getUuid();
  // 학생이 쓴 글은 모두 '글자'로 저장(수식 실행·날짜/숫자 자동 변환 막기)
  sheet.appendRow([new Date(), safe_(id), safe_(v.name), safe_(v.title), safe_(link), safe_(v.desc), false, safe_(token), safe_(meta.name), meta.type, meta.size, '링크', '']);
  return { ok: true, id: id, token: token, warning: warning, fileType: meta.type };
}

/** 올리기 공통 확인: 열림·학급 코드·이름·제목 */
function checkPost_(b) {
  var settings = readSettings_();
  if (!settings.open) return { ok: false, error: '지금은 올리기가 닫혀 있어요. 선생님께 여쭤 보세요.' };
  if (settings.code && String(b.code || '').trim() !== settings.code) return { ok: false, error: '학급 코드가 맞지 않아요.', field: 'code' };
  var name = clean_(b.name, MAX.name);
  var title = clean_(b.title, MAX.title);
  if (!name) return { ok: false, error: '이름을 적어 주세요.', field: 'name' };
  if (!title) return { ok: false, error: '제목을 적어 주세요.', field: 'title' };
  return { ok: true, name: name, title: title, desc: clean_(b.desc, MAX.desc) };
}

/* ---------------- 파일로 올리기 (선생님 드라이브 '작품 폴더'에 저장) ---------------- */
function checkUpload_(b) {
  var v = checkPost_(b);
  if (!v.ok) return v;
  var size = Number(b.size);
  if (!(size > 0)) return { ok: false, error: '빈 파일은 올릴 수 없어요.' };
  if (size > MAX_UPLOAD_BYTES) return { ok: false, error: '파일이 너무 커요(' + Math.round(MAX_UPLOAD_BYTES / 1048576) + 'MB까지).' };
  var fileName = clean_(b.fileName, MAX.fileName).replace(/[\\/:*?"<>|]/g, '_') || '작품';
  var mimeType = /^[\w.+-]+\/[\w.+-]+$/.test(String(b.mimeType || '')) ? String(b.mimeType) : 'application/octet-stream';
  var thumb = String(b.thumb || '');
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(thumb) || thumb.length > MAX.thumb) thumb = '';
  if (!b.replaceId && itemsSheet_().getLastRow() - 1 >= MAX_ITEMS) return { ok: false, error: '갤러리가 가득 찼어요. 선생님께 말씀드려 주세요.' };
  v.size = size;
  v.fileName = fileName;
  v.mimeType = mimeType;
  v.thumb = thumb;
  v.replaceId = String(b.replaceId || '');
  v.replaceToken = String(b.replaceToken || '');
  return v;
}

/** 작은 파일: 한 번에 */
function uploadSingle_(b) {
  var v = checkUpload_(b);
  if (!v.ok) return v;
  var bytes = Utilities.base64Decode(String(b.data || ''));
  if (bytes.length !== v.size || bytes.length > SINGLE_UPLOAD_MAX) return { ok: false, error: '파일을 다 받지 못했어요. 다시 눌러 주세요.' };
  var file = uploadFolder_().createFile(Utilities.newBlob(bytes, v.mimeType, v.fileName));
  return finishUpload_(v, file);
}

/** 큰 파일: 드라이브 '이어 올리기'를 시작하고 번호를 돌려줌 */
function uploadStart_(b) {
  var v = checkUpload_(b);
  if (!v.ok) return v;
  var folder = uploadFolder_();
  var res = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true', {
    method: 'post',
    contentType: 'application/json; charset=UTF-8',
    headers: {
      Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
      'X-Upload-Content-Type': v.mimeType,
      'X-Upload-Content-Length': String(v.size)
    },
    payload: JSON.stringify({ name: v.fileName, parents: [folder.getId()], mimeType: v.mimeType }),
    muteHttpExceptions: true
  });
  var headers = res.getAllHeaders();
  var session = headers.Location || headers.location;
  if (res.getResponseCode() !== 200 || !session) return { ok: false, error: '드라이브에 올릴 준비를 못 했어요(' + res.getResponseCode() + '). 잠시 뒤 다시 해 주세요.' };
  var uploadId = Utilities.getUuid();
  CacheService.getScriptCache().put('up:' + uploadId, JSON.stringify({ session: String(session), meta: v }), 21600);
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
  if (!bytes.length) return { ok: false, error: '빈 조각이에요.' };
  var end = start + bytes.length - 1;
  var res = UrlFetchApp.fetch(up.session, {
    method: 'put',
    contentType: up.meta.mimeType,
    payload: bytes,
    headers: { 'Content-Range': 'bytes ' + start + '-' + end + '/' + up.meta.size },
    muteHttpExceptions: true,
    followRedirects: false
  });
  var code = res.getResponseCode();
  if (code === 308) {
    // 드라이브가 받은 곳까지 알려 줌 (예: bytes=0-4194303)
    var h = res.getAllHeaders();
    var m = String(h.Range || h.range || '').match(/bytes=0-(\d+)/);
    return { ok: true, done: false, next: m ? Number(m[1]) + 1 : end + 1 };
  }
  if (code === 200 || code === 201) {
    cache.remove('up:' + b.uploadId);
    var info = JSON.parse(res.getContentText());
    return finishUpload_(up.meta, DriveApp.getFileById(info.id));
  }
  return { ok: false, error: '드라이브에 올리다 멈췄어요(' + code + '). 다시 눌러 주세요.' };
}

/** 올린 파일: 링크로 볼 수 있게 공유하고 갤러리에 등록(또는 전에 올린 것을 바꿈) */
function finishUpload_(v, file) {
  var shared = shareFile_(file);
  var link = 'https://drive.google.com/file/d/' + file.getId() + '/view?usp=sharing';
  var type = fileType_(file.getName(), file.getMimeType());
  var size = file.getSize();
  return withLock_(function () {
    var sheet = itemsSheet_();
    if (v.replaceId && v.replaceToken) {
      var rows = readRows_();
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i][COL.id]) !== v.replaceId) continue;
        if (String(rows[i][COL.token]) !== v.replaceToken) break; // 내 것이 아니면 새로 올림
        var oldId = driveId_(String(rows[i][COL.link]));
        var wasFile = String(rows[i][COL.via]) === '파일';
        sheet.getRange(i + 2, 1, 1, HEADERS.length).setValues([
          [new Date(), safe_(v.replaceId), safe_(v.name), safe_(v.title), safe_(link), safe_(v.desc), rows[i][COL.hidden], safe_(v.replaceToken), safe_(file.getName()), type, size, '파일', safe_(v.thumb)]
        ]);
        // 앱으로 올렸던 예전 파일은 휴지통으로(같은 작품의 옛 버전)
        if (wasFile && oldId && oldId !== file.getId()) {
          try {
            DriveApp.getFileById(oldId).setTrashed(true);
          } catch (err) {
            /* 이미 없거나 권한 없음 */
          }
        }
        forgetItem_(v.replaceId);
        return { ok: true, id: v.replaceId, token: v.replaceToken, link: link, fileType: type, shared: shared, replaced: true };
      }
    }
    var id = newId_();
    var token = Utilities.getUuid();
    sheet.appendRow([new Date(), safe_(id), safe_(v.name), safe_(v.title), safe_(link), safe_(v.desc), false, safe_(token), safe_(file.getName()), type, size, '파일', safe_(v.thumb)]);
    return { ok: true, id: id, token: token, link: link, fileType: type, shared: shared };
  });
}

/** 링크가 있는 사람은 볼 수 있게 (학교 계정이라 막혀 있으면 '우리 학교 사용자'로) */
function shareFile_(file) {
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return 'anyone';
  } catch (err) {
    try {
      file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
      return 'domain';
    } catch (err2) {
      return 'private';
    }
  }
}

/** 학생 작품을 저장할 폴더: '설정'의 작품 폴더, 없으면 내 드라이브에 '우리 반 갤러리 작품'을 만들어 씀 */
function uploadFolder_() {
  var settings = readSettings_();
  if (settings.folder) {
    try {
      return DriveApp.getFolderById(settings.folder);
    } catch (err) {
      /* 주소가 틀렸으면 자동 폴더로 */
    }
  }
  var props = PropertiesService.getScriptProperties();
  var savedId = props.getProperty('UPLOAD_FOLDER_ID');
  if (savedId) {
    try {
      var f = DriveApp.getFolderById(savedId);
      if (!f.isTrashed()) return f;
    } catch (err) {
      /* 지워졌으면 새로 만듦 */
    }
  }
  var folder = DriveApp.createFolder(FOLDER_NAME);
  props.setProperty('UPLOAD_FOLDER_ID', folder.getId());
  return folder;
}

/* ---------------- 지우기(올린 사람만) ---------------- */
function deleteItem_(b) {
  var id = String(b.id || '');
  var token = String(b.token || '');
  if (!id || !token) return { ok: false, error: '지울 작품을 찾을 수 없어요.' };
  var sheet = itemsSheet_();
  var rows = readRows_();
  for (var i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i][COL.id]) === id) {
      if (String(rows[i][COL.token]) !== token) return { ok: false, error: '내가 올린 작품만 지울 수 있어요.' };
      sheet.deleteRow(i + 2);
      forgetItem_(id);
      return { ok: true };
    }
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
    // 갤러리에 올라온(숨기지 않은) 작품의 드라이브 파일만 읽음
    var rows = readRows_();
    var id = '';
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][COL.id]) === item && !isTrue_(rows[i][COL.hidden])) {
        id = driveId_(String(rows[i][COL.link]));
        break;
      }
    }
    if (!id) return { ok: false, error: '갤러리에 올라온 드라이브 파일만 볼 수 있어요.' };
    var file = DriveApp.getFileById(id);
    meta = { id: id, name: file.getName(), type: fileType_(file.getName(), file.getMimeType()), size: file.getSize() };
    cache.put('meta:' + item, JSON.stringify(meta), 120);
  }
  if (!VIEW_TYPES[meta.type]) return { ok: false, error: '이 파일은 ‘열기’로 봐 주세요.', type: meta.type };
  if (meta.size > MAX_VIEW_BYTES) return { ok: false, error: '파일이 너무 커서(200MB 초과) 갤러리에서 바로 볼 수 없어요.' };
  if (start >= meta.size) return { ok: true, name: meta.name, type: meta.type, size: meta.size, start: start, data: '' };
  var end = Math.min(meta.size, start + len) - 1;

  var bytes;
  try {
    // 필요한 부분만 받기(큰 파일도 메모리를 아낌)
    var res = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(meta.id) + '?alt=media&supportsAllDrives=true', {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), Range: 'bytes=' + start + '-' + end },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 206 && res.getResponseCode() !== 200) throw new Error('HTTP ' + res.getResponseCode());
    bytes = res.getContent();
    if (res.getResponseCode() === 200 && bytes.length > end - start + 1) bytes = bytes.slice(start, end + 1);
  } catch (err) {
    bytes = DriveApp.getFileById(meta.id).getBlob().getBytes().slice(start, end + 1);
  }
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

function readSettings_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SETTINGS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(SETTINGS_SHEET);
    sheet.getRange(1, 1, 4, 2).setValues([
      ['갤러리 제목', '우리 반 작품 갤러리'],
      ['학급 코드', ''],
      ['올리기 허용', true],
      ['작품 폴더 (드라이브 폴더 주소, 비우면 자동으로 만듦)', '']
    ]);
  } else if (!sheet.getRange(4, 1).getValue()) {
    sheet.getRange(4, 1).setValue('작품 폴더 (드라이브 폴더 주소, 비우면 자동으로 만듦)');
  }
  var v = sheet.getRange(1, 2, 4, 1).getValues();
  return {
    title: String(v[0][0] || '우리 반 작품 갤러리'),
    code: String(v[1][0] || '').trim(),
    open: v[2][0] === '' ? true : isTrue_(v[2][0]),
    folder: folderId_(v[3][0])
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
