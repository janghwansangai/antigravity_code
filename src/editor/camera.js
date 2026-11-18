/**
 * 카메라로 바로 찍기
 *   📷 사진 모드: 찍을 때마다 바로 담깁니다(여러 장 연속 촬영 가능).
 *   📄 문서 모드: 찍은 뒤 '문서 스캔' 도구가 열려 모서리를 맞추고 반듯하게 펴서 담습니다.
 *
 *   openCamera({ mode }) → Promise<Array<{ blob, width, height, name }>>  (찍은 것이 없으면 빈 배열)
 *
 * 카메라를 쓸 수 없는 환경(권한 거부, http 주소, 카메라 없음)에서는
 * 기기의 기본 카메라/파일 선택 창(<input capture>)으로 대신합니다.
 */
import { canvasToBlob } from '../utils/files.js';
import { openPhotoEditor } from './photoEditor.js';

const MAX_SIDE = 2400;

function pickWithInput(mode) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.multiple = mode !== 'doc';
    input.onchange = async () => {
      const files = Array.from(input.files || []);
      if (mode !== 'doc') return resolve(files.map((f) => ({ file: f })));
      const out = [];
      for (const f of files) {
        const r = await openPhotoEditor(f, { tool: 'scan' });
        out.push(r ? { ...r, name: '문서스캔.jpg' } : { file: f });
      }
      resolve(out);
    };
    // 창을 그냥 닫은 경우를 위해(일부 브라우저는 cancel 이벤트 지원)
    input.addEventListener('cancel', () => resolve([]));
    input.click();
  });
}

export async function openCamera({ mode = 'photo' } = {}) {
  if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) return pickWithInput(mode);

  let stream;
  let cameras = []; // 이 기기의 카메라 목록 (권한을 받은 뒤에야 이름·번호를 알 수 있음)
  const SIZE = { width: { ideal: 1920 }, height: { ideal: 1080 } };
  const open = async (video) => {
    stream?.getTracks().forEach((t) => t.stop()); // 카메라 두 개를 동시에 못 여는 기기가 많아 먼저 끔
    stream = null;
    stream = await navigator.mediaDevices.getUserMedia({ video: { ...SIZE, ...video }, audio: false });
  };
  const currentId = () => {
    const track = stream?.getVideoTracks()[0];
    return track?.getSettings?.().deviceId || cameras.find((c) => c.label && c.label === track?.label)?.deviceId || '';
  };
  const listCameras = async () => {
    try {
      cameras = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput' && d.deviceId);
    } catch {
      cameras = [];
    }
  };
  try {
    await open({ facingMode: { ideal: 'environment' } }); // 처음엔 뒤쪽(작품 찍기용) 카메라를 먼저
  } catch {
    return pickWithInput(mode);
  }
  await listCameras();

  return new Promise((resolve) => {
    const shots = [];
    const root = document.createElement('div');
    root.className = 'modal camera-modal';
    root.innerHTML = `
      <div class="modal-card cam-card" role="dialog" aria-modal="true" aria-labelledby="cam-title">
        <div class="modal-head">
          <h2 id="cam-title">📷 카메라로 찍기</h2>
          <button type="button" class="btn btn-ghost btn-sm" data-cam="close" aria-label="닫기">✕</button>
        </div>
        <div class="segmented cam-mode" role="group" aria-label="찍기 종류">
          <button type="button" data-cam="mode" data-mode="photo">📷 사진·작품</button>
          <button type="button" data-cam="mode" data-mode="doc">📄 문서 스캔</button>
        </div>
        <div class="cam-stage">
          <video class="cam-video" playsinline muted autoplay></video>
          <div class="cam-guide" aria-hidden="true"></div>
          <div class="cam-flash" aria-hidden="true"></div>
        </div>
        <p class="cam-hint" data-cam-hint></p>
        <div class="cam-actions">
          <button type="button" class="btn" data-cam="flip" title="다른 카메라로 바꾸기"${cameras.length > 1 ? '' : ' hidden'}>🔄 카메라 바꾸기</button>
          <button type="button" class="cam-shutter" data-cam="shot" aria-label="찍기"></button>
          <button type="button" class="btn btn-primary" data-cam="done">완료 <span data-cam-count></span></button>
        </div>
      </div>`;
    document.body.appendChild(root);
    const video = root.querySelector('video');
    const hint = root.querySelector('[data-cam-hint]');
    const count = root.querySelector('[data-cam-count]');
    const attach = () => {
      video.srcObject = stream;
      video.play().catch(() => {});
    };
    attach();

    const setMode = (m) => {
      mode = m;
      root.querySelectorAll('[data-cam="mode"]').forEach((b) => b.classList.toggle('is-on', b.dataset.mode === mode));
      root.classList.toggle('is-doc', mode === 'doc');
      hint.textContent =
        mode === 'doc'
          ? '문서를 밝은 곳, 어두운 책상 위에 놓고 네모 안에 꽉 차게 찍으세요. 찍은 뒤 모서리를 맞춰 반듯하게 펴요.'
          : '작품이나 활동 모습을 찍으세요. 여러 장 찍은 뒤 ‘완료’를 누르면 한꺼번에 담겨요.';
    };
    setMode(mode);

    const updateCount = () => (count.textContent = shots.length ? `(${shots.length}장)` : '');

    const finish = () => {
      stream?.getTracks().forEach((t) => t.stop());
      document.removeEventListener('keydown', onKey);
      root.remove();
      resolve(shots);
    };
    const onKey = (e) => {
      if (e.key === 'Escape' && !document.querySelector('.photo-editor')) finish();
    };
    document.addEventListener('keydown', onKey);

    /** 다음 카메라로: 카메라 목록을 차례로 돌아가며 (앞·뒤뿐 아니라 USB 카메라, 광각 카메라도) */
    async function switchCamera() {
      await listCameras();
      if (cameras.length < 2) {
        hint.textContent = '바꿀 다른 카메라가 없어요.';
        return;
      }
      const from = Math.max(0, cameras.findIndex((c) => c.deviceId === currentId()));
      for (let step = 1; step < cameras.length; step++) {
        const next = cameras[(from + step) % cameras.length];
        try {
          await open({ deviceId: { exact: next.deviceId } });
          attach();
          hint.textContent = `📷 ${next.label || `카메라 ${((from + step) % cameras.length) + 1}`}`;
          return;
        } catch {
          /* 이 카메라는 못 열면 그다음 카메라로 */
        }
      }
      // 다 안 되면 원래 카메라로 되돌림
      try {
        await open({ deviceId: { exact: cameras[from].deviceId } });
        attach();
      } catch {
        /* 그대로 */
      }
      hint.textContent = '다른 카메라를 열 수 없어요. 다른 프로그램이 카메라를 쓰고 있는지 확인해 주세요.';
    }

    async function shoot() {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return;
      const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      root.classList.add('is-flash');
      setTimeout(() => root.classList.remove('is-flash'), 180);
      const blob = await canvasToBlob(canvas, false, 0.9);
      const stamp = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
      if (mode === 'doc') {
        root.hidden = true;
        const r = await openPhotoEditor(blob, { tool: 'scan' });
        root.hidden = false;
        if (r) shots.push({ ...r, name: `문서스캔_${stamp}.jpg` });
      } else {
        shots.push({ blob, width: canvas.width, height: canvas.height, name: `카메라_${stamp}.jpg` });
      }
      updateCount();
    }

    root.addEventListener('click', async (e) => {
      const el = e.target.closest('[data-cam]');
      if (!el) return;
      const act = el.dataset.cam;
      if (act === 'close' || act === 'done') finish();
      else if (act === 'mode') setMode(el.dataset.mode);
      else if (act === 'shot') {
        el.disabled = true;
        try {
          await shoot();
        } finally {
          el.disabled = false;
        }
      } else if (act === 'flip') {
        el.disabled = true;
        try {
          await switchCamera();
        } finally {
          el.disabled = false;
        }
      }
    });
  });
}
