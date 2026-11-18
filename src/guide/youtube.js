/** 유튜브 주소 → 영상 번호 (youtu.be, watch?v=, shorts, embed, live 모두). 아니면 '' */
export function youtubeId(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([\w-]{11})(?![\w-])/);
  return m ? m[1] : '';
}
