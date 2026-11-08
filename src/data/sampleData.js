// Sample SVG Illustrations encoded as Data URIs so they work both in live preview and ZIP/PDF exports
function svgToDataUri(svgString) {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svgString.trim());
}

export const SAMPLE_IMAGES = {
  // Activity Photos (학생 활동 스냅 사진)
  actRoofTeam: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 380">
      <rect width="640" height="380" fill="#DCECE5"/>
      <rect x="40" y="240" width="560" height="100" rx="10" fill="#52796F"/>
      <circle cx="195" cy="155" r="40" fill="#F4A261"/>
      <path d="M145 245 Q195 190 245 245 Z" fill="#2A9D8F"/>
      <circle cx="335" cy="148" r="40" fill="#E76F51"/>
      <path d="M285 245 Q335 185 385 245 Z" fill="#264653"/>
      <rect x="420" y="135" width="125" height="105" rx="10" fill="#84A98C" stroke="#2F3E46" stroke-width="4"/>
      <text x="320" y="305" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="19" font-weight="700">📸 [활동 사진] 학교 옥상 식물 상자 설치 및 모둠 온도 측정 현장</text>
    </svg>
  `),
  actFieldTrip: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 380">
      <rect width="640" height="380" fill="#FDEECC"/>
      <path d="M90 245 L210 130 L330 245 Z" fill="#BC6C25"/>
      <rect x="120" y="245" width="180" height="80" fill="#DDA15E"/>
      <circle cx="420" cy="180" r="36" fill="#283618"/>
      <circle cx="505" cy="188" r="34" fill="#606C38"/>
      <rect x="25" y="295" width="590" height="58" rx="8" fill="#606C38"/>
      <text x="320" y="330" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="19" font-weight="700">📸 [활동 사진] 우리 동네 근대 건축물 답사 및 어르신 인터뷰 촬영</text>
    </svg>
  `),
  actDebate: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 380">
      <rect width="640" height="380" fill="#F5E6D8"/>
      <rect x="85" y="55" width="470" height="175" rx="16" fill="#FFFFFF" stroke="#C85A32" stroke-width="4"/>
      <text x="320" y="130" text-anchor="middle" fill="#C85A32" font-family="sans-serif" font-size="22" font-weight="800">"공감은 타고나는가, 길러지는가?"</text>
      <text x="320" y="172" text-anchor="middle" fill="#57534E" font-family="sans-serif" font-size="17">국어 모둠 독서 원탁 토론 발표 현장</text>
      <circle cx="180" cy="275" r="30" fill="#C85A32"/>
      <circle cx="320" cy="275" r="30" fill="#3D6B58"/>
      <circle cx="460" cy="275" r="30" fill="#1E3A5F"/>
      <text x="320" y="345" text-anchor="middle" fill="#432818" font-family="sans-serif" font-size="19" font-weight="700">📸 [활동 사진] 국어 시간 『아몬드』 독서 디베이트 발표 모습</text>
    </svg>
  `),
  actCoding: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 380">
      <rect width="640" height="380" fill="#E0F2FE"/>
      <rect x="100" y="55" width="440" height="215" rx="16" fill="#0F172A"/>
      <text x="320" y="145" text-anchor="middle" fill="#38BDF8" font-family="monospace" font-size="21" font-weight="700">python analyze_foodwaste.py</text>
      <text x="320" y="190" text-anchor="middle" fill="#A7F3D0" font-family="sans-serif" font-size="18">학생회 급식 잔반 줄이기 캠페인 부스 운영</text>
      <text x="320" y="330" text-anchor="middle" fill="#0369A1" font-family="sans-serif" font-size="19" font-weight="700">📸 [활동 사진] 점심시간 급식실 잔반량 측정 및 캠페인 홍보</text>
    </svg>
  `),
  // Result Artwork & Charts (완성 작품 및 결과물)
  koreanBook: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 380">
      <rect width="640" height="380" fill="#F5EBE1"/>
      <circle cx="500" cy="95" r="68" fill="#E8D3BF"/>
      <circle cx="120" cy="300" r="45" fill="#EDE0D4"/>
      <path d="M145 275 Q232 250 320 275 L320 115 Q232 90 145 115 Z" fill="#FFFDF9" stroke="#8C583A" stroke-width="4"/>
      <path d="M495 275 Q408 250 320 275 L320 115 Q408 90 495 115 Z" fill="#FAF3EB" stroke="#8C583A" stroke-width="4"/>
      <line x1="180" y1="150" x2="288" y2="146" stroke="#C85A32" stroke-width="5" stroke-linecap="round"/>
      <line x1="180" y1="176" x2="282" y2="173" stroke="#A89F91" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="406" cy="222" r="24" fill="#C85A32" opacity="0.88"/>
      <text x="320" y="335" text-anchor="middle" fill="#5C3D28" font-family="sans-serif" font-size="19" font-weight="700">🎨 [완성 작품] 국어 문학 비평 · 『아몬드』 공감 구조도</text>
    </svg>
  `),
  scienceGraph: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 380">
      <rect width="640" height="380" fill="#E6F2EE"/>
      <rect x="80" y="54" width="480" height="240" rx="16" fill="#FFFFFF" stroke="#B7D7CD" stroke-width="3"/>
      <line x1="130" y1="250" x2="510" y2="250" stroke="#94A3B8" stroke-width="2.5"/>
      <line x1="130" y1="95" x2="130" y2="250" stroke="#94A3B8" stroke-width="2.5"/>
      <polyline points="150,210 230,150 320,112 410,128 490,175" fill="none" stroke="#E06D53" stroke-width="5" stroke-linecap="round"/>
      <polyline points="150,226 230,192 320,172 410,178 490,212" fill="none" stroke="#2E6F5E" stroke-width="5" stroke-linecap="round"/>
      <rect x="340" y="124" width="145" height="36" rx="8" fill="#ECFDF5" stroke="#2E6F5E" stroke-width="2"/>
      <text x="412" y="147" text-anchor="middle" fill="#065F46" font-family="sans-serif" font-size="16" font-weight="700">평균 -3.8°C 저감 확인</text>
      <text x="320" y="340" text-anchor="middle" fill="#1E4E40" font-family="sans-serif" font-size="19" font-weight="700">🎨 [완성 결과물] 옥상 녹화 식물의 증산 작용 온도 비교 차트</text>
    </svg>
  `),
  artLibrary: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 380">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#FDE68A"/>
          <stop offset="50%" stop-color="#FDBA74"/>
          <stop offset="100%" stop-color="#BAE6FD"/>
        </linearGradient>
      </defs>
      <rect width="640" height="380" fill="url(#sky)"/>
      <path d="M125 292 A195 175 0 0 1 515 292 Z" fill="#FFFFFF" opacity="0.9" stroke="#475569" stroke-width="3"/>
      <circle cx="115" cy="260" r="46" fill="#3D6B58"/>
      <circle cx="530" cy="252" r="52" fill="#2E5A48"/>
      <rect x="0" y="292" width="640" height="88" fill="#334E43"/>
      <text x="320" y="344" text-anchor="middle" fill="#FFFBEB" font-family="sans-serif" font-size="19" font-weight="700">🎨 [완성 작품] '내가 꿈꾸는 숲속 미래 도서관' 수채·디지털 일러스트</text>
    </svg>
  `),
  socialMap: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 380">
      <rect width="640" height="380" fill="#FEF3C7"/>
      <path d="M65 250 Q210 140 350 212 T580 125" fill="none" stroke="#D97706" stroke-width="6" stroke-dasharray="11,8"/>
      <circle cx="150" cy="210" r="15" fill="#B45309"/>
      <circle cx="345" cy="210" r="15" fill="#B45309"/>
      <circle cx="505" cy="152" r="18" fill="#DC2626"/>
      <text x="320" y="340" text-anchor="middle" fill="#78350F" font-family="sans-serif" font-size="19" font-weight="700">🎨 [완성 결과물] 우리 동네 근대 문화유산 스토리텔링 지도</text>
    </svg>
  `),
  infoCode: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 380">
      <rect width="640" height="380" fill="#E6FFFA"/>
      <rect x="80" y="50" width="480" height="244" rx="16" fill="#134E4A"/>
      <rect x="135" y="198" width="50" height="68" rx="5" fill="#2DD4BF"/>
      <rect x="215" y="150" width="50" height="116" rx="5" fill="#5EEAD4"/>
      <rect x="295" y="122" width="50" height="144" rx="5" fill="#FBBF24"/>
      <rect x="375" y="176" width="50" height="90" rx="5" fill="#2DD4BF"/>
      <text x="320" y="340" text-anchor="middle" fill="#115E59" font-family="sans-serif" font-size="19" font-weight="700">🎨 [완성 결과물] 파이썬 급식 잔반량 데이터 분석 차트</text>
    </svg>
  `)
};

export const SCHOOL_LEVEL_SUBJECTS = {
  elementary: ["국어", "수학", "사회", "과학", "영어", "미술", "음악", "체육", "실과", "창의적 체험활동"],
  middle: ["국어", "수학", "사회", "과학", "영어", "미술", "음악", "체육", "기술·가정", "정보", "창의적 체험활동"],
  high: ["국어", "수학", "영어", "통합사회", "통합과학", "한국사", "정보/AI", "예술/체육", "진로·자율·동아리"]
};

// 포트폴리오 디자인 시안 12종 (1~9: 깔끔한 디자인, 10~12: 귀여운 디자인)
// id는 저장된 작업 파일과의 호환을 위해 그대로 유지합니다.
// colors는 디자인 고르기 미리보기 그림과 PDF 강조색에 쓰입니다. 실제 디자인은 portfolioRenderer.js의 CSS에 있습니다.
export const DESIGN_TEMPLATES = [
  {
    id: "editorial",
    num: 1,
    name: "신문 칼럼",
    description: "명조체 제목과 2단 칼럼. 첫 번째 기록이 큰 머리기사가 돼요.",
    bestFor: "국어·사회·독서처럼 글이 많은 기록",
    colors: { bg: "#FAF7F2", text: "#1C1917", accent: "#C85A32", surface: "#F2ECE1", border: "#D6CFC5" }
  },
  {
    id: "gallery",
    num: 2,
    name: "미니멀 갤러리",
    description: "하얀 여백에 사진과 작품이 돋보이는 전시회 도록 느낌이에요.",
    bestFor: "미술·사진·만들기 작품",
    colors: { bg: "#FFFFFF", text: "#111827", accent: "#3D6B58", surface: "#F3F4F6", border: "#E5E7EB" }
  },
  {
    id: "timeline",
    num: 3,
    name: "성장 타임라인",
    description: "3월부터 2월까지 날짜 순서대로 자동 정렬돼 한 줄로 이어져요.",
    bestFor: "1년 동안의 변화를 보여 주고 싶을 때",
    colors: { bg: "#F4F1EA", text: "#1B2A4A", accent: "#D97706", surface: "#FFFFFF", border: "#CBD5E1" }
  },
  {
    id: "academic",
    num: 4,
    name: "탐구 보고서",
    description: "번호가 붙은 단정한 보고서. 활동 내용과 느낀 점이 나란히 놓여요.",
    bestFor: "과학·수학·정보 탐구, 인쇄 제출용",
    colors: { bg: "#FFFFFF", text: "#0F172A", accent: "#1E3A5F", surface: "#F1F5F9", border: "#CBD5E1" }
  },
  {
    id: "scrapbook",
    num: 5,
    name: "스크랩북",
    description: "모눈 종이 위에 사진과 메모를 붙인 듯한 따뜻한 기록장이에요.",
    bestFor: "체험학습·학급 활동·일기",
    colors: { bg: "#FFFDF7", text: "#3E2723", accent: "#E06D53", surface: "#FFF4D6", border: "#E6DEC8" }
  },
  {
    id: "showcase",
    num: 6,
    name: "발표 슬라이드",
    description: "한 장씩 넘겨 보는 어두운 화면. 키보드 ← → 로도 넘길 수 있어요.",
    bestFor: "발표회, 휴대폰으로 보여 주기",
    colors: { bg: "#18181B", text: "#F4F4F5", accent: "#14B8A6", surface: "#27272A", border: "#3F3F46" }
  },
  {
    id: "mag-life",
    num: 7,
    name: "포토 매거진",
    description: "큰 사진 한 장과 짧은 에세이가 잡지 화보처럼 펼쳐져요.",
    bestFor: "활동 사진이 많은 기록",
    colors: { bg: "#F6F5F0", text: "#262A24", accent: "#4A5D4E", surface: "#FFFFFF", border: "#D8D4C8" }
  },
  {
    id: "mag-zine",
    num: 8,
    name: "팝 아트진",
    description: "굵은 검정 테두리와 노란색 포인트로 개성 있게 꾸며요.",
    bestFor: "동아리·프로젝트 특집호",
    colors: { bg: "#FCFBF7", text: "#111111", accent: "#EA580C", surface: "#FACC15", border: "#111111" }
  },
  {
    id: "mag-book",
    num: 9,
    name: "책 펼침면",
    description: "왼쪽 쪽에는 글, 오른쪽 쪽에는 사진. 책을 펼친 모양이에요.",
    bestFor: "문집, 1년 기록집",
    colors: { bg: "#F7F3E8", text: "#231F20", accent: "#6B1D2F", surface: "#EFE9D8", border: "#C8B9A6" }
  },
  // ---- 귀여운 디자인 (초등학생용) ----
  {
    id: "pastel",
    num: 10,
    group: "cute",
    name: "말랑 파스텔",
    description: "분홍·민트·보라 파스텔 카드와 말풍선 메모가 말랑말랑 귀여워요.",
    bestFor: "초등학생 1년 기록, 학급 활동",
    colors: { bg: "#FFF4F7", text: "#4A3B52", accent: "#FF7EA8", surface: "#FFFFFF", border: "#FFD6E3" }
  },
  {
    id: "crayon",
    num: 11,
    group: "cute",
    name: "크레파스 그림일기",
    description: "줄 공책 위에 손으로 그린 듯한 테두리. 그림일기처럼 정겨워요.",
    bestFor: "그림·일기·독서 감상",
    colors: { bg: "#FFFDF2", text: "#3B3A36", accent: "#FF6B6B", surface: "#FFFFFF", border: "#3B3A36" }
  },
  {
    id: "rainbow",
    num: 12,
    group: "cute",
    name: "알록달록 무지개",
    description: "활동마다 무지개 색 카드로 바뀌어요. 밝고 신나는 느낌!",
    bestFor: "체험학습·동아리·발표회",
    colors: { bg: "#FFFFFF", text: "#2F3A4A", accent: "#7C6CF2", surface: "#FFF1C9", border: "#E9E5FF" }
  }
];

export const DEFAULT_TEMPLATE_ID = "pastel";

export function createSamplePortfolioData() {
  return {
    selectedTemplate: DEFAULT_TEMPLATE_ID,
    schoolLevel: "middle",
    customSubjects: ["국어", "수학", "사회", "과학", "영어", "미술", "음악", "체육", "기술·가정", "정보", "창의적 체험활동"],
    customProjects: ["생태 도시 열섬 해결 프로젝트", "우리 마을 역사 다큐 프로젝트", "AI 급식 잔반 제로 프로젝트"],
    profile: {
      portfolioTitle: "2026 나의 배움과 성장 매거진",
      subtitle: "교과 수업과 융합 프로젝트, 그리고 생생한 활동 사진으로 기록한 열두 달",
      studentName: "김하늘",
      schoolName: "한빛중학교",
      gradeClass: "2학년 3반 7번",
      academicYear: "2026학년도",
      introText: "안녕하세요! 저는 친구들과 함께 부딪히며 탐구하는 프로젝트 활동과 글쓰기, 그림 그리기를 좋아하는 김하늘입니다. 1년 동안 교실과 현장에서 땀 흘린 활동 사진들과 교과별·프로젝트별 결과물을 한 권의 잡지책처럼 엮었습니다.",
      teacherComment: "하늘 학생은 교과 간 연결 고리를 찾아 프로젝트로 확장하는 힘이 뛰어난 학생입니다. 생생한 활동 과정과 성찰 기록이 돋보입니다."
    },
    works: [
      {
        id: "work-1",
        entryType: "project",
        projectName: "생태 도시 열섬 해결 프로젝트",
        linkedSubjects: "과학 × 사회 × 기술·가정 융합",
        projectRole: "실험 설계 및 온도 데이터 시각화 담당",
        subject: "과학",
        semester: "1학기",
        month: "6월",
        activityType: "융합 탐구 프로젝트",
        title: "초록 지붕 프로젝트: 학교 옥상 녹화 식물의 증산 작용 온도 측정",
        content: "기후 위기 대응 프로젝트의 일환으로 4명의 모둠원과 함께 학교 옥상에 다육식물·잔디 모형 상자를 설치하고, 2주간 점심시간마다 표면 온도를 비교 측정했습니다. 오후 2시 기준 식물 모형 상자 내부 온도가 일반 상자보다 평균 3.8°C 낮게 유지됨을 확인했습니다.",
        reflection: "장마철 비바람 때문에 실험 상자를 재설치하는 시행착오도 있었지만, 친구들과 옥상을 오르내리며 찍은 활동 사진과 데이터 그래프를 보니 진짜 연구자가 된 기분이 들었습니다.",
        featured: true,
        activityPhotos: [
          {
            id: "ap-1",
            name: "rooftop_team_activity.svg",
            caption: "점심시간 학교 옥상에서 모둠원들과 식물 실험 상자 온도를 측정하는 모습",
            dataUrl: SAMPLE_IMAGES.actRoofTeam
          }
        ],
        images: [
          {
            id: "img-1",
            name: "science_green_roof_chart.svg",
            caption: "아스팔트 대비 옥상 녹화 식물 상자의 시간대별 온도 저감 그래프",
            dataUrl: SAMPLE_IMAGES.scienceGraph
          }
        ],
        attachments: [
          {
            id: "att-1",
            name: "옥상녹화_온도측정_실험데이터.csv",
            size: "1.8 KB",
            mimeType: "text/csv",
            dataUrl: "data:text/csv;charset=utf-8," + encodeURIComponent("시간,일반상자온도(C),녹화상자온도(C),온도차이(C)\n10:00,26.4,24.8,-1.6\n12:00,31.2,28.1,-3.1\n14:00,34.5,30.7,-3.8\n16:00,32.0,29.1,-2.9")
          }
        ]
      },
      {
        id: "work-2",
        entryType: "project",
        projectName: "우리 마을 역사 다큐 프로젝트",
        linkedSubjects: "사회 × 미술 × 국어 융합",
        projectRole: "현장 답사 사진 촬영 및 스토리텔링 지도 일러스트 제작",
        subject: "사회",
        semester: "2학기",
        month: "10월",
        activityType: "지역 답사 프로젝트",
        title: "골목길 시간 여행: 우리 동네 근대 문화유산 답사 지도 & 인터뷰",
        content: "지역 내 보존 가치가 있는 오래된 골목과 근대 건축물 4곳을 직접 걸으며 촬영하고, 동네 토박이 어르신 인터뷰를 더해 스토리텔링 일러스트 지도로 제작했습니다.",
        reflection: "매일 무심코 지나치던 낡은 건물이 70년 전 지역 주민들의 사랑방이었다는 사실을 알게 되며 우리 동네의 역사를 바라보는 눈이 달라졌습니다.",
        featured: false,
        activityPhotos: [
          {
            id: "ap-2",
            name: "fieldtrip_interview.svg",
            caption: "1954년 건립된 구 양조장 앞에서 동네 어르신께 옛 이야기를 듣는 인터뷰 현장",
            dataUrl: SAMPLE_IMAGES.actFieldTrip
          }
        ],
        images: [
          {
            id: "img-2",
            name: "social_heritage_storymap.svg",
            caption: "우리 동네 근대 문화유산 4대 거점 답사 코스 일러스트 지도",
            dataUrl: SAMPLE_IMAGES.socialMap
          }
        ],
        attachments: []
      },
      {
        id: "work-3",
        entryType: "subject",
        projectName: "",
        linkedSubjects: "",
        projectRole: "",
        subject: "국어",
        semester: "1학기",
        month: "4월",
        activityType: "글쓰기 · 문학 비평",
        title: "문학 비평 에세이: 『아몬드』를 읽고 바라본 공감의 의미",
        content: "타인의 감정을 느끼지 못하는 주인공 윤재가 친구 곤이를 만나 변화하는 과정을 분석하고, 학급 원탁 토론에서 나눈 다양한 의견을 종합해 2,400자 비평문으로 작성했습니다.",
        reflection: "처음에는 단순 줄거리 요약에 그쳤지만, 독서 디베이트와 퇴고 과정을 거치며 '공감은 타고나는 능력이 아니라 이해하려는 끝없는 의지'라는 나만의 주장을 세울 수 있었습니다.",
        featured: false,
        activityPhotos: [
          {
            id: "ap-3",
            name: "korean_debate_activity.svg",
            caption: "국어 시간 모둠 원탁 독서 토론에서 핵심 논제를 발표하는 모습",
            dataUrl: SAMPLE_IMAGES.actDebate
          }
        ],
        images: [
          {
            id: "img-3",
            name: "korean_almond_essay_illust.svg",
            caption: "『아몬드』 핵심 갈등 구조 및 공감 주제 시각화 노트",
            dataUrl: SAMPLE_IMAGES.koreanBook
          }
        ],
        attachments: [
          {
            id: "att-3",
            name: "아몬드_독서감상문_김하늘.pdf",
            size: "0.7 KB",
            mimeType: "application/pdf",
            dataUrl: "data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA1OTUgODQyXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA1IDAgUiA+PiA+PiAvQ29udGVudHMgNCAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL0xlbmd0aCAxNjcgPj4Kc3RyZWFtCkJUIC9GMSAyOCBUZiA3MiA3NjAgVGQgKEJvb2sgUmVwb3J0OiBBbG1vbmQpIFRqIEVUCkJUIC9GMSAxNCBUZiA3MiA3MjAgVGQgKFNhbXBsZSBQREYgYXR0YWNobWVudCAtIFN0dWRlbnQgUG9ydGZvbGlvIE1ha2VyKSBUaiBFVAowLjk1IDAuNDIgMC40MiByZyA3MiA2NDAgNDUxIDQwIHJlIGYKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCjw8IC9UeXBlIC9Gb250IC9TdWJ0eXBlIC9UeXBlMSAvQmFzZUZvbnQgL0hlbHZldGljYSA+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDExNSAwMDAwMCBuIAowMDAwMDAwMjQxIDAwMDAwIG4gCjAwMDAwMDA0NTggMDAwMDAgbiAKdHJhaWxlcgo8PCAvU2l6ZSA2IC9Sb290IDEgMCBSID4+CnN0YXJ0eHJlZgo1MjgKJSVFT0YK"
          }
        ]
      },
      {
        id: "work-4",
        entryType: "project",
        projectName: "AI 급식 잔반 제로 프로젝트",
        linkedSubjects: "정보 × 환경동아리",
        projectRole: "파이썬 데이터 분석 및 점심시간 캠페인 부스 운영",
        subject: "정보",
        semester: "2학기",
        month: "12월",
        activityType: "SW 데이터 캠페인 프로젝트",
        title: "데이터로 바꾸는 급식실: 선호 메뉴 분석 및 잔반 제로 캠페인",
        content: "파이썬으로 3개월간의 학교 급식 메뉴별 잔반량 데이터를 분류하고, 잔반이 적은 조리법의 특징을 도출해 점심시간 급식실 앞에서 전교생 캠페인 부스를 운영했습니다.",
        reflection: "코드를 짜서 그래프를 출력하는 것에 그치지 않고, 친구들과 피켓을 들고 캠페인을 벌여 실제 잔반량을 줄인 가장 뿌듯한 프로젝트였습니다.",
        featured: false,
        activityPhotos: [
          {
            id: "ap-4",
            name: "coding_campaign_booth.svg",
            caption: "점심시간 급식실 앞 잔반 제로 캠페인 부스 운영 및 설문 스티커 투표 현장",
            dataUrl: SAMPLE_IMAGES.actCoding
          }
        ],
        images: [
          {
            id: "img-4",
            name: "info_python_foodwaste_analysis.svg",
            caption: "파이썬 데이터 시각화: 조리법별 급식 잔반량 비교 차트",
            dataUrl: SAMPLE_IMAGES.infoCode
          }
        ],
        attachments: []
      },
      {
        id: "work-5",
        entryType: "subject",
        projectName: "",
        linkedSubjects: "",
        projectRole: "",
        subject: "미술",
        semester: "1학기",
        month: "7월",
        activityType: "그림 · 시각 예술",
        title: "디지털 일러스트 & 수채화: '내가 꿈꾸는 숲속 미래 도서관'",
        content: "종이책의 따뜻한 질감과 홀로그램 아카이브가 공존하는 숲속 유리 돔 도서관을 2점 투시도법으로 스케치하고, 수채 물감 배경 위에 태블릿 디지털 드로잉을 결합해 완성한 작품입니다.",
        reflection: "빛이 유리 천장을 통과해 나무와 책장 사이로 퍼지는 색감을 표현하기 위해 세 번의 레이어 채색을 시도했습니다.",
        featured: false,
        activityPhotos: [],
        images: [
          {
            id: "img-5",
            name: "art_future_library.svg",
            caption: "'내가 꿈꾸는 숲속 미래 도서관' 완성 일러스트",
            dataUrl: SAMPLE_IMAGES.artLibrary
          }
        ],
        attachments: []
      }
    ]
  };
}

export function createBlankPortfolioData() {
  return {
    selectedTemplate: DEFAULT_TEMPLATE_ID,
    schoolLevel: "middle",
    customSubjects: ["국어", "수학", "사회", "과학", "영어", "미술", "음악", "체육", "기술·가정", "정보", "창의적 체험활동"],
    customProjects: ["나의 융합 탐구 프로젝트", "우리 모둠 자율 프로젝트"],
    profile: {
      portfolioTitle: "2026 나의 배움과 성장 매거진",
      subtitle: "1년 동안의 교과별·프로젝트별 활동과 나의 생각을 담은 디지털 기록장",
      studentName: "",
      schoolName: "",
      gradeClass: "",
      academicYear: "2026학년도",
      introText: "",
      teacherComment: ""
    },
    works: []
  };
}
