/**
 * 파일 올리기 · 내려받기 · 사진 처리 도우미
 *
 * 사진·파일은 Blob(파일 그대로)으로 다룹니다. 예전 버전이 저장한 data URL 문자열도 계속 읽을 수 있습니다.
 */

/** 파일 하나의 최대 크기(1GB). 실제 한도는 이 컴퓨터 브라우저 저장 공간이 정합니다. */
export const MAX_FILE_BYTES = 1024 * 1024 * 1024;

/** 사진 화질(긴 변 길이, px) 선택지 */
export const PHOTO_SIZES = [
  { value: 1280, label: '작게 (가벼움)' },
  { value: 1600, label: '보통' },
  { value: 2400, label: '크게 (선명함)' }
];
export const DEFAULT_PHOTO_SIDE = 1600;

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${parseFloat((bytes / 1024 ** i).toFixed(1))} ${units[i]}`;
}

export function readFileAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
export const blobToDataUrl = readFileAsDataUrl;

export function dataUrlToBlob(dataUrl) {
  const comma = dataUrl.indexOf(',');
  const header = dataUrl.slice(5, comma);
  const mime = header.split(';')[0] || 'application/octet-stream';
  const body = dataUrl.slice(comma + 1);
  if (!header.includes(';base64')) return new Blob([decodeURIComponent(body)], { type: mime });
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function isImageFile(file) {
  return (file.type || '').startsWith('image/') || /\.(heic|heif)$/i.test(file.name || '');
}

export function isVideoFile(file) {
  return (file.type || '').startsWith('video/') || /\.(mp4|mov|m4v|webm|avi|mkv|3gp)$/i.test(file.name || '');
}

export function isPdfBlob(file) {
  return /pdf/i.test(file.type || '') || /\.pdf$/i.test(file.name || '');
}

async function decodeImage(blob) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob, { imageOrientation: 'from-image' });
    } catch {
      /* 아래 <img> 방식으로 다시 시도 */
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    return await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** 주소(blob:·data:·파일 경로)에서 그림을 불러옵니다. */
export async function loadImage(url) {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

/** 사진의 실제 가로·세로 크기 (주소 또는 Blob) */
export async function getImageSize(src) {
  if (src instanceof Blob) {
    const bmp = await decodeImage(src);
    const size = { width: bmp.width || bmp.naturalWidth || 0, height: bmp.height || bmp.naturalHeight || 0 };
    if (bmp.close) bmp.close();
    return size;
  }
  const img = await loadImage(src);
  return { width: img.naturalWidth || 0, height: img.naturalHeight || 0 };
}

/** 투명 배경이 있을 수 있는 형식인지 (PNG·WebP·SVG·GIF) */
export function mayHaveAlpha(typeOrDataUrl = '') {
  return /image\/(png|webp|svg|gif)/i.test(typeOrDataUrl);
}

/** 캔버스를 Blob으로 (투명 배경 가능 → WebP, 아니면 JPEG) */
export function canvasToBlob(canvas, keepAlpha = false, quality = 0.88) {
  return new Promise((resolve, reject) => {
    const done = (blob) => (blob ? resolve(blob) : reject(new Error('그림을 저장하지 못했어요.')));
    if (keepAlpha) {
      canvas.toBlob((b) => (b && b.type === 'image/webp' ? done(b) : canvas.toBlob(done, 'image/png')), 'image/webp', 0.9);
    } else {
      canvas.toBlob(done, 'image/jpeg', quality);
    }
  });
}

function drawScaled(source, width, height, maxSide, keepAlpha) {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d');
  if (!keepAlpha) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * 휴대폰 사진(수 MB)을 알맞은 크기로 줄여 { blob, width, height }로 돌려줍니다.
 * - maxSide: 긴 변 최대 길이(사진 화질 설정)
 * - SVG·GIF(움직이는 그림)는 그대로 둡니다. 이미 작은 사진도 그대로 둡니다.
 * 열 수 없는 형식(예: 일부 브라우저의 HEIC)이면 오류를 던집니다.
 */
export async function prepareImage(file, { maxSide = DEFAULT_PHOTO_SIDE } = {}) {
  const type = file.type || '';
  if (type === 'image/svg+xml' || type === 'image/gif') {
    const url = URL.createObjectURL(file);
    try {
      return { blob: file, ...(await getImageSize(url).catch(() => ({ width: 0, height: 0 }))) };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const source = await decodeImage(file);
  const width = source.width || source.naturalWidth;
  const height = source.height || source.naturalHeight;
  if (!width || !height) throw new Error('이미지 크기를 읽을 수 없습니다.');

  const fits = Math.max(width, height) <= maxSide;
  if (fits && file.size <= 450 * 1024 && /^image\/(jpeg|png|webp)$/.test(type)) {
    if (source.close) source.close();
    return { blob: file, width, height };
  }
  const keepAlpha = type === 'image/png' || type === 'image/webp';
  const canvas = drawScaled(source, width, height, maxSide, keepAlpha);
  if (source.close) source.close();
  return { blob: await canvasToBlob(canvas, keepAlpha), width: canvas.width, height: canvas.height };
}

/** 이미 저장된 사진을 더 작게 다시 저장합니다(용량 줄이기). 줄일 필요가 없으면 null */
export async function shrinkImage(blob, maxSide, quality = 0.8) {
  const source = await decodeImage(blob);
  const width = source.width || source.naturalWidth;
  const height = source.height || source.naturalHeight;
  if (Math.max(width, height) <= maxSide && blob.size < 300 * 1024) {
    if (source.close) source.close();
    return null;
  }
  const keepAlpha = mayHaveAlpha(blob.type);
  const canvas = drawScaled(source, width, height, maxSide, keepAlpha);
  if (source.close) source.close();
  const out = await canvasToBlob(canvas, keepAlpha, quality);
  return out.size < blob.size ? { blob: out, width: canvas.width, height: canvas.height } : null;
}

/** 사진을 90° 단위로 돌립니다. src: 주소, degrees: 90(시계 방향) | -90 | 180 */
export async function rotateImage(src, degrees = 90, type = '') {
  const img = await loadImage(src);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const turn = ((degrees % 360) + 360) % 360;
  const swap = turn === 90 || turn === 270;
  const canvas = document.createElement('canvas');
  canvas.width = swap ? h : w;
  canvas.height = swap ? w : h;
  const ctx = canvas.getContext('2d');
  const keepAlpha = mayHaveAlpha(type);
  if (!keepAlpha) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((turn * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2);
  return { blob: await canvasToBlob(canvas, keepAlpha), width: canvas.width, height: canvas.height };
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
