/**
 * 동영상 용량 줄이기 (브라우저 안에서, 서버 없이)
 *
 * 휴대폰 동영상(1080p·4K)은 1분에 100~400MB나 됩니다. 포트폴리오에서는 그렇게 클 필요가 없으므로
 * 화면 크기(짧은 변 720px 또는 480px)와 화질을 낮춰 MP4(H.264)로 다시 저장합니다.
 * MP4는 아이폰·갤럭시·컴퓨터 어디서나 재생됩니다.
 *
 * 브라우저의 동영상 부품(WebCodecs)을 쓰므로 크롬·엣지·웨일·최신 사파리(16.4+)·파이어폭스(130+)에서 됩니다.
 * 안 되는 브라우저이거나 줄여도 작아지지 않으면 원본을 그대로 둡니다(null).
 */

/** 동영상 크기 선택지 (짧은 변 px, 0 = 원본 그대로) */
export const VIDEO_SIZES = [
  { value: 720, label: '보통 (720p · 1분 약 12MB)' },
  { value: 480, label: '작게 (480p · 1분 약 6MB)' },
  { value: 0, label: '원본 그대로 (줄이지 않음)' }
];
export const DEFAULT_VIDEO_SIDE = 720;

/** 짧은 변 → 영상·소리 비트레이트(bit/s) */
const PRESETS = {
  720: { video: 1_400_000, audio: 96_000 },
  480: { video: 700_000, audio: 64_000 }
};

const even = (n) => Math.max(2, Math.round(n / 2) * 2);

/** 이 브라우저에서 동영상 줄이기가 될 수 있는지 (자세한 확인은 실제로 해 봐야 앎) */
export function canCompressVideo() {
  return typeof window !== 'undefined' && 'VideoEncoder' in window && 'VideoDecoder' in window;
}

/**
 * @param {Blob} file 원본 동영상
 * @param {{ shortSide?: number, onProgress?: (ratio:number)=>void }} opts
 * @returns {Promise<null | { blob: Blob, width: number, height: number, mimeType: string, duration: number }>}
 *   줄일 수 없거나 줄일 필요가 없으면 null
 */
export async function compressVideo(file, { shortSide = DEFAULT_VIDEO_SIDE, onProgress = () => {} } = {}) {
  const preset = PRESETS[shortSide];
  if (!preset || !canCompressVideo()) return null;
  const mb = await import('mediabunny');
  const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track) return null;
    const w = track.displayWidth;
    const h = track.displayHeight;
    const duration = await input.computeDuration();
    if (!w || !h || !duration) return null;

    const scale = Math.min(1, shortSide / Math.min(w, h));
    const width = even(w * scale);
    const height = even(h * scale);
    // 이미 작고 가벼운 동영상은 그대로 (다시 압축하면 화질만 나빠짐)
    const targetBytes = ((preset.video + preset.audio) * duration) / 8;
    if (scale === 1 && file.size <= targetBytes * 1.3) return null;

    const stats = await track.computePacketStats(120).catch(() => null);
    const fps = stats?.averagePacketRate || 30;
    const frameRate = fps > 31 ? 30 : undefined; // 60fps 영상은 30fps로

    const videoQuality = new mb.Quality({ bitrate: preset.video });
    const videoCodec = await mb.getFirstEncodableVideoCodec(['avc', 'vp9', 'vp8'], { width, height, quality: videoQuality, frameRate: frameRate || fps });
    if (!videoCodec) return null;
    const mp4 = videoCodec === 'avc';
    const audioTrack = await input.getPrimaryAudioTrack();
    const audioQuality = new mb.Quality({ bitrate: preset.audio });
    const audioCodec = audioTrack
      ? await mb.getFirstEncodableAudioCodec(mp4 ? ['aac', 'opus'] : ['opus', 'vorbis'], {
          numberOfChannels: Math.min(2, audioTrack.numberOfChannels || 2),
          sampleRate: audioTrack.sampleRate || 48000,
          quality: audioQuality
        })
      : null;
    if (audioTrack && !audioCodec) return null; // 소리를 잃느니 원본 유지

    const output = new mb.Output({
      format: mp4 ? new mb.Mp4OutputFormat({ fastStart: 'in-memory' }) : new mb.WebMOutputFormat(),
      target: new mb.BufferTarget()
    });
    const conversion = await mb.Conversion.init({
      input,
      output,
      tracks: 'primary',
      video: { width, height, fit: 'fill', codec: videoCodec, quality: videoQuality, frameRate, forceTranscode: true },
      audio: audioTrack ? { codec: audioCodec, quality: audioQuality, numberOfChannels: Math.min(2, audioTrack.numberOfChannels || 2) } : { discard: true }
    });
    if (!conversion.isValid || conversion.discardedTracks.some((d) => d.reason !== 'discarded_by_user')) return null;
    conversion.onProgress = (p) => onProgress(Math.min(1, p));
    await conversion.execute();
    const mimeType = mp4 ? 'video/mp4' : 'video/webm';
    const blob = new Blob([output.target.buffer], { type: mimeType });
    if (!blob.size || blob.size > file.size * 0.9) return null;
    return { blob, width, height, mimeType, duration };
  } finally {
    input.dispose();
  }
}

/** 원래 이름의 확장자를 새 형식에 맞게 (예: IMG_0012.MOV → IMG_0012.mp4) */
export function renameForType(name, mimeType) {
  const ext = mimeType === 'video/webm' ? 'webm' : 'mp4';
  return /\.[^.]+$/.test(name) ? name.replace(/\.[^.]+$/, `.${ext}`) : `${name}.${ext}`;
}
