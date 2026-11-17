import { defineConfig } from 'vite';

export default defineConfig({
  // './' : 빌드 결과(dist)를 GitHub Pages 하위 경로나 아무 폴더에 올려도 동작하도록 상대 경로로 만듭니다.
  base: './',
  build: {
    // pdf.js(PDF 내용 보이기)는 PDF를 올릴 때만 불러오는 큰 파일이라 경고 기준을 넉넉히 둡니다.
    chunkSizeWarningLimit: 1600
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true
  }
});
