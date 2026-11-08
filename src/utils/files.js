/**
 * 파일 올리기 · 내려받기 도우미
 */

/** 첨부파일 하나의 최대 크기. 너무 큰 파일은 브라우저 저장소와 내보내기 파일을 무겁게 만듭니다. */
export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

/** 사진을 줄일 때 긴 변의 최대 길이(px). 화면·인쇄 모두 충분한 크기입니다. */
const MAX_PHOTO_SIDE = 1600;

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${parseFloat((bytes / 1024 ** i).toFixed(1))} ${units[i]}`;
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function isImageFile(file) {
  return (file.type || '').startsWith('image/') || /\.(heic|heif)$/i.test(file.name || '');
}

async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* 아래 <img> 방식으로 다시 시도 */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * 휴대폰 사진(수 MB)을 화면에 알맞은 크기로 줄여 data URL로 돌려줍니다.
 * - SVG·GIF(움직이는 그림)는 그대로 둡니다.
 * - 이미 작은 사진은 그대로 둡니다.
 * - PNG(투명 배경 가능)는 WebP로, 나머지는 JPEG로 저장합니다.
 * 열 수 없는 형식(예: 일부 브라우저의 HEIC)이면 오류를 던집니다.
 */
export async function prepareImage(file) {
  const type = file.type || '';
  if (type === 'image/svg+xml' || type === 'image/gif') return readFileAsDataUrl(file);

  const source = await decodeImage(file);
  const width = source.width || source.naturalWidth;
  const height = source.height || source.naturalHeight;
  if (!width || !height) throw new Error('이미지 크기를 읽을 수 없습니다.');

  const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(width, height));
  const isSmallEnough = scale === 1 && file.size <= 400 * 1024 && /^image\/(jpeg|png|webp)$/.test(type);
  if (isSmallEnough) {
    if (source.close) source.close();
    return readFileAsDataUrl(file);
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  const keepAlpha = type === 'image/png' || type === 'image/webp';
  if (!keepAlpha) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  if (source.close) source.close();

  if (keepAlpha) {
    const webp = canvas.toDataURL('image/webp', 0.9);
    if (webp.startsWith('data:image/webp')) return webp;
    return canvas.toDataURL('image/png');
  }
  return canvas.toDataURL('image/jpeg', 0.85);
}

/** 파일 이름에 쓸 수 없는 글자를 _ 로 바꿉니다. */
export function safeFileName(name = 'file') {
  return String(name).replace(/[\\/:*?"<>|\s]+/g, '_').replace(/^_+|_+$/g, '') || 'file';
}

export function triggerBlobDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}
