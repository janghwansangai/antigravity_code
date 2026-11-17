/**
 * 링크 해석: 구글 드라이브·문서·슬라이드·시트·유튜브 링크에서 종류, 썸네일, 미리보기 주소를 뽑습니다.
 * (구글 드라이브 썸네일·미리보기는 보는 사람이 그 파일을 볼 권한이 있을 때만 보입니다)
 */

const DRIVE_HOSTS = /^(drive|docs)\.google\.com$/i;

export const KIND_LABELS = {
  'drive-file': { icon: '📄', label: '드라이브 파일' },
  'drive-folder': { icon: '📁', label: '드라이브 폴더' },
  document: { icon: '📝', label: '구글 문서' },
  presentation: { icon: '📊', label: '구글 슬라이드' },
  spreadsheets: { icon: '📈', label: '구글 시트' },
  youtube: { icon: '▶️', label: '유튜브' },
  web: { icon: '🔗', label: '웹 링크' }
};

/** http(s) 주소인지 */
export function isValidLink(text) {
  try {
    const u = new URL(String(text || '').trim());
    return (u.protocol === 'https:' || u.protocol === 'http:') && !!u.hostname && String(text).length <= 500;
  } catch {
    return false;
  }
}

function driveId(u) {
  const m = u.pathname.match(/\/(?:file|document|presentation|spreadsheets|forms)\/(?:u\/\d+\/)?d\/([\w-]{10,})/) || u.pathname.match(/\/folders\/([\w-]{10,})/);
  return (m && m[1]) || u.searchParams.get('id') || '';
}

/**
 * @returns {{ kind, id, thumb, preview, open, icon, label }}
 */
export function parseLink(text) {
  const raw = String(text || '').trim();
  const base = { kind: 'web', id: '', thumb: '', preview: '', open: raw, ...KIND_LABELS.web };
  let u;
  try {
    u = new URL(raw);
  } catch {
    return base;
  }
  if (DRIVE_HOSTS.test(u.hostname)) {
    const id = driveId(u);
    if (!id) return base;
    let kind = 'drive-file';
    if (/\/folders\//.test(u.pathname)) kind = 'drive-folder';
    else if (/\/document\//.test(u.pathname)) kind = 'document';
    else if (/\/presentation\//.test(u.pathname)) kind = 'presentation';
    else if (/\/spreadsheets\//.test(u.pathname)) kind = 'spreadsheets';
    const enc = encodeURIComponent(id);
    const preview =
      kind === 'drive-file'
        ? `https://drive.google.com/file/d/${enc}/preview`
        : kind === 'drive-folder'
          ? `https://drive.google.com/embeddedfolderview?id=${enc}#grid`
          : `https://docs.google.com/${kind}/d/${enc}/preview`;
    return {
      kind,
      id,
      thumb: kind === 'drive-folder' ? '' : `https://drive.google.com/thumbnail?id=${enc}&sz=w640`,
      preview,
      open: raw,
      ...KIND_LABELS[kind]
    };
  }
  if (/(^|\.)youtube\.com$|^youtu\.be$/i.test(u.hostname)) {
    const id = u.hostname.toLowerCase() === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v') || (u.pathname.match(/\/(?:shorts|embed)\/([\w-]{6,})/) || [])[1] || '';
    if (/^[\w-]{6,20}$/.test(id)) {
      return {
        kind: 'youtube',
        id,
        thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        preview: `https://www.youtube-nocookie.com/embed/${id}`,
        open: raw,
        ...KIND_LABELS.youtube
      };
    }
  }
  return base;
}
