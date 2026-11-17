/**
 * 동영상 도우미: 썸네일(포스터) 그림과 크기·길이 읽기
 *
 * (동영상 용량 줄이기는 videoCompress.js)
 * 이 브라우저가 재생할 수 없는 형식(예: 일부 아이폰 HEVC .mov)이면 기본 썸네일을 만듭니다.
 */
import { canvasToBlob } from './files.js';

const POSTER_SIDE = 960;

function placeholderPoster(name = '') {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 640, 360);
  g.addColorStop(0, '#5B4BC4');
  g.addColorStop(1, '#FF7A8A');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 640, 360);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.moveTo(280, 130);
  ctx.lineTo(380, 180);
  ctx.lineTo(280, 230);
  ctx.closePath();
  ctx.fill();
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(name.slice(0, 30) || '동영상', 320, 300);
  return canvas;
}

function once(el, event, ms = 8000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    el.addEventListener(event, () => (clearTimeout(t), resolve()), { once: true });
    el.addEventListener('error', () => (clearTimeout(t), reject(new Error('video error'))), { once: true });
  });
}

/**
 * @returns {Promise<{ poster: Blob, width, height, duration, playable }>}
 */
export async function makeVideoPoster(file) {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = url;
  try {
    await once(video, 'loadeddata');
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const target = duration > 2 ? Math.min(1, duration / 10) : 0;
    if (target > 0) {
      video.currentTime = target;
      await once(video, 'seeked').catch(() => {});
    }
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) throw new Error('no frame');
    const scale = Math.min(1, POSTER_SIDE / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    return { poster: await canvasToBlob(canvas, false, 0.8), width: w, height: h, duration, playable: true };
  } catch {
    const canvas = placeholderPoster(file.name);
    return { poster: await canvasToBlob(canvas, false, 0.85), width: 640, height: 360, duration: 0, playable: false };
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}
