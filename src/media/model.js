/**
 * 미디어 데이터 공용 규칙
 *
 * 한 활동(work)에 들어가는 미디어
 *   images[]         🎨 작품 사진      { id, name, caption, blob|dataUrl, width, height }
 *   activityPhotos[] 📸 활동 사진      (같은 형식)
 *   videos[]         🎬 동영상         { id, name, caption, size, mimeType, blob, width, height, duration, poster: { id, blob|dataUrl } }
 *   attachments[]    📄 PDF·파일       { id, name, size, mimeType, blob|dataUrl,
 *                                        pages: [{ id, blob|dataUrl, width, height }],  ← PDF 쪽 그림(내용 보이기)
 *                                        pageCount, docCols, docPages: [쪽 번호(0부터)] }
 *
 * 실제 데이터는 blob(파일 그대로) 또는 dataUrl(예전 버전·예시 데이터) 중 하나에 들어 있습니다.
 * 이 파일은 브라우저 API 없이도 동작해야 합니다(Node에서 시안 비교 파일을 만들 때도 씀).
 */

export const MEDIA_BUCKETS = ['images', 'activityPhotos', 'videos', 'attachments'];

/** 저장되는 모든 미디어 조각(본문, 동영상 썸네일, PDF 쪽 그림)을 방문합니다. */
export function walkMedia(state, fn) {
  for (const w of state?.works || []) {
    for (const b of MEDIA_BUCKETS) {
      for (const m of w[b] || []) {
        fn(m, w, b);
        if (m.poster && typeof m.poster === 'object') fn(m.poster, w, `${b}.poster`);
        if (Array.isArray(m.pages)) for (const pg of m.pages) fn(pg, w, `${b}.pages`);
      }
    }
  }
}

export function hasData(m) {
  return Boolean(m && (m.blob || m.dataUrl));
}

/** 데이터를 비운 사본(저장용 가벼운 기록) */
export function stripItem(m) {
  const copy = { ...m, dataUrl: '' };
  delete copy.blob;
  if (m.poster && typeof m.poster === 'object') copy.poster = stripItem(m.poster);
  if (Array.isArray(m.pages)) copy.pages = m.pages.map(stripItem);
  return copy;
}

export function stripState(state) {
  return {
    ...state,
    profile: { ...state.profile },
    works: state.works.map((w) => {
      const copy = { ...w };
      for (const b of MEDIA_BUCKETS) copy[b] = (w[b] || []).map(stripItem);
      return copy;
    })
  };
}

export function mediaMime(m) {
  if (m?.blob?.type) return m.blob.type;
  if (m?.mimeType) return m.mimeType;
  const found = /^data:([^;,]+)/.exec(m?.dataUrl || '');
  return found ? found[1] : '';
}

export function mediaBytes(m) {
  if (m?.blob) return m.blob.size;
  if (m?.dataUrl) return Math.round(m.dataUrl.length * 0.75);
  return 0;
}

/** 이 포트폴리오의 미디어 전체 용량(바이트) */
export function totalMediaBytes(state) {
  let n = 0;
  walkMedia(state, (m) => (n += mediaBytes(m)));
  return n;
}
