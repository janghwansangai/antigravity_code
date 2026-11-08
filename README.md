# 학생 1년 교과 & 프로젝트 디지털 포트폴리오 메이커

학생들의 1년 동안 **교과별 결과물**과 **프로젝트 단위 활동**, 그리고 **학생 활동 사진(현장 스냅)** 및 **자신의 글·그림·첨부파일**을 올리면 핸드폰(모바일)과 컴퓨터(PC)에서 멋지게 보이는 **9종 HTML 포트폴리오(ZIP 패키지)**와 **A4 PDF 출력물**을 자동으로 만들어 주는 웹 애플리케이션입니다.

---

## 📁 저장소 파일 구조 (다른 에이전트 및 개발자 협업 가이드)

### 1. Vite 모듈형 웹앱 소스 (`src/`)
* [`index.html`](./index.html) — 메인 엔트리 HTML
* [`src/main.js`](./src/main.js) — 좌측 편집 스튜디오(기본정보·교과/프로젝트·활동사진 업로드·9종 디자인 선택) 및 우측 실시간 프리뷰(PC/모바일/PDF) 컨트롤러
* [`src/style.css`](./src/style.css) — 메인 웹앱 스튜디오 UI 스타일시트
* [`src/data/sampleData.js`](./src/data/sampleData.js) — **9종 포트폴리오 디자인 양식 메타데이터**, 학교급별(초·중·고) 과목 프리셋, 예시 학생 포트폴리오 데이터 및 내장 SVG 일러스트
* [`src/state/store.js`](./src/state/store.js) — 포트폴리오 데이터 상태 관리 및 브라우저 `IndexedDB` 자동 저장소
* [`src/templates/portfolioRenderer.js`](./src/templates/portfolioRenderer.js) — **9종 포트폴리오 디자인 템플릿 HTML/CSS 렌더러** 및 A4 인쇄 레이아웃 생성기
  * **시안 1 (`editorial`)**: 모던 에디토리얼 매거진 *(Archive & Press)*
  * **시안 2 (`gallery`)**: 노르딕 미니멀 갤러리 *(Pure Canvas)*
  * **시안 3 (`timeline`)**: 크로니클 성장 타임라인 *(365 Days Journey)*
  * **시안 4 (`academic`)**: 아카데믹 리서치 저널 *(Scholar & Lab)*
  * **시안 5 (`scrapbook`)**: 아틀리에 스크랩북 *(My Studio Note)*
  * **시안 6 (`showcase`)**: 인터랙티브 쇼케이스 데크 *(Chapter Card Book)*
  * **시안 7 (`mag-life` · 잡지책 1)**: 포토 에세이 라이프 매거진 *(Kinfolk & Photo Spread)*
  * **시안 8 (`mag-zine` · 잡지책 2)**: 팝 컬처 & 아트진 매거진 *(Youth Zine & Special Issue)*
  * **시안 9 (`mag-book` · 잡지책 3)**: 클래식 북저널 & 무크지 *(Literary Two-Page Book Spread)*
* [`src/export/zipExporter.js`](./src/export/zipExporter.js) — `JSZip` 기반 `index.html` + `style.css` + `assets/activity_photos/` + `assets/images/` + `assets/attachments/` + `project-backup.json` 압축 다운로드 모듈
* [`src/export/pdfExporter.js`](./src/export/pdfExporter.js) — A4 표지·목차·본문 인쇄 및 PDF 저장 모듈

### 2. 단일 파일 독립 실행형 버전 (루트 폴더)
* [`student_portfolio_webapp.html`](./student_portfolio_webapp.html) — 별도 빌드나 서버 없이 브라우저로 바로 열어 전체 기능을 사용하거나 디자인을 빠르게 수정·테스트할 수 있는 올인원(All-in-One) HTML 파일
* [`portfolio_design_mockups.html`](./portfolio_design_mockups.html) — 포트폴리오 디자인 시안 비교 스튜디오 파일

---

## 🚀 로컬 실행 및 빌드 방법

```bash
npm install
npm run dev
```

프로덕션 번들 빌드:
```bash
npm run build
```
