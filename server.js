const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files of the app

// Helper functions for DB access
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: {} }, null, 2), 'utf8');
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading db.json, returning empty structure', err);
    return { users: {} };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing db.json', err);
  }
}

// REST APIs
app.post('/api/signup', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
  }

  const db = readDB();
  if (db.users[username]) {
    return res.status(400).json({ error: '이미 존재하는 아이디입니다.' });
  }

  // Create default student state
  db.users[username] = {
    password,
    studentState: {
      name: username,
      grade: '고등학교 2학년',
      job: '웹 개발자',
      major: '컴퓨터공학과',
      gpa: 2.3,
      mock: 88,
      interests: ['웹프로그래밍', '앱 개발', '인공지능'],
      intro: '기술로 사람들의 삶을 더 편리하게 만들고 싶어요!'
    },
    activities: [
      {
        title: '학급 홈페이지 제작',
        date: '2026.05.26',
        category: '프로젝트',
        career: '웹 개발자',
        content: '반별 소식과 자료를 공유할 수 있는 학급 홈페이지를 기획하고 제작했어요. 역할을 나누어 기획, 디자인, 구현을 진행했어요.',
        learned: 'HTML/CSS/JS 기본 사용법을 익혔고 팀 프로젝트 협업을 배웠어요.'
      }
    ],
    todos: [
      { title: '활동 하나 기록하기', checked: false },
      { title: '관심 직업 1개 탐색', checked: false },
      { title: '포트폴리오 문장 다듬기', checked: false }
    ],
    roadmap: null
  };

  writeDB(db);
  res.json({ success: true, username });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
  }

  const db = readDB();
  const user = db.users[username];
  if (!user || user.password !== password) {
    return res.status(400).json({ error: '아이디 또는 비밀번호가 틀렸습니다.' });
  }

  res.json({ success: true, username });
});

app.get('/api/student', (req, res) => {
  const username = req.headers['x-username'];
  if (!username) {
    return res.status(401).json({ error: '인증 헤더가 누락되었습니다.' });
  }

  const db = readDB();
  const user = db.users[username];
  if (!user) {
    return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  }

  res.json({
    studentState: user.studentState,
    activities: user.activities,
    todos: user.todos,
    roadmap: user.roadmap
  });
});

app.post('/api/student', (req, res) => {
  const username = req.headers['x-username'];
  const { studentState } = req.body;
  if (!username) {
    return res.status(401).json({ error: '인증 헤더가 누락되었습니다.' });
  }

  const db = readDB();
  const user = db.users[username];
  if (!user) {
    return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  }

  user.studentState = studentState;
  writeDB(db);
  res.json({ success: true });
});

app.post('/api/activity', (req, res) => {
  const username = req.headers['x-username'];
  const { activity } = req.body;
  if (!username) {
    return res.status(401).json({ error: '인증 헤더가 누락되었습니다.' });
  }

  const db = readDB();
  const user = db.users[username];
  if (!user) {
    return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  }

  user.activities = user.activities || [];
  user.activities.unshift(activity); // Add to the beginning
  writeDB(db);
  res.json({ success: true, activities: user.activities });
});

app.post('/api/todo', (req, res) => {
  const username = req.headers['x-username'];
  const { todos } = req.body;
  if (!username) {
    return res.status(401).json({ error: '인증 헤더가 누락되었습니다.' });
  }

  const db = readDB();
  const user = db.users[username];
  if (!user) {
    return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  }

  user.todos = todos;
  writeDB(db);
  res.json({ success: true });
});

app.post('/api/roadmap', (req, res) => {
  const username = req.headers['x-username'];
  const { roadmap } = req.body;
  if (!username) {
    return res.status(401).json({ error: '인증 헤더가 누락되었습니다.' });
  }

  const db = readDB();
  const user = db.users[username];
  if (!user) {
    return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  }

  user.roadmap = roadmap;
  writeDB(db);
  res.json({ success: true });
});

// 1. 아이디 중복 체크 API
app.post('/api/check-username', (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: '아이디를 입력해주세요.' });
  }
  const db = readDB();
  const exists = !!db.users[username];
  res.json({ duplicated: exists });
});

// 커리어넷 API 폴백용 실제 데이터셋
const FALLBACK_JOBS = [
  { jobNm: "웹 개발자", jobSe: "IT/소프트웨어", jobsFld: "정보통신", summary: "대형 포털, 이커머스 등에서 웹 브라우저 기반의 사용자 인터페이스 및 서버 백엔드 시스템을 설계하고 개발합니다.", wage: "평균 4,500만원 내외", jobSeq: "1" },
  { jobNm: "인공지능 전문가", jobSe: "IT/소프트웨어", jobsFld: "정보통신", summary: "딥러닝, 머신러닝 알고리즘을 설계하고 데이터 분석을 통해 자연어 처리, 이미지 인식, 자율 주행 등의 기술을 구현합니다.", wage: "평균 5,500만원 내외", jobSeq: "2" },
  { jobNm: "정보보안 전문가", jobSe: "IT/소프트웨어", jobsFld: "정보통신", summary: "해킹, 바이러스 등 사이버 위협으로부터 데이터 및 IT 자산을 보호하고 보안 시스템을 운영 및 설계합니다.", wage: "평균 4,800만원 내외", jobSeq: "3" },
  { jobNm: "생명공학 연구원", jobSe: "바이오/헬스케어", jobsFld: "자연과학/의료", summary: "유전공학, 세포학 기술을 응용하여 신약 개발, 유전자 변형 치료, 친환경 식량 자원 연구를 진행합니다.", wage: "평균 5,000만원 내외", jobSeq: "4" },
  { jobNm: "UX/UI 디자이너", jobSe: "디자인/예술", jobsFld: "예술/디자인", summary: "사용자 리서치와 인터페이스 설계 기법을 바탕으로 모바일 앱이나 웹사이트의 사용 편의성과 미적 디자인을 총괄합니다.", wage: "평균 4,000만원 내외", jobSeq: "5" },
  { jobNm: "로봇 공학자", jobSe: "기계/엔지니어링", jobsFld: "제조/기술", summary: "하드웨어 설계 및 제어 소프트웨어 개발을 결합하여 자율 이동 로봇, 스마트 공장 자동화 기기, 협동 로봇을 제작합니다.", wage: "평균 5,200만원 내외", jobSeq: "6" },
  { jobNm: "빅데이터 분석가", jobSe: "IT/소프트웨어", jobsFld: "정보통신", summary: "수많은 비정형 데이터를 가공, 마이닝하여 트렌드를 규명하고 기업의 비즈니스적 의사결정을 돕는 예측 모델을 구축합니다.", wage: "평균 5,000만원 내외", jobSeq: "7" },
  { jobNm: "반도체 공학자", jobSe: "기계/엔지니어링", jobsFld: "제조/기술", summary: "미세 공정 최적화 및 회로 설계를 통해 차세대 D램, 플래시 메모리, 비메모리 시스템 반도체를 설계하고 공정을 관리합니다.", wage: "평균 5,600만원 내외", jobSeq: "8" }
];

const FALLBACK_MAJORS = [
  { majorNm: "컴퓨터공학과", lClass: "공학계열", summary: "하드웨어와 소프트웨어를 아우르는 컴퓨터 시스템 전반과 알고리즘, 네트워크, 데이터베이스 등을 교육합니다.", jobNames: "웹 개발자, 시스템 프로그래머, 정보보안 전문가", majorSeq: "1" },
  { majorNm: "소프트웨어학과", lClass: "공학계열", summary: "앱/웹 개발, 운영체제, 시스템 구조 등 실무 지향적 코딩 역량과 대형 소프트웨어 설계 방법론에 주력합니다.", jobNames: "앱 개발자, 웹 개발자, DevOps 엔지니어", majorSeq: "2" },
  { majorNm: "인공지능학과", lClass: "공학계열", summary: "기계학습, 딥러닝, 빅데이터 처리, 인지 지능 등 미래형 지능 시스템 연구에 초점을 맞춥니다.", jobNames: "AI 연구원, 데이터 엔지니어, 빅데이터 분석가", majorSeq: "3" },
  { majorNm: "전자공학과", lClass: "공학계열", summary: "반도체, 신호처리, 마이크로프로세서, 회로설계 등 전자소자 및 제어 기술의 기초를 다룹니다.", jobNames: "반도체 연구원, 디바이스 드라이버 개발자", majorSeq: "4" },
  { majorNm: "생명공학과", lClass: "자연계열", summary: "생물체의 생명 현상을 화학, 물리, 공학적 관점에서 분석하고 이를 의료, 제약, 농업 등에 응용하는 기술을 배웁니다.", jobNames: "생명공학 연구원, 신약 개발 연구원", majorSeq: "5" },
  { majorNm: "경영학과", lClass: "사회계열", summary: "마케팅, 인사 조직, 재무 회계, 생산 관리 등 기업 경영에 필요한 핵심 전략과 분석 도구를 체득합니다.", jobNames: "기업 기획원, 마케터, 재무 분석가", majorSeq: "6" },
  { majorNm: "미디어커뮤니케이션학과", lClass: "인문계열", summary: "방송, 영상제작, 디지털 미디어 트렌드, 언론 보도, 콘텐츠 기획 전반을 연구합니다.", jobNames: "PD, 방송 기자, 영상 에디터, 미디어 크리에이터", majorSeq: "7" },
  { majorNm: "디자인학과", lClass: "예술계열", summary: "시각 디자인, 산업 디자인, 영상 애니메이션 등 다양한 미디어를 기반으로 창의적 시각 표현과 사용자 경험을 탐구합니다.", jobNames: "UX/UI 디자이너, 그래픽 디자이너, 제품 디자이너", majorSeq: "8" }
];

// 2. 커리어넷 직업 검색 프록시 API
app.get('/api/careernet/jobs', async (req, res) => {
  const query = req.query.query || '';
  const apiKey = req.query.apiKey || '33306dbdcd4f5e718b5608b49e1e21b2';
  
  if (!query) {
    return res.json([]);
  }

  try {
    const url = `https://www.career.go.kr/cnet/front/openapi/jobs.json?apiKey=${apiKey}&searchJobNm=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('CareerNet API responded with error');
    
    const data = await response.json();
    let rawJobs = [];
    if (Array.isArray(data)) {
      rawJobs = data;
    } else if (data && Array.isArray(data.jobs)) {
      rawJobs = data.jobs;
    } else if (data && data.dataSearch && Array.isArray(data.dataSearch.content)) {
      rawJobs = data.dataSearch.content;
    }
    
    if (rawJobs.length > 0) {
      const formatted = rawJobs.map(j => ({
        name: j.jobNm || j.jobName || j.name || '',
        category: j.jobSe || j.jobCategory || '',
        field: j.jobsFld || '',
        summary: j.summary || j.jobSummary || '',
        wage: j.wage || '',
        seq: j.jobSeq || j.seq || ''
      }));
      return res.json(formatted);
    }
    throw new Error('No jobs returned from API');
  } catch (err) {
    console.log('CareerNet Jobs API failed, using fallback data:', err.message);
    const filtered = FALLBACK_JOBS.filter(j => 
      j.jobNm.includes(query) || 
      j.jobSe.includes(query) || 
      j.summary.includes(query)
    ).map(j => ({
      name: j.jobNm,
      category: j.jobSe,
      field: j.jobsFld,
      summary: j.summary,
      wage: j.wage,
      seq: j.jobSeq
    }));
    return res.json(filtered);
  }
});

// 3. 커리어넷 학과 검색 프록시 API
app.get('/api/careernet/majors', async (req, res) => {
  const query = req.query.query || '';
  const apiKey = req.query.apiKey || '33306dbdcd4f5e718b5608b49e1e21b2';
  
  if (!query) {
    return res.json([]);
  }

  try {
    const url = `https://www.career.go.kr/cnet/openapi/getOpenApi?apiKey=${apiKey}&svcType=api&svcCode=MAJOR&contentType=json&gubun=대학교&searchTitle=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('CareerNet API responded with error');
    
    const data = await response.json();
    let rawMajors = [];
    if (data && data.dataSearch && Array.isArray(data.dataSearch.content)) {
      rawMajors = data.dataSearch.content;
    }
    
    if (rawMajors.length > 0) {
      const formatted = rawMajors.map(m => ({
        name: m.majorNm || '',
        category: m.lClass || '',
        summary: m.summary || '',
        jobs: m.jobNames || '',
        seq: m.majorSeq || ''
      }));
      return res.json(formatted);
    }
    throw new Error('No majors returned from API');
  } catch (err) {
    console.log('CareerNet Majors API failed, using fallback data:', err.message);
    const filtered = FALLBACK_MAJORS.filter(m => 
      m.majorNm.includes(query) || 
      m.lClass.includes(query) || 
      m.summary.includes(query)
    ).map(m => ({
      name: m.majorNm,
      category: m.lClass,
      summary: m.summary,
      jobs: m.jobNames,
      seq: m.majorSeq
    }));
    return res.json(filtered);
  }
});

// Fallback to serve index.html for single page layout
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
