import { createSamplePortfolioData, createBlankPortfolioData, SCHOOL_LEVEL_SUBJECTS } from '../data/sampleData.js';

const DB_NAME = 'StudentPortfolioBuilderDB_v2';
const DB_VERSION = 1;
const STORE_NAME = 'portfolioState';
const STATE_KEY = 'currentPortfolio';

class PortfolioStore {
  constructor() {
    this.state = createSamplePortfolioData();
    this.listeners = new Set();
    this.db = null;
    this.saveTimer = null;
  }

  async init() {
    try {
      this.db = await this.openDB();
      const saved = await this.loadFromDB();
      if (saved && saved.profile && Array.isArray(saved.works)) {
        this.state = saved;
        if (!Array.isArray(this.state.customProjects)) {
          this.state.customProjects = ["생태 도시 열섬 해결 프로젝트", "우리 마을 역사 다큐 프로젝트"];
        }
      } else {
        await this.saveToDB(this.state);
      }
    } catch (err) {
      console.warn('IndexedDB unavailable, falling back to in-memory state:', err);
    }
    this.notify();
  }

  openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  loadFromDB() {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve(null);
      const tx = this.db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(STATE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  saveToDB(data) {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve();
      const tx = this.db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(structuredClone(data), STATE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  scheduleSave() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveToDB(this.state).catch((e) => console.warn('Auto-save error:', e));
    }, 250);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.scheduleSave();
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  getState() {
    return this.state;
  }

  setTemplate(templateId) {
    this.state.selectedTemplate = templateId;
    this.notify();
  }

  setSchoolLevel(level) {
    this.state.schoolLevel = level;
    if (SCHOOL_LEVEL_SUBJECTS[level]) {
      const existingSubjects = new Set(this.state.works.map((w) => w.subject));
      const merged = [...new Set([...SCHOOL_LEVEL_SUBJECTS[level], ...existingSubjects])];
      this.state.customSubjects = merged;
    }
    this.notify();
  }

  addCustomSubject(subjectName) {
    const trimmed = subjectName.trim();
    if (!trimmed) return false;
    if (!this.state.customSubjects.includes(trimmed)) {
      this.state.customSubjects.push(trimmed);
      this.notify();
      return true;
    }
    return false;
  }

  addCustomProject(projectName) {
    const trimmed = projectName.trim();
    if (!trimmed) return false;
    if (!Array.isArray(this.state.customProjects)) {
      this.state.customProjects = [];
    }
    if (!this.state.customProjects.includes(trimmed)) {
      this.state.customProjects.push(trimmed);
      this.notify();
      return true;
    }
    return false;
  }

  updateProfile(partial) {
    this.state.profile = { ...this.state.profile, ...partial };
    this.notify();
  }

  addWork(workItem) {
    const isProject = workItem.entryType === 'project';
    const newWork = {
      id: 'work-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      entryType: isProject ? 'project' : 'subject',
      projectName: workItem.projectName || (isProject ? (this.state.customProjects?.[0] || '신규 융합 프로젝트') : ''),
      linkedSubjects: workItem.linkedSubjects || (isProject ? '융합 탐구' : ''),
      projectRole: workItem.projectRole || (isProject ? '기획 및 제작' : ''),
      subject: workItem.subject || (this.state.customSubjects[0] || '국어'),
      semester: workItem.semester || '1학기',
      month: workItem.month || '5월',
      activityType: workItem.activityType || (isProject ? '프로젝트 활동' : '교과 활동'),
      title: workItem.title || '제목 없는 결과물',
      content: workItem.content || '',
      reflection: workItem.reflection || '',
      featured: Boolean(workItem.featured),
      activityPhotos: Array.isArray(workItem.activityPhotos) ? workItem.activityPhotos : [],
      images: Array.isArray(workItem.images) ? workItem.images : [],
      attachments: Array.isArray(workItem.attachments) ? workItem.attachments : []
    };
    if (!this.state.customSubjects.includes(newWork.subject)) {
      this.state.customSubjects.push(newWork.subject);
    }
    if (isProject && newWork.projectName && !this.state.customProjects.includes(newWork.projectName)) {
      this.state.customProjects.push(newWork.projectName);
    }
    this.state.works.unshift(newWork);
    this.notify();
    return newWork.id;
  }

  updateWork(workId, updatedFields) {
    const idx = this.state.works.findIndex((w) => w.id === workId);
    if (idx !== -1) {
      this.state.works[idx] = { ...this.state.works[idx], ...updatedFields };
      if (updatedFields.subject && !this.state.customSubjects.includes(updatedFields.subject)) {
        this.state.customSubjects.push(updatedFields.subject);
      }
      if (updatedFields.projectName && !this.state.customProjects.includes(updatedFields.projectName)) {
        this.state.customProjects.push(updatedFields.projectName);
      }
      this.notify();
    }
  }

  deleteWork(workId) {
    this.state.works = this.state.works.filter((w) => w.id !== workId);
    this.notify();
  }

  moveWork(workId, direction) {
    const idx = this.state.works.findIndex((w) => w.id === workId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= this.state.works.length) return;
    const temp = this.state.works[idx];
    this.state.works[idx] = this.state.works[targetIdx];
    this.state.works[targetIdx] = temp;
    this.notify();
  }

  loadSampleData() {
    this.state = createSamplePortfolioData();
    this.notify();
  }

  resetBlankData() {
    this.state = createBlankPortfolioData();
    this.notify();
  }

  importState(jsonData) {
    if (jsonData && jsonData.profile && Array.isArray(jsonData.works)) {
      this.state = jsonData;
      this.notify();
      return true;
    }
    return false;
  }
}

export const portfolioStore = new PortfolioStore();
