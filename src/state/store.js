/**
 * 포트폴리오 상태 관리 + 브라우저(IndexedDB) 자동 저장
 *
 * ▸ 서버 없이 학생 각자의 브라우저에 저장됩니다. 그래서 반 전체가 동시에 써도 서버 부하가 없습니다.
 * ▸ 한 브라우저에 여러 학생의 포트폴리오를 따로 보관할 수 있습니다(학교 공용 PC·태블릿 대비).
 * ▸ 사진·첨부파일은 'media' 저장소에 한 번만 저장하고, 글을 고칠 때는 가벼운 글 데이터만 다시 저장합니다.
 *   (사진이 수십 장이어도 입력할 때마다 수십 MB를 복사하지 않도록)
 *
 * IndexedDB 구조 (DB: StudentPortfolioBuilderDB_v2, version 2)
 *   portfolioState  'index'          → { currentId, items: [{ id, studentName, portfolioTitle, updatedAt, workCount, photoCount, isSample }] }
 *                   'pf:<id>'        → 포트폴리오 상태 (사진의 dataUrl은 빈 값)
 *                   'currentPortfolio' (예전 버전 저장본, 처음 열 때 자동으로 옮김)
 *   media           '<id>/<사진id>'  → data URL 문자열
 */
import {
  createSamplePortfolioData,
  createBlankPortfolioData,
  SCHOOL_LEVEL_SUBJECTS,
  DESIGN_TEMPLATES,
  DEFAULT_TEMPLATE_ID
} from '../data/sampleData.js';
import { uid } from '../utils/files.js';

const DB_NAME = 'StudentPortfolioBuilderDB_v2';
const DB_VERSION = 2;
const STATE_STORE = 'portfolioState';
const MEDIA_STORE = 'media';
const INDEX_KEY = 'index';
const LEGACY_KEY = 'currentPortfolio';
const SAVE_DELAY_MS = 600;
const MEDIA_BUCKETS = ['activityPhotos', 'images', 'attachments'];

const pfKey = (id) => `pf:${id}`;
const mediaKey = (pid, mid) => `${pid}/${mid}`;
const mediaRange = (pid) => IDBKeyRange.bound(`${pid}/`, `${pid}/￿`);

export const SCHOOL_YEAR_MONTHS = ['3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월', '1월', '2월'];

const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const arr = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : []);

/** 오늘 날짜에 맞는 학기·월 (3~8월 → 1학기, 9~2월 → 2학기) */
export function currentSchoolTerm(date = new Date()) {
  const m = date.getMonth() + 1;
  return { semester: m >= 3 && m <= 8 ? '1학기' : '2학기', month: `${m}월` };
}

function normalizeMedia(list, prefix) {
  return arr(list).map((m) => ({ ...m, id: str(m.id) || uid(prefix), name: str(m.name), dataUrl: str(m.dataUrl) }));
}

export function normalizeWork(w = {}) {
  return {
    ...w,
    id: str(w.id) || uid('work'),
    entryType: w.entryType === 'project' ? 'project' : 'subject',
    projectName: str(w.projectName),
    linkedSubjects: str(w.linkedSubjects),
    projectRole: str(w.projectRole),
    subject: str(w.subject),
    semester: str(w.semester),
    month: str(w.month),
    activityType: str(w.activityType),
    title: str(w.title),
    content: str(w.content),
    reflection: str(w.reflection),
    coverPhotoId: str(w.coverPhotoId),
    activityPhotos: normalizeMedia(w.activityPhotos, 'ph'),
    images: normalizeMedia(w.images, 'ph'),
    attachments: normalizeMedia(w.attachments, 'att')
  };
}

/** 저장본·백업 파일을 읽을 때 빠진 항목을 채우고 잘못된 값을 바로잡습니다. */
export function normalizeState(raw) {
  const base = createBlankPortfolioData();
  if (!raw || typeof raw !== 'object') return base;
  const state = { ...base, ...raw };
  state.profile = { ...base.profile, ...(raw.profile && typeof raw.profile === 'object' ? raw.profile : {}) };
  Object.keys(base.profile).forEach((k) => {
    state.profile[k] = str(state.profile[k]);
  });
  state.works = arr(raw.works).map(normalizeWork);
  if (!DESIGN_TEMPLATES.some((t) => t.id === state.selectedTemplate)) state.selectedTemplate = DEFAULT_TEMPLATE_ID;
  if (!SCHOOL_LEVEL_SUBJECTS[state.schoolLevel]) state.schoolLevel = 'middle';
  if (!Array.isArray(state.customSubjects)) state.customSubjects = [...SCHOOL_LEVEL_SUBJECTS[state.schoolLevel]];
  if (!Array.isArray(state.customProjects)) state.customProjects = [];
  state.isSample = Boolean(raw.isSample);
  return state;
}

/** 한 활동이 완전히 비어 있는지 (목록으로 돌아갈 때 빈 활동은 정리합니다) */
export function isWorkEmpty(w) {
  return (
    !w.title.trim() &&
    !w.content.trim() &&
    !w.reflection.trim() &&
    !w.projectName.trim() &&
    !w.activityPhotos.length &&
    !w.images.length &&
    !w.attachments.length
  );
}

function sampleState() {
  return { ...normalizeState(createSamplePortfolioData()), isSample: true };
}

function blankState() {
  return normalizeState(createBlankPortfolioData());
}

function eachMedia(state, fn) {
  state.works.forEach((w) => MEDIA_BUCKETS.forEach((b) => (w[b] || []).forEach((m) => fn(m, w, b))));
}

/** 저장용 가벼운 사본: 사진·파일의 dataUrl만 비웁니다. */
function stripMedia(state) {
  return {
    ...state,
    profile: { ...state.profile },
    works: state.works.map((w) => {
      const copy = { ...w };
      MEDIA_BUCKETS.forEach((b) => {
        copy[b] = (w[b] || []).map((m) => ({ ...m, dataUrl: '' }));
      });
      return copy;
    })
  };
}

function req(r) {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('저장이 취소되었습니다.'));
  });
}

class PortfolioStore {
  constructor() {
    this.state = sampleState();
    this.portfolioId = uid('pf');
    this.index = { currentId: this.portfolioId, items: [] };
    this.db = null;
    this.saveTimer = null;
    this.savePromise = Promise.resolve();
    this.savedMediaIds = new Set();
    this.mediaDirty = true;
    this.statusListeners = new Set();
    this.conflictListeners = new Set();
    this.tabId = uid('tab');
    this.channel = null;
  }

  /* ---------------- 시작 ---------------- */
  async init() {
    try {
      this.db = await this.openDB();
      const index = await this.get(STATE_STORE, INDEX_KEY);
      if (index && Array.isArray(index.items) && index.items.length) {
        this.index = index;
        const ok = (await this.load(index.currentId)) || (await this.load(index.items[0].id));
        if (!ok) await this.startNew(sampleState());
      } else {
        const legacy = await this.get(STATE_STORE, LEGACY_KEY);
        if (legacy && legacy.profile && Array.isArray(legacy.works)) {
          // 예전 버전 저장본을 새 구조로 옮깁니다.
          await this.startNew(normalizeState(legacy));
          await this.del(STATE_STORE, LEGACY_KEY);
        } else {
          await this.startNew(sampleState());
        }
      }
      this.listenOtherTabs();
      if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
      this.emitStatus('saved');
    } catch (err) {
      console.warn('IndexedDB를 쓸 수 없어 이번 창에서만 기억합니다:', err);
      this.db = null;
      this.emitStatus('unavailable');
    }
  }

  openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STATE_STORE)) db.createObjectStore(STATE_STORE);
        if (!db.objectStoreNames.contains(MEDIA_STORE)) db.createObjectStore(MEDIA_STORE);
      };
      request.onsuccess = () => {
        const db = request.result;
        // 다른 탭이 더 새 버전으로 열면 이 연결을 닫아 업그레이드를 막지 않습니다.
        db.onversionchange = () => db.close();
        resolve(db);
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('다른 탭이 저장소를 사용 중입니다.'));
    });
  }

  get(store, key) {
    return req(this.db.transaction(store, 'readonly').objectStore(store).get(key));
  }

  del(store, key) {
    const tx = this.db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    return txDone(tx);
  }

  /* ---------------- 다른 탭 감지 ---------------- */
  listenOtherTabs() {
    if (typeof BroadcastChannel !== 'function') return;
    this.channel = new BroadcastChannel('student-portfolio-editor');
    this.channel.onmessage = (e) => {
      const msg = e.data || {};
      if (msg.tabId === this.tabId || msg.portfolioId !== this.portfolioId) return;
      if (msg.type === 'saved' || msg.type === 'hello') {
        this.conflictListeners.forEach((fn) => fn());
        if (msg.type === 'hello') this.channel.postMessage({ type: 'here', tabId: this.tabId, portfolioId: this.portfolioId });
      } else if (msg.type === 'here') {
        this.conflictListeners.forEach((fn) => fn());
      }
    };
    this.channel.postMessage({ type: 'hello', tabId: this.tabId, portfolioId: this.portfolioId });
  }

  /** 같은 포트폴리오가 다른 창(탭)에서도 열려 고쳐지고 있을 때 알림 */
  onConflict(listener) {
    this.conflictListeners.add(listener);
    return () => this.conflictListeners.delete(listener);
  }

  /* ---------------- 저장 상태 알림 ---------------- */
  /** 'saving' | 'saved' | 'error' | 'unavailable' */
  onStatus(listener) {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  emitStatus(status, error) {
    this.statusListeners.forEach((fn) => fn(status, error));
  }

  /* ---------------- 불러오기 / 저장 ---------------- */
  async load(id) {
    if (!this.db || !id) return false;
    const light = await this.get(STATE_STORE, pfKey(id));
    if (!light || !light.profile || !Array.isArray(light.works)) return false;
    const state = normalizeState(light);

    const tx = this.db.transaction(MEDIA_STORE, 'readonly');
    const media = tx.objectStore(MEDIA_STORE);
    const storedKeys = await req(media.getAllKeys(mediaRange(id)));
    const stored = new Set(storedKeys.map((k) => String(k).slice(id.length + 1)));
    const jobs = [];
    eachMedia(state, (m) => {
      if (!m.dataUrl && stored.has(m.id)) {
        jobs.push(req(media.get(mediaKey(id, m.id))).then((v) => (m.dataUrl = v || '')));
      }
    });
    await Promise.all(jobs);

    this.portfolioId = id;
    this.state = state;
    this.savedMediaIds = stored;
    this.mediaDirty = false;
    this.index.currentId = id;
    return true;
  }

  async persist() {
    if (!this.db) return;
    const pid = this.portfolioId;
    const state = this.state;
    const items = [];
    eachMedia(state, (m) => items.push(m));
    const current = new Set(items.map((m) => m.id));
    const toWrite = items.filter((m) => m.dataUrl && (this.mediaDirty || !this.savedMediaIds.has(m.id)));
    const toDelete = [...this.savedMediaIds].filter((id) => !current.has(id));

    const entry = {
      id: pid,
      studentName: state.profile.studentName,
      portfolioTitle: state.profile.portfolioTitle,
      updatedAt: Date.now(),
      workCount: state.works.length,
      isSample: Boolean(state.isSample)
    };
    this.index = { currentId: pid, items: [entry, ...this.index.items.filter((x) => x.id !== pid)] };

    const tx = this.db.transaction([STATE_STORE, MEDIA_STORE], 'readwrite');
    const media = tx.objectStore(MEDIA_STORE);
    toWrite.forEach((m) => media.put(m.dataUrl, mediaKey(pid, m.id)));
    toDelete.forEach((id) => media.delete(mediaKey(pid, id)));
    const states = tx.objectStore(STATE_STORE);
    states.put(stripMedia(state), pfKey(pid));
    states.put(this.index, INDEX_KEY);
    await txDone(tx);

    if (pid === this.portfolioId) {
      toWrite.forEach((m) => this.savedMediaIds.add(m.id));
      toDelete.forEach((id) => this.savedMediaIds.delete(id));
      this.mediaDirty = false;
    }
    this.channel?.postMessage({ type: 'saved', tabId: this.tabId, portfolioId: pid });
  }

  /** 저장을 줄 세워 한 번에 하나씩만 실행합니다. */
  queueSave() {
    this.savePromise = this.savePromise
      .catch(() => {})
      .then(() => this.persist())
      .then(() => this.emitStatus('saved'))
      .catch((e) => {
        console.warn('자동 저장 실패:', e);
        this.emitStatus('error', e);
        throw e;
      });
    return this.savePromise;
  }

  changed() {
    if (!this.db) return;
    this.emitStatus('saving');
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.queueSave().catch(() => {});
    }, SAVE_DELAY_MS);
  }

  /** 기다리지 않고 바로 저장합니다(창을 닫기 직전, 포트폴리오를 바꾸기 전 등). */
  async flush() {
    if (!this.db) return;
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
      await this.queueSave().catch(() => {});
    } else {
      await this.savePromise.catch(() => {});
    }
  }

  /* ---------------- 여러 학생(포트폴리오) 관리 ---------------- */
  listPortfolios() {
    const live = {
      id: this.portfolioId,
      studentName: this.state.profile.studentName,
      portfolioTitle: this.state.profile.portfolioTitle,
      workCount: this.state.works.length,
      isSample: this.state.isSample
    };
    if (!this.db) return [live];
    const items = this.index.items.map((x) => (x.id === this.portfolioId ? { ...x, ...live } : x));
    return items.some((x) => x.id === live.id) ? items : [live, ...items];
  }

  getPortfolioId() {
    return this.portfolioId;
  }

  async startNew(state) {
    await this.flush();
    this.portfolioId = uid('pf');
    this.state = state;
    this.savedMediaIds = new Set();
    this.mediaDirty = true;
    this.channel?.postMessage({ type: 'hello', tabId: this.tabId, portfolioId: this.portfolioId });
    if (this.db) await this.queueSave();
  }

  /** 새 포트폴리오(빈 것)를 만들어 바꿉니다. 지금 포트폴리오는 그대로 남습니다. */
  createPortfolio() {
    return this.startNew(blankState());
  }

  async switchPortfolio(id) {
    if (id === this.portfolioId) return true;
    await this.flush();
    const ok = await this.load(id);
    if (ok) {
      this.channel?.postMessage({ type: 'hello', tabId: this.tabId, portfolioId: id });
      await this.queueSave().catch(() => {});
    }
    return ok;
  }

  async deletePortfolio(id) {
    if (!this.db) return;
    await this.flush();
    const tx = this.db.transaction([STATE_STORE, MEDIA_STORE], 'readwrite');
    const media = tx.objectStore(MEDIA_STORE);
    const keys = await req(media.getAllKeys(mediaRange(id)));
    keys.forEach((k) => media.delete(k));
    tx.objectStore(STATE_STORE).delete(pfKey(id));
    this.index = { ...this.index, items: this.index.items.filter((x) => x.id !== id) };
    tx.objectStore(STATE_STORE).put(this.index, INDEX_KEY);
    await txDone(tx);

    if (id === this.portfolioId) {
      const next = this.index.items[0];
      if (next && (await this.load(next.id))) await this.queueSave().catch(() => {});
      else await this.startNew(blankState());
    }
  }

  /* ---------------- 읽기 ---------------- */
  getState() {
    return this.state;
  }

  getWork(id) {
    return this.state.works.find((w) => w.id === id) || null;
  }

  /** 과목 추천 목록: 학교급 기본 과목 + 이미 쓴 과목 */
  getSubjectSuggestions() {
    const preset = SCHOOL_LEVEL_SUBJECTS[this.state.schoolLevel] || [];
    const used = this.state.works.map((w) => w.subject.trim()).filter(Boolean);
    return [...new Set([...preset, ...(this.state.customSubjects || []), ...used])];
  }

  /** 프로젝트 이름 추천 목록: 이미 쓴 프로젝트 이름 */
  getProjectSuggestions() {
    return [...new Set(this.state.works.map((w) => w.projectName.trim()).filter(Boolean))];
  }

  /* ---------------- 고치기 ---------------- */
  /** 예시 내용을 고치기 시작하면 '예시 안내'를 더 이상 띄우지 않습니다. */
  markEdited() {
    if (this.state.isSample) this.state.isSample = false;
  }

  setTemplate(templateId) {
    if (!DESIGN_TEMPLATES.some((t) => t.id === templateId)) return;
    this.state.selectedTemplate = templateId;
    this.changed();
  }

  setSchoolLevel(level) {
    if (!SCHOOL_LEVEL_SUBJECTS[level]) return;
    this.state.schoolLevel = level;
    this.state.customSubjects = [...SCHOOL_LEVEL_SUBJECTS[level]];
    this.changed();
  }

  updateProfile(partial) {
    this.state.profile = { ...this.state.profile, ...partial };
    this.changed();
  }

  /** 새 활동을 맨 위에 추가하고 id를 돌려줍니다. 빈칸은 비워 두고 안내 문구(placeholder)로만 보여 줍니다. */
  addWork(partial = {}) {
    const term = currentSchoolTerm();
    const work = normalizeWork({ semester: term.semester, month: term.month, ...partial, id: uid('work') });
    this.state.works.unshift(work);
    this.changed();
    return work.id;
  }

  updateWork(workId, fields) {
    const idx = this.state.works.findIndex((w) => w.id === workId);
    if (idx === -1) return;
    this.state.works[idx] = { ...this.state.works[idx], ...fields };
    this.changed();
  }

  deleteWork(workId) {
    this.state.works = this.state.works.filter((w) => w.id !== workId);
    this.changed();
  }

  moveWork(workId, direction) {
    const works = this.state.works;
    const idx = works.findIndex((w) => w.id === workId);
    const target = direction === 'up' ? idx - 1 : idx + 1;
    if (idx === -1 || target < 0 || target >= works.length) return;
    [works[idx], works[target]] = [works[target], works[idx]];
    this.changed();
  }

  /** 지금 포트폴리오 내용을 통째로 바꿉니다(예시 불러오기·백업 불러오기·처음부터 다시). */
  replaceState(next) {
    this.state = next;
    this.mediaDirty = true;
    this.changed();
  }

  loadSampleData() {
    this.replaceState(sampleState());
  }

  resetBlankData() {
    this.replaceState(blankState());
  }

  dismissSampleNotice() {
    this.state.isSample = false;
    this.changed();
  }

  importState(jsonData) {
    if (!jsonData || typeof jsonData !== 'object' || !jsonData.profile || !Array.isArray(jsonData.works)) return false;
    this.replaceState({ ...normalizeState(jsonData), isSample: false });
    return true;
  }
}

export const portfolioStore = new PortfolioStore();
