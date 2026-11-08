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

export const DESIGN_TEMPLATES = [
  {
    id: "mag-life",
    num: "시안 7 ★잡지책 1",
    name: "포토 에세이 라이프 매거진",
    engName: "Kinfolk & Photo Spread",
    badge: "화보 잡지책",
    description: "킨포크·라이프 매거진처럼 학생들의 [활동 사진]과 [완성 작품]이 큼직한 화보 스프레드로 펼쳐지고 감성적인 에세이가 따라오는 잡지책 양식",
    colors: { bg: "#F6F5F0", text: "#262A24", accent: "#4A5D4E", surface: "#FFFFFF", border: "#D8D4C8" },
    bestFor: "활동 스냅 사진과 프로젝트·교과 에세이를 화보집처럼 남기고 싶을 때"
  },
  {
    id: "mag-zine",
    num: "시안 8 ★잡지책 2",
    name: "팝 컬처 & 아트진 매거진",
    engName: "Youth Zine & Special Issue",
    badge: "특집호 잡지책",
    description: "독립 아트진(Zine) 스타일의 대담한 블랙 보더 프레임과 [프로젝트 특집 기사 박스], [활동 사진 필름 스트립]이 돋보이는 트렌디 잡지책 양식",
    colors: { bg: "#FCFBF7", text: "#111111", accent: "#EA580C", surface: "#FACC15", border: "#111111" },
    bestFor: "동아리·융합 프로젝트 특집호 및 개성 넘치는 청소년 매거진 스타일"
  },
  {
    id: "mag-book",
    num: "시안 9 ★잡지책 3",
    name: "클래식 북저널 & 무크지",
    engName: "Literary Book-Spread",
    badge: "양면 펼침 책자형",
    description: "실제 단행본 잡지책(무크지)을 양쪽으로 펼친 듯한 2면 북 스프레드(좌측 에세이·우측 활동사진 도판)와 첫 글자 장식문자가 우아한 책자 양식",
    colors: { bg: "#F7F3E8", text: "#231F20", accent: "#6B1D2F", surface: "#EFE9D8", border: "#C8B9A6" },
    bestFor: "교내 문집, 1년 종합 학술·문학 단행본 스타일 포트폴리오"
  },
  {
    id: "editorial",
    num: "시안 1",
    name: "모던 에디토리얼 매거진",
    engName: "Archive & Press",
    badge: "신문·칼럼형",
    description: "세련된 명조 타이포그래피와 대표 아티클(Cover Story) + 2단 칼럼 레이아웃",
    colors: { bg: "#FAF7F2", text: "#1C1917", accent: "#C85A32", surface: "#F2ECE1", border: "#D6CFC5" },
    bestFor: "국어·사회·독서록 등 글과 생각이 풍부한 포트폴리오"
  },
  {
    id: "gallery",
    num: "시안 2",
    name: "노르딕 미니멀 갤러리",
    engName: "Pure Canvas",
    badge: "미술관·전시형",
    description: "미술관 도록처럼 여백의 미를 살려 학생의 그림·사진·메이커 작품과 캡션에 시선이 온전히 집중되는 양식",
    colors: { bg: "#F8FAFC", text: "#0F172A", accent: "#3D6B58", surface: "#FFFFFF", border: "#E2E8F0" },
    bestFor: "미술·디자인·실과·창작 활동 등 시각 결과물 중심 포트폴리오"
  },
  {
    id: "timeline",
    num: "시안 3",
    name: "크로니클 성장 타임라인",
    engName: "365 Days Journey",
    badge: "연대기·성장형",
    description: "3월 입학부터 2월 종업까지 1학기·2학기 시간의 흐름에 따라 배움의 궤적과 성찰을 잇는 스토리텔링 양식",
    colors: { bg: "#F4F1EA", text: "#1B2A4A", accent: "#D97706", surface: "#FFFFFF", border: "#CBD5E1" },
    bestFor: "1년 전체의 성장 과정과 학기별 변화를 강조하고 싶은 전 학년 학생"
  },
  {
    id: "academic",
    num: "시안 4",
    name: "아카데믹 리서치 저널",
    engName: "Scholar & Lab",
    badge: "탐구보고서·세특형",
    description: "목차(TOC) 자동 생성, 교과·프로젝트 번호 체계, [활동내용 → 성찰 및 결론] 구조로 정돈된 학술 리포트 양식",
    colors: { bg: "#FFFFFF", text: "#0F172A", accent: "#1E3A5F", surface: "#F8FAFC", border: "#CBD5E1" },
    bestFor: "중·고등 심화 탐구 보고서, 과학·수학·정보 프로젝트 및 PDF 인쇄 제출용"
  },
  {
    id: "scrapbook",
    num: "시안 5",
    name: "아틀리에 스크랩북",
    engName: "My Studio Note",
    badge: "다이어리·감성형",
    description: "도트 노트 질감 배경, 마스킹 테이프, 폴라로이드 사진 프레임과 포스트잇 성찰 메모가 어우러진 따뜻한 기록장",
    colors: { bg: "#FFFDF7", text: "#3E2723", accent: "#E06D53", surface: "#FFF9DB", border: "#E6DEC8" },
    bestFor: "초·중등 학급 활동, 체험학습, 창작 일기 등 친근하고 개성 있는 기록장"
  },
  {
    id: "showcase",
    num: "시안 6",
    name: "인터랙티브 쇼케이스 데크",
    engName: "Chapter Card Book",
    badge: "웹북·프레젠테이션형",
    description: "스마트폰·태블릿·PC에서 카드뉴스나 웹북처럼 챕터를 넘겨보며 발표하기 좋은 다크/모던 쇼케이스 양식",
    colors: { bg: "#18181B", text: "#F4F4F5", accent: "#14B8A6", surface: "#27272A", border: "#3F3F46" },
    bestFor: "핸드폰 링크/파일 열람, 학부모 참관수업·발표회 시연용 포트폴리오"
  }
];

export function createSamplePortfolioData() {
  return {
    selectedTemplate: "mag-life",
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
            name: "아몬드_문학비평문_김하늘.txt",
            size: "4.2 KB",
            mimeType: "text/plain",
            dataUrl: "data:text/plain;charset=utf-8," + encodeURIComponent("제목: 『아몬드』를 읽고 바라본 공감의 의미\n작성자: 한빛중학교 2학년 3반 김하늘")
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
    selectedTemplate: "mag-life",
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
