/**
 * 사진 고치기 창: 돌리기 · 모자이크로 가리기 · 스티커로 가리기 · 되돌리기
 *
 * 활동 사진에서 원하지 않는 사람(얼굴)을 가릴 때 씁니다.
 * 저장하면 가린 결과만 새 사진으로 저장되고, 원래 사진은 저장소에서 지워집니다.
 *
 *   openPhotoEditor(dataUrl) → Promise<{ dataUrl, width, height } | null>  (취소하면 null)
 */
import { exportCanvas } from '../utils/files.js';

const STICKERS = ['😊', '🙂', '😎', '⭐', '🌸', '🐻', '🐰', '❤️', '🍀', '🎈'];
const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif';
const MAX_UNDO = 10;

function copyCanvas(src) {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}

/** 사진 전체를 모자이크(큰 네모 픽셀)로 만든 캔버스 */
function pixelate(src) {
  const block = Math.max(8, Math.round(Math.max(src.width, src.height) / 45));
  const small = document.createElement('canvas');
  small.width = Math.max(1, Math.ceil(src.width / block));
  small.height = Math.max(1, Math.ceil(src.height / block));
  small.getContext('2d').drawImage(src, 0, 0, small.width, small.height);
  const big = document.createElement('canvas');
  big.width = src.width;
  big.height = src.height;
  const ctx = big.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, big.width, big.height);
  return big;
}

export function openPhotoEditor(dataUrl) {
  return new Promise((resolve) => {
    const root = document.createElement('div');
    root.className = 'modal photo-editor';
    root.innerHTML = `
      <div class="modal-card pe-card" role="dialog" aria-modal="true" aria-labelledby="pe-title">
        <div class="modal-head">
          <h2 id="pe-title">✏️ 사진 고치기</h2>
          <button type="button" class="btn btn-ghost btn-sm" data-pe="cancel" aria-label="닫기">✕</button>
        </div>
        <div class="pe-tools" role="toolbar" aria-label="사진 고치기 도구">
          <button type="button" class="pe-btn" data-pe="rotate-left" title="왼쪽으로 돌리기">↺<span>왼쪽</span></button>
          <button type="button" class="pe-btn" data-pe="rotate-right" title="오른쪽으로 돌리기">↻<span>오른쪽</span></button>
          <span class="pe-sep" aria-hidden="true"></span>
          <button type="button" class="pe-btn is-on" data-pe="tool" data-tool="mosaic" aria-pressed="true">▦<span>모자이크</span></button>
          <button type="button" class="pe-btn" data-pe="tool" data-tool="sticker" aria-pressed="false">😊<span>스티커</span></button>
          <span class="pe-sep" aria-hidden="true"></span>
          <button type="button" class="pe-btn" data-pe="undo" title="되돌리기" disabled>↩<span>되돌리기</span></button>
        </div>
        <div class="pe-options">
          <label class="pe-size">크기 <input type="range" min="2" max="20" value="9" data-pe="size" aria-label="붓·스티커 크기" /></label>
          <div class="pe-stickers" hidden>${STICKERS.map((s, i) => `<button type="button" class="pe-sticker${i === 0 ? ' is-on' : ''}" data-pe="sticker" data-s="${s}">${s}</button>`).join('')}</div>
        </div>
        <p class="pe-hint" data-pe-hint>가리고 싶은 얼굴을 손가락이나 마우스로 문지르면 모자이크가 돼요.</p>
        <div class="pe-stage"><canvas class="pe-canvas" aria-label="고칠 사진"></canvas></div>
        <p class="pe-note">💡 저장하면 원래 사진은 지워지고, 가린 사진만 남아요.</p>
        <div class="pe-actions">
          <button type="button" class="btn" data-pe="cancel">취소</button>
          <button type="button" class="btn btn-primary" data-pe="save">✓ 저장</button>
        </div>
      </div>`;
    document.body.appendChild(root);

    const canvas = root.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const undoBtn = root.querySelector('[data-pe="undo"]');
    const sizeInput = root.querySelector('[data-pe="size"]');
    const hint = root.querySelector('[data-pe-hint]');
    const stickerBar = root.querySelector('.pe-stickers');
    const undo = [];
    let tool = 'mosaic';
    let sticker = STICKERS[0];
    let pixels = null; // 모자이크 원본(한 번 문지를 때마다 새로 만듦)
    let drawing = false;
    let last = null;
    let edits = 0; // 고친 횟수(되돌리면 줄어듦)

    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
    };
    img.src = dataUrl;

    const brushRadius = () => (Math.max(canvas.width, canvas.height) * Number(sizeInput.value)) / 200;

    function pushUndo() {
      undo.push(copyCanvas(canvas));
      if (undo.length > MAX_UNDO) undo.shift();
      undoBtn.disabled = false;
      edits++;
    }

    function point(e) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * canvas.width,
        y: ((e.clientY - rect.top) / rect.height) * canvas.height
      };
    }

    function dab(p) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, brushRadius(), 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(pixels, 0, 0);
      ctx.restore();
    }

    function strokeTo(p) {
      const step = Math.max(2, brushRadius() / 3);
      const dx = p.x - last.x;
      const dy = p.y - last.y;
      const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / step));
      for (let i = 1; i <= n; i++) dab({ x: last.x + (dx * i) / n, y: last.y + (dy * i) / n });
      last = p;
    }

    function rotate(dir) {
      pushUndo();
      const src = copyCanvas(canvas);
      canvas.width = src.height;
      canvas.height = src.width;
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((dir * Math.PI) / 2);
      ctx.drawImage(src, -src.width / 2, -src.height / 2);
      ctx.restore();
    }

    function setTool(next) {
      tool = next;
      root.querySelectorAll('[data-pe="tool"]').forEach((b) => {
        const on = b.dataset.tool === tool;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', String(on));
      });
      stickerBar.hidden = tool !== 'sticker';
      hint.textContent =
        tool === 'mosaic'
          ? '가리고 싶은 얼굴을 손가락이나 마우스로 문지르면 모자이크가 돼요.'
          : '스티커를 고른 뒤, 가리고 싶은 곳을 누르면 붙어요.';
    }

    function close(result) {
      document.removeEventListener('keydown', onKey);
      root.remove();
      resolve(result);
    }

    function onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close(null);
      }
    }
    document.addEventListener('keydown', onKey);

    canvas.addEventListener('pointerdown', (e) => {
      if (!canvas.width) return;
      e.preventDefault();
      const p = point(e);
      if (tool === 'sticker') {
        pushUndo();
        const size = brushRadius() * 2.6;
        ctx.save();
        ctx.font = `${size}px ${EMOJI_FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sticker, p.x, p.y);
        ctx.restore();
        return;
      }
      pushUndo();
      pixels = pixelate(canvas);
      drawing = true;
      last = p;
      dab(p);
      canvas.setPointerCapture?.(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (drawing) strokeTo(point(e));
    });
    const end = () => {
      drawing = false;
      pixels = null;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);

    root.addEventListener('click', (e) => {
      if (e.target === root) return close(null);
      const el = e.target.closest('[data-pe]');
      if (!el) return;
      const act = el.dataset.pe;
      if (act === 'cancel') {
        if (!edits || confirm('고친 내용을 버리고 닫을까요?')) close(null);
      } else if (act === 'save') {
        close(edits ? { dataUrl: exportCanvas(canvas, dataUrl), width: canvas.width, height: canvas.height } : null);
      } else if (act === 'rotate-left') rotate(-1);
      else if (act === 'rotate-right') rotate(1);
      else if (act === 'tool') setTool(el.dataset.tool);
      else if (act === 'sticker') {
        sticker = el.dataset.s;
        root.querySelectorAll('.pe-sticker').forEach((b) => b.classList.toggle('is-on', b === el));
      } else if (act === 'undo' && undo.length) {
        const prev = undo.pop();
        canvas.width = prev.width;
        canvas.height = prev.height;
        ctx.drawImage(prev, 0, 0);
        undoBtn.disabled = undo.length === 0;
        edits--;
      }
    });

    root.querySelector('[data-pe="save"]').focus();
  });
}
