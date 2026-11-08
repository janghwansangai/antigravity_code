# 🌱 나의 포트폴리오 만들기

학생이 1년 동안의 **🎨 작품 사진 · 📸 활동 사진 · 📄 PDF**를 올리고 글을 쓰면, 휴대폰과 컴퓨터에서 예쁘게 보이는 포트폴리오를 **웹페이지 파일(.html) · 압축 파일(.zip) · PDF**로 만들어 주는 웹앱입니다.

- 초등학생도 혼자 쓸 수 있게 **3단계**(① 내 소개 → ② 활동 기록 → ③ 꾸미기·저장)로 단순하게
- 디자인 **12종**: 귀여운 디자인 3종 + 깔끔한 디자인 9종, 누르면 바로 미리보기
- **서버가 없습니다.** 모든 작업은 학생 각자의 브라우저에서 처리·저장되므로 반 전체가 동시에 써도 서버 부하가 없습니다.

---

## 👩‍🏫 선생님: 학생들에게 나눠 주는 방법

| 방법 | 하는 법 | 이럴 때 |
| --- | --- | --- |
| **① 파일 하나 나눠 주기** (가장 쉬움) | [`student_portfolio_webapp.html`](./student_portfolio_webapp.html) 파일을 학생에게 보내고 두 번 눌러 열게 합니다. 설치·인터넷 필요 없음(글꼴만 인터넷이 있으면 더 예뻐짐). | 컴퓨터실, 태블릿에 파일 복사 |
| **② 웹 주소로 열기** | `npm run build` → 생긴 `dist/` 폴더를 GitHub Pages·Netlify 같은 정적 호스팅에 올리고 주소를 알려 줍니다. | 각자 기기(크롬북·태블릿·집 컴퓨터) |

> 학생 작업은 **그 기기의 브라우저에 자동 저장**됩니다. 다른 기기에서 이어서 하거나 학교 공용 컴퓨터를 쓴다면 ③단계의 **‘작업 백업 저장’**(.json)을 꼭 챙기게 해 주세요. 시크릿(사생활 보호) 창에서는 창을 닫으면 지워집니다.

### 학생이 제출하는 것
- **🌐 웹페이지 파일(.html)** — 파일 하나에 사진·PDF가 모두 들어 있어 제출·공유가 가장 쉽습니다. 휴대폰에서도 열립니다.
- **🖨️ PDF** — A4 문서. 인쇄 창에서 ‘PDF로 저장’.
- **📦 ZIP** — `index.html` + `assets/photos/` + `assets/files/` + `project-backup.json`

---

## 🧒 학생 화면 한눈에

1. **내 소개** — 이름, 학교, 제목, 소개글 (표지에 들어감)
2. **활동 기록** — `＋ 새 활동` 또는 `📷 사진부터 올리기`
   - 업로드 칸 3개: **🎨 작품 사진 / 📸 활동 사진 / 📄 PDF·파일** (눌러서 고르기 · 끌어다 놓기 · Ctrl+V 붙여넣기)
   - 휴대폰 사진(수 MB)은 **자동으로 알맞은 크기(긴 변 1600px)로 줄여** 저장
   - 사진마다 설명 쓰기, `⇄` 작품↔활동 바꾸기, `☆ 대표로`(맨 앞에 크게), `✕` 삭제
   - PDF는 포트폴리오에서 **‘열어 보기’ 카드 + 내려받기 버튼**으로 보임
3. **꾸미기·저장** — 디자인 12종 중 고르기 → 웹페이지/PDF/ZIP 저장, 백업 저장·불러오기

상단 **이름표(🙂 이름 ▾)** 를 누르면 한 컴퓨터를 여러 학생이 쓸 때 **내 포트폴리오를 골라 이어서** 하거나 **새 친구 포트폴리오**를 만들 수 있습니다(서로 덮어쓰지 않음).

---

## 🎨 디자인 12종

시안 비교 파일: [`portfolio_design_mockups.html`](./portfolio_design_mockups.html) (PC/휴대폰 크기 전환 가능)

| 번호 | id | 이름 | 이럴 때 좋아요 |
| --- | --- | --- | --- |
| 10 | `pastel` | 🧸 말랑 파스텔 *(기본값)* | 초등학생 1년 기록, 학급 활동 |
| 11 | `crayon` | 🧸 크레파스 그림일기 | 그림·일기·독서 감상 |
| 12 | `rainbow` | 🧸 알록달록 무지개 | 체험학습·동아리·발표회 |
| 1 | `editorial` | 신문 칼럼 | 글이 많은 기록 |
| 2 | `gallery` | 미니멀 갤러리 | 미술·사진·만들기 작품 |
| 3 | `timeline` | 성장 타임라인 (날짜순 자동 정렬) | 1년의 변화 |
| 4 | `academic` | 탐구 보고서 | 과학·수학·정보 탐구, 인쇄 제출 |
| 5 | `scrapbook` | 스크랩북 | 체험학습·학급 활동 |
| 6 | `showcase` | 발표 슬라이드 (← → 키로 넘김) | 발표회, 휴대폰으로 보여 주기 |
| 7 | `mag-life` | 포토 매거진 | 활동 사진이 많은 기록 |
| 8 | `mag-zine` | 팝 아트진 | 동아리·프로젝트 특집 |
| 9 | `mag-book` | 책 펼침면 | 문집, 1년 기록집 |

모든 디자인에 공통: 분류 버튼(전체·교과·프로젝트·🎨 작품 모음·📸 활동 사진), 사진 크게 보기, 휴대폰 화면 자동 맞춤, 인쇄용 정리.

---

## 🚦 여러 학생 동시 사용 · 사진 대량 업로드 점검 결과

서버는 처음 한 번 **앱 파일(약 230KB, 압축 시 약 75KB)만** 보내고, 사진·PDF는 서버로 올라가지 않습니다. 그래서 학생 수가 늘어도 서버 부담이 거의 없습니다.

테스트 환경: CPU 4개 리눅스 컴퓨터 1대, 헤드리스 크롬, 5MB짜리 휴대폰 크기 사진(4032×3024).

| 항목 | 결과 |
| --- | --- |
| 정적 서버: 학생 300명이 동시 100명씩 첫 화면 요청 | 1.2초, 실패 0건 |
| 독립된 브라우저 20명 / 30명이 동시에 사진 6장+PDF 업로드 → 내보내기 → 새로고침 | 20/20, 30/30 성공, 학생 간 데이터 섞임 없음 |
| 학생 1명 첫 화면 | 약 0.3초 (구글 글꼴이 막힌 학교망에서도 0.2초) |
| 5MB 사진 1장 저장 크기 | 약 0.5MB로 자동 축소 |

**한 학생이 사진을 많이 올렸을 때 — 기존 버전과 비교**

| 사진 수 | 항목 | 기존 버전 | 새 버전 |
| --- | --- | --- | --- |
| 12장 | 글자 입력 → 미리보기 반영 | 5.0초 | 0.17초 |
| 12장 | 글자 입력 때마다 다시 저장하는 크기 | 80MB | 0.7MB |
| 12장 | 새로고침 후 복원 | 3.5초 | 0.3초 |
| 60장 | 동작 여부 | ❌ 메모리 1.6GB, `Invalid string length` 오류로 미리보기 멈춤 | ✅ 입력 반영 0.37초, 새로고침 0.6초, 웹페이지 저장 0.9초 |

개선 내용: 사진 자동 축소, 사진은 따로 한 번만 저장(글을 고칠 때는 글만 저장), 화면에는 짧은 `blob:` 주소 사용, 저장 공간 부족 시 안내, 같은 포트폴리오를 두 창에서 고치면 경고, 업로드 칸 밖에 파일을 떨어뜨려도 페이지가 바뀌지 않도록 보호.

---

## 🛠 개발

```bash
npm install
npm run dev            # 개발 서버 (http://localhost:5173)
npm run build          # 배포용 dist/ (어느 폴더에 올려도 동작하도록 상대 경로)
npm run build:single   # student_portfolio_webapp.html 다시 만들기
npm run build:mockups  # portfolio_design_mockups.html 다시 만들기
npm run build:all      # 위 세 가지 모두
```

> `student_portfolio_webapp.html`과 `portfolio_design_mockups.html`은 **자동 생성 파일**입니다. 직접 고치지 말고 `src/`를 고친 뒤 위 명령으로 다시 만드세요. 그래야 앱·단일 파일·시안 비교가 항상 같습니다.

### 파일 구조 (다른 에이전트·개발자 협업 가이드)

```
index.html                         앱 진입점
src/
  main.js                          편집 화면 (3단계, 업로드, 이름표/포트폴리오 전환, 미리보기)
  style.css                        편집 화면 스타일 (귀엽고 단순하게)
  data/sampleData.js               시안 12종 메타데이터, 학교급별 과목, 예시 데이터
  state/store.js                   상태 관리 + IndexedDB 자동 저장 (여러 학생, 사진 분리 저장)
  templates/portfolioRenderer.js   포트폴리오 HTML 생성 + 시안 12종 CSS + PDF 문서
  templates/portfolioRuntime.js    분류 버튼·슬라이드·사진 크게 보기·PDF 열기 (앱과 내보낸 파일이 함께 사용)
  export/htmlExporter.js           웹페이지 1파일 내보내기, 작업 백업(.json)
  export/zipExporter.js            ZIP 내보내기
  export/pdfExporter.js            A4 인쇄·PDF 저장
  utils/files.js                   사진 자동 축소, 파일 읽기·내려받기
scripts/
  build-single.mjs                 단일 파일 버전 생성
  build-mockups.mjs                시안 비교 페이지 생성
```

### 시안 고치기 · 추가하기

12종 모두 **같은 HTML 구조**(`.pf` → `.pf-cover`, `.pf-works > .pf-work` …)를 쓰고, 디자인은 CSS 테마(`.pf-t-<id>`)로만 다릅니다.

1. `src/data/sampleData.js`의 `DESIGN_TEMPLATES`에 `{ id, num, group, name, description, bestFor, colors }` 추가 (`group: "cute"`면 ‘귀여운 디자인’ 묶음)
2. `src/templates/portfolioRenderer.js`의 `getPortfolioTemplatesCss()`에 `.pf-t-<id> { ... }` 블록 추가
3. (선택) `src/style.css`에 디자인 고르기 미리보기 그림 `.tt-<id>` 추가
4. `npm run build:all`

휴대폰 화면은 `@container (max-width: 640px)` 규칙이 자동으로 한 줄 배치로 바꿉니다.

### 데이터 형식 (예전 백업 파일과 호환)

```js
{
  selectedTemplate, schoolLevel,
  profile: { studentName, schoolName, gradeClass, academicYear, portfolioTitle, subtitle, introText },
  works: [{
    id, entryType: 'subject' | 'project', subject, projectName, projectRole, linkedSubjects,
    semester, month, activityType, title, content, reflection,
    images: [{ id, name, caption, dataUrl }],          // 🎨 작품 사진
    activityPhotos: [{ id, name, caption, dataUrl }],  // 📸 활동 사진
    attachments: [{ id, name, size, mimeType, dataUrl }], // 📄 PDF·파일
    coverPhotoId                                       // 대표 사진
  }]
}
```

예전 버전(IndexedDB `currentPortfolio`)에 저장된 작업은 새 버전을 처음 열 때 자동으로 옮겨집니다.
