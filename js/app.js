// --- Serverless / Static Storage Interceptor ---
const isServerless = location.hostname.endsWith("github.io") || 
                     location.protocol === "file:" || 
                     (!location.port && location.hostname !== "localhost") || 
                     window.location.href.includes("github.io");

// Hide default name before auth loads (prevents "김브릿지" flash)
document.addEventListener("DOMContentLoaded", () => {
  const headerName = document.getElementById("header-user-name");
  const storedUser = localStorage.getItem("currentUser");
  if (!storedUser && headerName) {
    headerName.textContent = "비회원";
  }
  const avatarMini = document.getElementById("avatar-initials-mini");
  if (!storedUser && avatarMini) {
    avatarMini.textContent = "비";
  }
});

function normalizeCareerText(value) {
  return String(value || "").toLowerCase().replace(/[\s·ㆍ\-_\/()]/g, "");
}

function matchesCareerField(text, field = "all") {
  if (field === "all") return true;
  const normalizedText = normalizeCareerText(text);
  const buckets = {
    IT: ["it", "소프트웨어", "정보통신", "컴퓨터", "웹", "앱", "인공지능", "데이터", "보안", "게임"],
    보건: ["보건", "의료", "간호", "의사", "약", "물리치료", "동물보건", "생명"],
    교육: ["교육", "교사", "유아교육", "상담", "심리", "멘토링"],
    사회: ["사회", "복지", "법", "경찰", "소방", "공공", "행정", "안전"],
    경영: ["경영", "금융", "회계", "마케팅", "상품", "은행", "기획", "비즈니스", "경제"],
    공학: ["공학", "전기", "전자", "기계", "건축", "토목", "자동차", "항공", "반도체", "화학", "제조"],
    문화: ["문화", "예술", "디자인", "방송", "스포츠", "콘텐츠", "작가", "공연", "미디어"],
    서비스: ["관광", "서비스", "조리", "호텔", "셰프", "음식", "외식"],
    농생명: ["농", "환경", "생명", "스마트팜", "식품", "동물"]
  };
  return (buckets[field] || []).some((keyword) => normalizedText.includes(normalizeCareerText(keyword)));
}

function getMockDB() {
  let dbStr = localStorage.getItem("jobbridge_db");
  if (!dbStr) {
    const defaultDB = {
      users: {
        "admin": {
          password: "admin",
          studentState: {
            name: "admin",
            grade: "",
            job: "",
            major: "",
            gpa: 0,
            mock: 0,
            interests: [],
            intro: "",
            preferenceTags: [],
            activityStyles: [],
            interestProfile: null,
            onboardingCompleted: false
          },
          activities: [],
          todos: [],
          roadmap: null
        }
      }
    };
    localStorage.setItem("jobbridge_db", JSON.stringify(defaultDB));
    return defaultDB;
  }
  try {
    return JSON.parse(dbStr);
  } catch (e) {
    return { users: {} };
  }
}

function saveMockDB(db) {
  localStorage.setItem("jobbridge_db", JSON.stringify(db));
}

function simulateApi(path, options, queryParams) {
  const db = getMockDB();
  const headers = options?.headers || {};
  const method = options?.method || "GET";
  let body = {};
  if (options?.body) {
    try {
      body = JSON.parse(options.body);
    } catch (e) {}
  }
  
  if (path === "/api/check-username" && method === "POST") {
    const { username } = body;
    const exists = !!db.users[username];
    return { status: 200, body: { duplicated: exists } };
  }
  
  if (path === "/api/signup" && method === "POST") {
    const { username, password } = body;
    if (!username || !password) {
      return { status: 400, body: { error: "아이디와 비밀번호를 입력해주세요." } };
    }
    if (db.users[username]) {
      return { status: 400, body: { error: "이미 존재하는 아이디입니다." } };
    }
    
    db.users[username] = {
      password,
      studentState: {
        name: username,
        grade: '',
        job: '',
        major: '',
        gpa: 0,
        mock: 0,
        interests: [],
        intro: '',
        preferenceTags: [],
        activityStyles: [],
        interestProfile: null,
        onboardingCompleted: false,
        ...(body.studentState || {})
      },
      activities: [],
      todos: [],
      roadmap: null
    };
    saveMockDB(db);
    return { status: 200, body: { success: true, username } };
  }
  
  if (path === "/api/login" && method === "POST") {
    const { username, password } = body;
    if (!username || !password) {
      return { status: 400, body: { error: "아이디와 비밀번호를 입력해주세요." } };
    }
    const user = db.users[username];
    if (!user || user.password !== password) {
      return { status: 400, body: { error: "아이디 또는 비밀번호가 틀렸습니다." } };
    }
    return { status: 200, body: { success: true, username } };
  }
  
  const authUser = headers["X-Username"] || headers["x-username"];
  if (path === "/api/student" && method === "GET") {
    if (!authUser) return { status: 401, body: { error: "인증 헤더가 누락되었습니다." } };
    const user = db.users[authUser];
    if (!user) return { status: 404, body: { error: "사용자를 찾을 수 없습니다." } };
    return {
      status: 200,
      body: {
        studentState: user.studentState,
        activities: user.activities || [],
        todos: user.todos || [],
        roadmap: user.roadmap || null
      }
    };
  }
  
  if (path === "/api/student" && method === "POST") {
    if (!authUser) return { status: 401, body: { error: "인증 헤더가 누락되었습니다." } };
    const user = db.users[authUser];
    if (!user) return { status: 404, body: { error: "사용자를 찾을 수 없습니다." } };
    user.studentState = body.studentState;
    saveMockDB(db);
    return { status: 200, body: { success: true } };
  }
  
  if (path === "/api/activity" && method === "POST") {
    if (!authUser) return { status: 401, body: { error: "인증 헤더가 누락되었습니다." } };
    const user = db.users[authUser];
    if (!user) return { status: 404, body: { error: "사용자를 찾을 수 없습니다." } };
    user.activities = user.activities || [];
    user.activities.unshift(body.activity);
    saveMockDB(db);
    return { status: 200, body: { success: true, activities: user.activities } };
  }
  
  if (path === "/api/todo" && method === "POST") {
    if (!authUser) return { status: 401, body: { error: "인증 헤더가 누락되었습니다." } };
    const user = db.users[authUser];
    if (!user) return { status: 404, body: { error: "사용자를 찾을 수 없습니다." } };
    user.todos = body.todos;
    saveMockDB(db);
    return { status: 200, body: { success: true } };
  }
  
  if (path === "/api/roadmap" && method === "POST") {
    if (!authUser) return { status: 401, body: { error: "인증 헤더가 누락되었습니다." } };
    const user = db.users[authUser];
    if (!user) return { status: 404, body: { error: "사용자를 찾을 수 없습니다." } };
    user.roadmap = body.roadmap;
    saveMockDB(db);
    return { status: 200, body: { success: true } };
  }
  
  throw new Error("경로를 찾을 수 없습니다.");
}

if (isServerless) {
  console.log("ℹ️ Running in static mode. Using localStorage.");
  
  const originalFetch = window.fetch;
  window.fetch = async function(url, options) {
    let path = url;
    let queryParams = {};
    if (url.includes("?")) {
      const parts = url.split("?");
      path = parts[0];
      const searchParams = new URLSearchParams(parts[1]);
      for (const [key, val] of searchParams.entries()) {
        queryParams[key] = val;
      }
    }
    
    if (path.startsWith("/api/")) {
      return new Promise((resolve) => {
        setTimeout(() => {
          try {
            const result = simulateApi(path, options, queryParams);
            resolve(new Response(JSON.stringify(result.body), {
              status: result.status || 200,
              headers: { "Content-Type": "application/json" }
            }));
          } catch (e) {
            resolve(new Response(JSON.stringify({ error: e.message }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            }));
          }
        }, 150);
      });
    }
    return originalFetch(url, options);
  };
}

let currentUser = null;
let activitiesList = [];


async function checkAuth() {
  const storedUser = localStorage.getItem("currentUser");
  const authScreen = document.getElementById("auth-screen");
  const appFrame = document.querySelector(".app-frame");

  if (storedUser) {
    currentUser = storedUser;
    if (authScreen) authScreen.style.display = "none";
    if (appFrame) appFrame.style.display = "flex";
    
    await loadStudentData();
    setupLogoutListener();
    updateAuthUI(true);
  } else {
    currentUser = null;
    sessionStorage.setItem("guestMode", "true");
    if (authScreen) authScreen.style.display = "none";
    if (appFrame) appFrame.style.display = "flex";
    
    await loadStudentData();
    setupLogoutListener();
    updateAuthUI(false);
  }

  syncInterestFlow();
}

let isUsernameChecked = false;
let checkedUsername = "";

function escapeHtml(value = "") {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

const signupInterestTypes = {
  R: {
    label: "현실형(실행·기술)",
    jobs: ["전기공학 기술자", "자동차 정비원", "항공정비사"],
    majors: ["전기전자공학과", "기계공학과", "항공정비학과"]
  },
  I: {
    label: "탐구형(분석·연구)",
    jobs: ["생명공학 연구원", "환경공학 기술자", "데이터 분석가"],
    majors: ["생명공학과", "환경공학과", "통계학과"]
  },
  A: {
    label: "예술형(창작·표현)",
    jobs: ["UX/UI 디자이너", "영상 편집자", "작가"],
    majors: ["디자인학과", "미디어커뮤니케이션학과", "문예창작학과"]
  },
  S: {
    label: "사회형(교육·돌봄)",
    jobs: ["교사", "상담심리사", "간호사"],
    majors: ["교육학과", "심리학과", "간호학과"]
  },
  E: {
    label: "진취형(설득·경영)",
    jobs: ["마케터", "상품기획자", "창업가"],
    majors: ["경영학과", "광고홍보학과", "e-비즈니스과"]
  },
  C: {
    label: "관습형(자료·사무)",
    jobs: ["회계사", "은행원", "행정사무원"],
    majors: ["회계학과", "경영정보학과", "행정학과"]
  }
};

const signupInterestQuestions = [
  { type: "R", text: "도구, 기계, 장비를 직접 만지며 원리를 확인하는 활동이 좋다." },
  { type: "R", text: "말로 설명만 듣는 것보다 만들고 조립하며 배우는 편이 집중이 잘 된다." },
  { type: "R", text: "자동차, 전기, 로봇, 항공, 기계 구조처럼 실제 작동하는 대상이 궁금하다." },
  { type: "I", text: "자료를 찾아보고 가설을 세운 뒤 근거를 비교하는 활동이 흥미롭다." },
  { type: "I", text: "과학, 수학, 데이터, 실험 결과를 분석할 때 시간이 잘 간다." },
  { type: "I", text: "정답보다 왜 그런 결과가 나왔는지 끝까지 파고드는 편이다." },
  { type: "A", text: "글, 그림, 영상, 디자인, 음악 등으로 내 생각을 표현하는 활동이 좋다." },
  { type: "A", text: "정해진 양식보다 새로운 방식으로 결과물을 만드는 과제에 끌린다." },
  { type: "A", text: "색, 화면 구성, 스토리, 분위기처럼 표현의 완성도를 자주 생각한다." },
  { type: "S", text: "친구가 이해할 수 있게 설명하거나 도와줄 때 보람을 느낀다." },
  { type: "S", text: "상담, 교육, 보건, 복지처럼 사람의 변화를 돕는 일에 관심이 있다." },
  { type: "S", text: "혼자 빠르게 끝내는 것보다 함께 조율하며 해결하는 과정이 편하다." },
  { type: "E", text: "아이디어를 제안하고 사람들을 설득해 일을 추진하는 활동이 좋다." },
  { type: "E", text: "창업, 마케팅, 발표, 리더 역할처럼 목표를 세우고 실행하는 일에 끌린다." },
  { type: "E", text: "결과를 숫자나 성과로 확인하고 다음 전략을 세우는 과정이 재미있다." },
  { type: "C", text: "자료를 정리하고 기준에 맞게 분류하는 일을 차분히 처리하는 편이다." },
  { type: "C", text: "계획표, 체크리스트, 기록 양식처럼 구조가 분명할수록 안정감을 느낀다." },
  { type: "C", text: "회계, 행정, 금융, 문서 관리처럼 정확성이 필요한 일에 관심이 있다." }
];

function renderSignupInterestTest() {
  const container = document.getElementById("signup-interest-questions");
  if (!container || container.children.length) return;
  signupInterestQuestions.forEach((question, index) => {
    const card = document.createElement("article");
    card.className = "signup-question-card";
    card.dataset.signupQuestion = String(index);
    card.dataset.type = question.type;
    card.innerHTML = `
      <p>${index + 1}. ${escapeHtml(question.text)}</p>
      <div class="signup-scale" aria-label="동의 정도">
        ${[1, 2, 3, 4, 5].map((value) => `<button type="button" data-value="${value}" title="${value}점">${value}</button>`).join("")}
      </div>
    `;
    card.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        card.querySelectorAll("button").forEach((item) => item.classList.remove("is-active"));
        button.classList.add("is-active");
        updateSignupInterestPreview();
      });
    });
    container.appendChild(card);
  });
}

function readSignupInterestResult() {
  const scores = Object.fromEntries(Object.keys(signupInterestTypes).map((key) => [key, 0]));
  let answered = 0;
  document.querySelectorAll(".signup-question-card").forEach((card) => {
    const active = card.querySelector(".signup-scale button.is-active");
    if (!active) return;
    answered += 1;
    scores[card.dataset.type] += Number(active.dataset.value || 0);
  });
  const ranked = Object.entries(scores)
    .map(([key, score]) => ({ key, score, profile: signupInterestTypes[key] }))
    .sort((a, b) => b.score - a.score);
  return { answered, ranked, scores };
}

function selectedSignupValues(selector) {
  return Array.from(document.querySelectorAll(`${selector} button.is-active`)).map((button) => button.dataset.signupChip || button.dataset.signupStyle || button.textContent.trim());
}

function updateSignupInterestPreview() {
  const preview = document.getElementById("signup-result-preview");
  if (!preview) return;
  const { answered, ranked } = readSignupInterestResult();
  const top = ranked.slice(0, 2).filter((item) => item.score > 0);
  if (!top.length) {
    preview.innerHTML = `<strong>검사 결과 미리보기</strong><p>문항에 답하면 상위 흥미 유형과 추천 직업·학과가 표시됩니다.</p>`;
    return;
  }
  const jobs = Array.from(new Set(top.flatMap((item) => item.profile.jobs))).slice(0, 4);
  const majors = Array.from(new Set(top.flatMap((item) => item.profile.majors))).slice(0, 4);
  preview.innerHTML = `
    <strong>${top.map((item) => `${item.profile.label} ${item.score}점`).join(" · ")}</strong>
    <p>${answered}/${signupInterestQuestions.length}문항 응답. 추천 직업: ${jobs.join(", ")} / 추천 학과: ${majors.join(", ")}</p>
  `;
}

function setupSignupChipButtons() {
  document.querySelectorAll("#signup-detail-chips button, #signup-style-chips button").forEach((button) => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      button.classList.toggle("is-active");
      updateSignupInterestPreview();
    });
  });
}

function collectSignupOnboarding(username) {
  const { answered, ranked, scores } = readSignupInterestResult();
  const top = ranked.filter((item) => item.score > 0).slice(0, 3);
  const preferenceTags = selectedSignupValues("#signup-detail-chips");
  const activityStyles = selectedSignupValues("#signup-style-chips");
  const primary = top[0]?.profile;
  return {
    answered,
    studentState: {
      name: document.getElementById("signup-name")?.value.trim() || username,
      grade: document.getElementById("signup-grade")?.value || "",
      job: primary?.jobs?.[0] || "",
      major: primary?.majors?.[0] || "",
      gpa: 0,
      mock: 0,
      interests: top.map((item) => item.profile.label),
      intro: [...preferenceTags.slice(0, 3), ...activityStyles.slice(0, 2)].length
        ? `${[...preferenceTags.slice(0, 3), ...activityStyles.slice(0, 2)].join(", ")}에 관심이 있습니다.`
        : "",
      preferenceTags,
      activityStyles,
      interestProfile: {
        code: top.map((item) => item.key).join(""),
        scores,
        labels: top.map((item) => item.profile.label)
      },
      onboardingCompleted: answered === signupInterestQuestions.length
    }
  };
}

function setupAuthListeners() {
  const tabLogin = document.getElementById("tab-login");
  const tabSignup = document.getElementById("tab-signup");
  const btnAuthSubmit = document.getElementById("btn-auth-submit");
  const authForm = document.getElementById("auth-form");
  const authError = document.getElementById("auth-error");
  const btnAuthGuest = document.getElementById("btn-auth-guest");
  
  const btnCheckDuplicate = document.getElementById("btn-check-duplicate");
  const duplicateStatus = document.getElementById("duplicate-status");
  const confirmPasswordField = document.getElementById("confirm-password-field");
  const confirmPasswordInput = document.getElementById("auth-confirm-password");
  const usernameInput = document.getElementById("auth-username");
  const signupOnboarding = document.getElementById("signup-onboarding");
  const authCard = document.querySelector(".auth-card");
  
  let mode = "login";
  isUsernameChecked = false;
  checkedUsername = "";
  
  tabLogin?.addEventListener("click", () => {
    tabLogin.classList.add("is-active");
    tabSignup.classList.remove("is-active");
    btnAuthSubmit.textContent = "로그인";
    mode = "login";
    authCard?.classList.remove("signup-mode");
    if (authError) authError.style.display = "none";
    if (confirmPasswordField) confirmPasswordField.style.display = "none";
    if (confirmPasswordInput) confirmPasswordInput.removeAttribute("required");
    if (btnCheckDuplicate) btnCheckDuplicate.style.display = "none";
    if (duplicateStatus) duplicateStatus.style.display = "none";
    if (signupOnboarding) signupOnboarding.style.display = "none";
  });
  
  tabSignup?.addEventListener("click", () => {
    tabSignup.classList.add("is-active");
    tabLogin.classList.remove("is-active");
    btnAuthSubmit.textContent = "회원가입";
    mode = "signup";
    authCard?.classList.add("signup-mode");
    renderSignupInterestTest();
    setupSignupChipButtons();
    updateSignupInterestPreview();
    if (authError) authError.style.display = "none";
    if (confirmPasswordField) confirmPasswordField.style.display = "block";
    if (confirmPasswordInput) confirmPasswordInput.setAttribute("required", "true");
    if (btnCheckDuplicate) btnCheckDuplicate.style.display = "inline-block";
    if (signupOnboarding) signupOnboarding.style.display = "block";
    if (duplicateStatus) {
      duplicateStatus.style.display = "none";
      duplicateStatus.textContent = "";
    }
  });

  usernameInput?.addEventListener("input", () => {
    isUsernameChecked = false;
    checkedUsername = "";
    if (duplicateStatus) {
      duplicateStatus.style.display = "none";
    }
  });

  btnCheckDuplicate?.addEventListener("click", async () => {
    const username = usernameInput?.value.trim();
    if (!username) {
      showDuplicateStatus("아이디를 입력해주세요.", "error");
      return;
    }
    try {
      const response = await fetch("/api/check-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      });
      const data = await response.json();
      if (data.duplicated) {
        showDuplicateStatus("이미 사용 중인 아이디입니다.", "error");
        isUsernameChecked = false;
        checkedUsername = "";
      } else {
        showDuplicateStatus("사용 가능한 아이디입니다.", "success");
        isUsernameChecked = true;
        checkedUsername = username;
      }
    } catch (err) {
      showDuplicateStatus("오류가 발생했습니다.", "error");
      isUsernameChecked = false;
      checkedUsername = "";
    }
  });

  function showDuplicateStatus(msg, type) {
    if (!duplicateStatus) return;
    duplicateStatus.textContent = msg;
    duplicateStatus.style.display = "block";
    if (type === "success") {
      duplicateStatus.style.color = "#10b981";
    } else {
      duplicateStatus.style.color = "#ef4444";
    }
  }
  
  btnAuthGuest?.addEventListener("click", () => {
    const authScreen = document.getElementById("auth-screen");
    if (authScreen) authScreen.style.display = "none";
  });
  
  // Open login triggers
  document.querySelectorAll(".btn-login-open").forEach(btn => {
    btn.addEventListener("click", () => {
      const authScreen = document.getElementById("auth-screen");
      if (authScreen) authScreen.style.display = "flex";
    });
  });
  
  authForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (authError) authError.style.display = "none";
    
    const username = usernameInput?.value.trim();
    const password = document.getElementById("auth-password")?.value;
    const confirmPassword = confirmPasswordInput?.value;
    
    if (!username || !password) return;

    let signupProfile = null;
    if (mode === "signup") {
      if (!isUsernameChecked || username !== checkedUsername) {
        if (authError) {
          authError.textContent = "아이디 중복 확인이 필요합니다.";
          authError.style.display = "block";
        }
        return;
      }
      if (password !== confirmPassword) {
        if (authError) {
          authError.textContent = "비밀번호가 일치하지 않습니다.";
          authError.style.display = "block";
        }
        return;
      }
      signupProfile = collectSignupOnboarding(username);
      if (signupProfile.answered < signupInterestQuestions.length) {
        if (authError) {
          authError.textContent = `가입 진로 기초검사 ${signupInterestQuestions.length}문항을 모두 체크해 주세요.`;
          authError.style.display = "block";
        }
        return;
      }
      if (!signupProfile.studentState.grade) {
        if (authError) {
          authError.textContent = "학년을 선택해 주세요.";
          authError.style.display = "block";
        }
        return;
      }
      if (signupProfile.studentState.preferenceTags.length < 2) {
        if (authError) {
          authError.textContent = "세부 관심 분야를 2개 이상 선택해 주세요.";
          authError.style.display = "block";
        }
        return;
      }
    }
    
    const endpoint = mode === "login" ? "/api/login" : "/api/signup";
    
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, studentState: signupProfile?.studentState })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "통신 오류가 발생했습니다.");
      }
      
      localStorage.setItem("currentUser", data.username);
      sessionStorage.removeItem("guestMode");
      currentUser = data.username;
      
      const authScreen = document.getElementById("auth-screen");
      const appFrame = document.querySelector(".app-frame");
      if (authScreen) authScreen.style.display = "none";
      if (appFrame) appFrame.style.display = "flex";
      
      await loadStudentData();
      if (mode === "signup" && signupProfile?.studentState) {
        Object.assign(studentState, signupProfile.studentState);
        await saveStudentStateToServer();
      }
      setupLogoutListener();
      updateAuthUI(true);
      syncProfileInputsToUI();
      setView("home");
      showToast(`${currentUser}님, 반갑습니다!`);
    } catch (err) {
      if (authError) {
        authError.textContent = err.message;
        authError.style.display = "block";
      }
    }
  });
}

function setupLogoutListener() {
  const btnLogout = document.getElementById("btn-logout-desktop");
  btnLogout?.addEventListener("click", () => {
    localStorage.removeItem("currentUser");
    sessionStorage.removeItem("guestMode");
    currentUser = null;
    location.reload();
  });
}

function setupPasswordToggles() {
  const togglePw = document.getElementById("btn-toggle-pw");
  const pwInput = document.getElementById("auth-password");
  togglePw?.addEventListener("click", () => {
    const isHidden = pwInput?.type === "password";
    if (pwInput) pwInput.type = isHidden ? "text" : "password";
    if (togglePw) togglePw.textContent = isHidden ? "🙈" : "👁";
  });

  const toggleConfirmPw = document.getElementById("btn-toggle-confirm-pw");
  const confirmPwInput = document.getElementById("auth-confirm-password");
  toggleConfirmPw?.addEventListener("click", () => {
    const isHidden = confirmPwInput?.type === "password";
    if (confirmPwInput) confirmPwInput.type = isHidden ? "text" : "password";
    if (toggleConfirmPw) toggleConfirmPw.textContent = isHidden ? "🙈" : "👁";
  });
}


function updateAuthUI(isLoggedIn) {
  const btnLogin = document.getElementById("btn-login-desktop");
  const btnLogout = document.getElementById("btn-logout-desktop");
  const guestBanner = document.getElementById("guest-alert-banner");
  document.body.classList.toggle("is-guest", !isLoggedIn);
  document.querySelectorAll("[data-view]").forEach((button) => {
    const locked = protectedViews.has(button.dataset.view) && !isLoggedIn;
    button.classList.toggle("requires-login", locked);
    if (locked) {
      button.setAttribute("aria-label", `${labels[button.dataset.view] || "회원 기능"} - 로그인 필요`);
    } else {
      button.removeAttribute("aria-label");
    }
  });
  
  if (isLoggedIn) {
    if (btnLogin) btnLogin.style.display = "none";
    if (btnLogout) btnLogout.style.display = "inline-block";
    if (guestBanner) guestBanner.style.display = "none";
  } else {
    if (btnLogin) btnLogin.style.display = "inline-block";
    if (btnLogout) btnLogout.style.display = "none";
    if (guestBanner) guestBanner.style.display = "block";
  }
}

async function loadStudentData() {
  if (!currentUser) {
    // Guest mode is read-only. Personal records are available after login.
    ["guest_studentState", "guest_activities", "guest_todos", "guest_roadmap"].forEach((key) => {
      localStorage.removeItem(key);
    });
    const storedState = localStorage.getItem("guest_studentState");
    if (storedState) {
      Object.assign(studentState, JSON.parse(storedState));
    }
    syncProfileInputsToUI();
    
    const summaryList = document.querySelector(".summary-cards");
    const historyList = document.querySelector(".history-list");
    if (summaryList) summaryList.innerHTML = "";
    if (historyList) historyList.innerHTML = "";
    
    const storedActivities = localStorage.getItem("guest_activities");
    if (storedActivities) {
      const activities = JSON.parse(storedActivities);
      activitiesList = activities;
      activities.forEach(record => {
        prependSummary(record);
        prependHistory(record);
      });
      if (activities.length > 0) {
        syncSelectedActivity(activities[0]);
        updatePortfolioFromRecord(activities[0]);
      } else {
        renderEmptyHistory();
      }
    } else {
      activitiesList = [];
      renderEmptyHistory();
    }
    
    // Load todos
    const storedTodos = localStorage.getItem("guest_todos");
    const todoLists = document.querySelectorAll(".daily-todo");
    todoLists.forEach(todoList => {
      const labels = todoList.querySelectorAll("label");
      labels.forEach(l => l.remove());
      const totalCountNode = todoList.querySelector("strong");
      
      let todos = [
        { title: "활동 하나 기록하기", checked: false },
        { title: "관심 직업 1개 탐색", checked: false },
        { title: "포트폴리오 문장 다듬기", checked: false }
      ];
      if (storedTodos) {
        todos = JSON.parse(storedTodos);
      }
      
      todos.forEach(todoItem => {
        const label = document.createElement("label");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = todoItem.checked;
        label.appendChild(input);
        label.appendChild(document.createTextNode(" " + todoItem.title));
        
        input.onchange = async () => {
          if (!currentUser) {
            input.checked = !input.checked;
            requireAuth("할 일 저장");
            return;
          }

          const checked = input.checked;
          document.querySelectorAll(`.daily-todo label`).forEach(lbl => {
            if (lbl.textContent.trim() === todoItem.title) {
              const chk = lbl.querySelector("input");
              if (chk) chk.checked = checked;
            }
          });
          
          todoItem.checked = checked;
          const updatedTodos = Array.from(todoList.querySelectorAll("label")).map(lbl => {
            const chk = lbl.querySelector("input");
            return {
              title: lbl.textContent.trim(),
              checked: chk ? chk.checked : false
            };
          });
          await saveTodosToServer(updatedTodos);
          updateTodoCount();
        };
        
        if (totalCountNode) {
          todoList.insertBefore(label, totalCountNode);
        } else {
          todoList.appendChild(label);
        }
      });
    });
    updateTodoCount();
    
    // Load roadmap
    const storedRoadmap = localStorage.getItem("guest_roadmap");
    const resultPanel = document.querySelector(".roadmap-result-panel");
    const designerCard = document.querySelector(".roadmap-designer-card");
    if (storedRoadmap) {
      if (resultPanel) resultPanel.style.display = "block";
      if (designerCard) designerCard.style.display = "none";
      renderRoadmapData(JSON.parse(storedRoadmap));
    } else {
      if (resultPanel) resultPanel.style.display = "none";
      if (designerCard) designerCard.style.display = "block";
    }
    return;
  }

  try {
    const response = await fetch("/api/student", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Username": currentUser
      }
    });
    
    if (!response.ok) throw new Error("데이터 조회 실패");
    
    const data = await response.json();
    
    Object.assign(studentState, data.studentState);
    
    syncProfileInputsToUI();
    
    const summaryList = document.querySelector(".summary-cards");
    const historyList = document.querySelector(".history-list");
    if (summaryList) summaryList.innerHTML = "";
    if (historyList) historyList.innerHTML = "";
    
    if (data.activities && data.activities.length > 0) {
      activitiesList = data.activities;
      data.activities.forEach(record => {
        prependSummary(record);
        prependHistory(record);
      });
      syncSelectedActivity(data.activities[0]);
      updatePortfolioFromRecord(data.activities[0]);
    } else {
      activitiesList = [];
      renderEmptyHistory();
    }
    
    if (data.todos) {
      const todoLists = document.querySelectorAll(".daily-todo");
      todoLists.forEach(todoList => {
        const labels = todoList.querySelectorAll("label");
        labels.forEach(l => l.remove());
        
        const totalCountNode = todoList.querySelector("strong");
        
        data.todos.forEach(todoItem => {
          const label = document.createElement("label");
          const input = document.createElement("input");
          input.type = "checkbox";
          input.checked = todoItem.checked;
          label.appendChild(input);
          label.appendChild(document.createTextNode(" " + todoItem.title));
          
          input.onchange = async () => {
            const checked = input.checked;
            document.querySelectorAll(`.daily-todo label`).forEach(lbl => {
              if (lbl.textContent.trim() === todoItem.title) {
                const chk = lbl.querySelector("input");
                if (chk) chk.checked = checked;
              }
            });
            
            todoItem.checked = checked;
            const updatedTodos = Array.from(todoList.querySelectorAll("label")).map(lbl => {
              const chk = lbl.querySelector("input");
              return {
                title: lbl.textContent.trim(),
                checked: chk ? chk.checked : false
              };
            });
            await saveTodosToServer(updatedTodos);
            updateTodoCount();
          };
          
          if (totalCountNode) {
            todoList.insertBefore(label, totalCountNode);
          } else {
            todoList.appendChild(label);
          }
        });
      });
      
      updateTodoCount();
    }
    
    const dName = document.getElementById("profile-name");
    const dGrade = document.getElementById("profile-grade");
    const dJob = document.getElementById("profile-job");
    const dMajor = document.getElementById("profile-major");
    const dGpa = document.getElementById("profile-gpa");
    const dMock = document.getElementById("profile-mock");
    const dIntro = document.getElementById("profile-intro");
    if (dName) dName.value = studentState.name;
    if (dGrade) dGrade.value = studentState.grade;
    if (dJob) dJob.value = studentState.job;
    if (dMajor) dMajor.value = studentState.major;
    if (dGpa) dGpa.value = studentState.gpa;
    if (dMock) dMock.value = studentState.mock;
    if (dIntro) dIntro.value = studentState.intro;
    
    const resultPanel = document.querySelector(".roadmap-result-panel");
    const designerCard = document.querySelector(".roadmap-designer-card");
    if (data.roadmap) {
      if (resultPanel) resultPanel.style.display = "block";
      if (designerCard) designerCard.style.display = "none";
      renderRoadmapData(data.roadmap);
    } else {
      if (resultPanel) resultPanel.style.display = "none";
      if (designerCard) designerCard.style.display = "block";
    }
    
  } catch (err) {
    console.error("Error loading student data", err);
    showToast("데이터를 로딩하지 못했습니다.");
  }
}

async function saveStudentStateToServer() {
  if (!currentUser) {
    return requireAuth("학생 정보 저장");
  }
  try {
    await fetch("/api/student", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Username": currentUser
      },
      body: JSON.stringify({ studentState })
    });
    return true;
  } catch (err) {
    console.error("Error saving student state", err);
    return false;
  }
}

async function saveActivityToServer(record) {
  if (!currentUser) {
    return requireAuth("활동 기록 저장");
  }
  try {
    await fetch("/api/activity", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Username": currentUser
      },
      body: JSON.stringify({ activity: record })
    });
    return true;
  } catch (err) {
    console.error("Error saving activity", err);
    return false;
  }
}

async function saveTodosToServer(todos) {
  if (!currentUser) {
    return requireAuth("할 일 저장");
  }
  try {
    await fetch("/api/todo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Username": currentUser
      },
      body: JSON.stringify({ todos })
    });
    return true;
  } catch (err) {
    console.error("Error saving todos", err);
    return false;
  }
}

function updateTodoCount() {
  const todoLists = document.querySelectorAll(".daily-todo");
  todoLists.forEach(todoList => {
    const boxes = todoList.querySelectorAll("input[type='checkbox']");
    const count = todoList.querySelector("[data-daily-count]");
    const done = Array.from(boxes).filter((box) => box.checked).length;
    if (count) count.textContent = `${done}/${boxes.length} 완료`;
  });
}

async function serializeAndSaveTodos() {
  const todoList = document.querySelector(".daily-todo");
  if (!todoList) return;
  
  const labels = todoList.querySelectorAll("label");
  const todos = Array.from(labels).map(label => {
    const input = label.querySelector("input");
    const text = label.textContent.trim();
    return {
      title: text,
      checked: input ? input.checked : false
    };
  });
  
  await saveTodosToServer(todos);
}

async function saveRoadmapToServer(roadmapData) {
  if (!currentUser) {
    return requireAuth("로드맵 저장");
  }
  try {
    await fetch("/api/roadmap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Username": currentUser
      },
      body: JSON.stringify({ roadmap: roadmapData })
    });
    return true;
  } catch (err) {
    console.error("Error saving roadmap", err);
    return false;
  }
}

function renderRoadmapData(roadmapData) {
  const resStudentName = document.getElementById("res-student-name");
  const resHopeJob = document.getElementById("res-hope-job");
  const resHopeMajor = document.getElementById("res-hope-major");
  const resGpa = document.getElementById("res-gpa");
  const resMock = document.getElementById("res-mock");

  if (resStudentName) resStudentName.textContent = studentState.name || "학생";
  if (resHopeJob) resHopeJob.textContent = studentState.job || "미선택";
  if (resHopeMajor) resHopeMajor.textContent = studentState.major || "미선택";
  if (resGpa) resGpa.textContent = studentState.gpa.toFixed(1);
  if (resMock) resMock.textContent = studentState.mock;

  const activeCount = roadmapData.checkedActs.length;
  document.querySelectorAll(".active-count-placeholder").forEach(el => el.textContent = String(activeCount));

  const firstAct = roadmapData.checkedActs[0] || "선택한 활동 없음";
  document.querySelectorAll(".active-title-placeholder").forEach(el => el.textContent = firstAct);

  const fillEl = document.querySelector(".gpa-comparison-graph .graph-fill");
  const posEl = document.querySelector(".gpa-comparison-graph .my-pos");

  const percentage = Math.max(5, Math.min(95, ((9.0 - studentState.gpa) / 8.0) * 100));
  if (fillEl) fillEl.style.width = `${percentage}%`;
  if (posEl) {
    posEl.style.left = `${percentage}%`;
    posEl.textContent = `내 위치: ${studentState.gpa.toFixed(1)}등급`;
  }

  const levelEl = document.getElementById("res-q-level");
  if (levelEl) levelEl.textContent = roadmapData.qLevelText;
}

function setupMobileBottomNav() {
  const navItems = document.querySelectorAll(".mobile-bottom-nav .mobile-nav-item");
  navItems.forEach(item => {
    item.addEventListener("click", () => {
      navItems.forEach(nav => nav.classList.remove("is-active"));
      item.classList.add("is-active");
      
      const targetView = item.dataset.view;
      setView(targetView);
    });
  });
}
const buttons = document.querySelectorAll("[data-view]");
const panels = document.querySelectorAll("[data-panel]");
const crumb = document.querySelector("[data-crumb]");

let studentState = {
  name: "",
  grade: "",
  job: "",
  major: "",
  gpa: 0,
  mock: 0,
  interests: [],
  intro: "",
  preferenceTags: [],
  activityStyles: [],
  interestProfile: null,
  onboardingCompleted: false,
};


const labels = {
  home: "홈",
  record: "활동 기록",
  portfolio: "포트폴리오",
  explore: "진로 탐색",
  career: "진로 연결",
  zep: "ZEP 전시관",
  feedback: "선생님 피드백",
  profile: "학생 정보",
  notifications: "알림",
};

const protectedViews = new Set(["record", "portfolio", "profile", "feedback", "notifications"]);
let activeView = "home";

function cleanStudentDisplayName(name) {
  const value = String(name || "").trim();
  if (!value || /^ㅇ+$/i.test(value) || /^guest$/i.test(value) || /^[a-z]{1,3}$/i.test(value)) {
    return "";
  }
  return value;
}

function getStudentDisplayName(fallback = "학생") {
  return cleanStudentDisplayName(studentState.name) || fallback;
}

function getAvatarInitials() {
  if (!currentUser) return "비";
  const name = cleanStudentDisplayName(studentState.name);
  if (!name) return "학";
  const hangul = name.match(/[가-힣]/g);
  if (hangul?.length) return hangul.slice(0, 2).join("");
  return "학";
}

function openAuthScreen() {
  const authScreen = document.getElementById("auth-screen");
  if (authScreen) authScreen.style.display = "flex";
}

function requireAuth(actionName = "이 기능") {
  showToast(`${actionName}은 로그인 후 사용할 수 있어요.`);
  openAuthScreen();
  return false;
}

const interestProfiles = {
  "현실형(실행·기술)": {
    job: "전기공학 기술자",
    major: "전기전자공학과",
    schoolType: "마이스터고",
    school: "수도전기공업고등학교",
    reason: "도구, 기계, 전기, 제작처럼 손으로 확인하며 해결하는 활동과 잘 맞아요.",
    schoolReason: "전기·기계·자동화 분야 실습형 학교와 연결해 볼 수 있어요.",
    nextAction: "제작·정비·실험 활동 하나 기록하기",
    searchQuery: "전기공학 기술자"
  },
  "탐구형(분석·연구)": {
    job: "생명공학 연구원",
    major: "생명공학과",
    schoolType: "과학고",
    school: "한성과학고등학교",
    reason: "자료를 분석하고 원리를 파고드는 과학·수학·연구 활동과 잘 연결돼요.",
    schoolReason: "수학·과학 성취도와 탐구 보고서가 중요한 학교를 먼저 확인해요.",
    nextAction: "탐구 주제와 가설 한 가지 정리하기",
    searchQuery: "생명공학 연구원"
  },
  "예술형(창작·표현)": {
    job: "디지털 콘텐츠 제작자",
    major: "디지털콘텐츠과",
    schoolType: "특성화고",
    school: "한국애니메이션고등학교",
    reason: "글, 그림, 영상, 디자인처럼 생각을 창작물로 표현하는 활동과 잘 맞아요.",
    schoolReason: "작품 포트폴리오와 전공 적성을 보여줄 수 있는 학교가 어울려요.",
    nextAction: "작품 또는 콘텐츠 결과물 하나 등록하기",
    searchQuery: "디지털 콘텐츠 제작자"
  },
  "사회형(교육·돌봄)": {
    job: "상담심리사",
    major: "심리학과",
    schoolType: "일반고",
    school: "지역 일반고 진로중점 과정",
    reason: "사람을 돕고 설명하며 관계 안에서 문제를 해결하는 활동과 잘 연결돼요.",
    schoolReason: "교육·상담·복지 진로는 일반고 활동 기록과 봉사·멘토링 경험도 중요해요.",
    nextAction: "멘토링·봉사·상담 관련 활동 기록하기",
    searchQuery: "상담심리사"
  },
  "진취형(설득·경영)": {
    job: "마케터",
    major: "경영학과",
    schoolType: "특성화고",
    school: "서울금융고등학교",
    reason: "사람을 설득하고 팀을 이끌며 아이디어를 사업이나 프로젝트로 만드는 활동과 맞아요.",
    schoolReason: "경영·금융·창업 계열 활동을 보여주는 학교와 연결해 볼 수 있어요.",
    nextAction: "시장 조사 또는 발표 활동 기록하기",
    searchQuery: "마케터"
  },
  "관습형(자료·사무)": {
    job: "회계사",
    major: "회계학과",
    schoolType: "특성화고",
    school: "서울금융고등학교",
    reason: "자료를 정확하게 정리하고 규칙, 숫자, 절차에 맞춰 일하는 활동과 잘 맞아요.",
    schoolReason: "금융·회계·사무 계열 학교와 자격증·문서화 활동을 함께 준비해요.",
    nextAction: "예산표·통계표·자료정리 활동 남기기",
    searchQuery: "회계사"
  }
};

const legacyInterestMap = {
  "웹프로그래밍": "탐구형(분석·연구)",
  "앱 개발": "탐구형(분석·연구)",
  "인공지능": "탐구형(분석·연구)",
  "디자인": "예술형(창작·표현)",
  "e-비즈니스": "진취형(설득·경영)",
  "창업": "진취형(설득·경영)",
  "3D 모델링": "현실형(실행·기술)"
};

const iconByCategory = {
  독서: "book",
  프로젝트: "code",
  대회: "trophy",
  동아리: "people",
  진로체험: "briefcase",
  봉사활동: "heart",
  발표: "monitor",
  "기타 활동": "clipboard",
};

const toast = document.createElement("div");
toast.className = "toast-live";
toast.setAttribute("role", "status");
toast.setAttribute("aria-live", "polite");
document.body.appendChild(toast);

let toastTimer = null;
let attachedCount = 3;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2300);
}

function primaryInterest() {
  const first = studentState.interests?.[0];
  return interestProfiles[first] ? first : "";
}

const emptyInterestProfile = {
  job: "",
  major: "",
  schoolType: "",
  school: "",
  reason: "관심 분야를 선택하면 관련 직업이 표시됩니다.",
  schoolReason: "관심 분야를 선택하면 추천 학교 정보가 표시됩니다.",
  nextAction: "관심 분야를 먼저 선택해 주세요.",
  searchQuery: ""
};

function currentInterestProfile() {
  return interestProfiles[primaryInterest()] || emptyInterestProfile;
}

function refreshCareerSelectOptions() {
  const careerSelect = document.getElementById("record-career");
  if (!careerSelect) return;

  const selectedCareers = Array.from(new Set([studentState.job].filter(Boolean)));
  careerSelect.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = selectedCareers.length ? "관련 진로를 선택하세요" : "관심 분야 선택 후 표시됩니다";
  careerSelect.appendChild(placeholder);

  selectedCareers.forEach((career) => {
    const option = document.createElement("option");
    option.value = career;
    option.textContent = career;
    careerSelect.appendChild(option);
  });
}

function setTextById(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function syncInterestChipUI() {
  const selected = new Set(studentState.interests || []);

  document.querySelectorAll("[data-home-interest-chips] .flow-chip").forEach((chip) => {
    chip.classList.toggle("is-selected", selected.has(chip.dataset.interest));
  });

  document.querySelectorAll(".chip-field .chip").forEach((chip) => {
    chip.classList.toggle("selected", selected.has(chip.textContent.trim()));
  });

  document.querySelectorAll(".mobile-chips button").forEach((button) => {
    const label = button.textContent.replace("✓", "").trim();
    const isSelected = selected.has(label);
    button.classList.toggle("selected", isSelected);
    const check = button.querySelector("span");
    if (isSelected && !check) {
      const span = document.createElement("span");
      span.textContent = "✓";
      button.appendChild(span);
    }
    if (!isSelected && check) check.remove();
  });
}

function renderNotifications() {
  const profile = currentInterestProfile();
  const activeCount = document.querySelectorAll(".summary-cards li").length;
  const interestLabel = primaryInterest() || "관심 분야";
  const notifications = [
    {
      title: profile.job ? `${interestLabel} 관심 분야가 ${profile.job} 추천으로 연결됐어요` : "관심 분야를 선택하면 진로 추천이 시작됩니다",
      body: profile.major ? `${profile.major}, ${profile.school} 추천과 오늘 할 일까지 함께 갱신됐습니다.` : "학생 정보 화면에서 관심 분야와 희망 진로를 먼저 선택해 주세요.",
      action: "추천 흐름 보기",
      target: "home"
    },
    {
      title: profile.schoolType ? `고입 탐색기에서 ${profile.schoolType} 계열을 먼저 확인해 보세요` : "학생 정보가 입력되면 고입 추천이 표시됩니다",
      body: profile.schoolReason,
      action: "고입 추천 열기",
      target: "explore",
      tab: "highschool"
    },
    {
      title: `활동 기록 ${activeCount}개가 진로 연결에 반영 중이에요`,
      body: activeCount >= 3 ? "로드맵 생성에 필요한 활동 근거가 충분합니다." : "활동 기록을 더 남기면 정성 평가 추천이 좋아집니다.",
      action: activeCount >= 3 ? "로드맵 보기" : "활동 기록하기",
      target: activeCount >= 3 ? "explore" : "record",
      tab: activeCount >= 3 ? "integrated" : null
    }
  ];

  const list = document.getElementById("notification-list");
  const count = document.getElementById("notification-count");
  if (count) count.textContent = String(notifications.length);
  if (!list) return;

  list.innerHTML = "";
  notifications.forEach((item) => {
    const article = document.createElement("article");
    article.className = "notification-item";
    article.innerHTML = `
      <span class="notification-dot"></span>
      <div>
        <strong>${item.title}</strong>
        <p>${item.body}</p>
      </div>
      <button type="button">${item.action}</button>
    `;
    article.querySelector("button")?.addEventListener("click", () => {
      setView(item.target);
      if (item.tab) {
        window.setTimeout(() => document.querySelector(`[data-explore-tab="${item.tab}"]`)?.click(), 60);
      }
    });
    list.appendChild(article);
  });
}

function syncInterestFlow(options = {}) {
  const profile = currentInterestProfile();
  if (profile.job) studentState.job = profile.job;
  if (profile.major) studentState.major = profile.major;

  setTextById("flow-job", profile.job);
  setTextById("flow-job-reason", profile.reason);
  setTextById("flow-school", profile.school);
  setTextById("flow-school-reason", profile.schoolReason);
  setTextById("flow-major", profile.major);
  setTextById("flow-major-reason", profile.major ? `${profile.major} 탐색과 대입 추천에 자동 반영돼요.` : "희망 학과를 선택하면 대입 추천에 반영됩니다.");
  setTextById("flow-next-action", profile.nextAction);

  syncInterestChipUI();
  renderInterestMarks();
  updateDigitalCardAndDashboard();
  syncRoadmapInputs();
  renderNotifications();

  const careerSelect = document.getElementById("record-career");
  if (careerSelect) refreshCareerSelectOptions();

  const hsFilter = document.getElementById("hs-type-filter");
  if (hsFilter && profile.schoolType) hsFilter.value = profile.schoolType;
  window.jobbridgeRefreshExplore?.();

  if (options.addTodo) {
    if (profile.nextAction && profile.job) {
      addTodoItem(profile.nextAction, { silent: true, unique: true });
    }
  }

  if (options.persist) {
    saveStudentStateToServer();
  }
}

function setStudentInterests(interests, options = {}) {
  const normalized = Array.from(new Set(interests.map((interest) => legacyInterestMap[interest] || interest).filter(Boolean)));
  studentState.interests = normalized;
  syncInterestFlow(options);
  if (options.toast) {
    showToast(`${primaryInterest() || "관심 분야"} 기준으로 직업, 고입, 활동 추천을 다시 연결했어요.`);
  }
}

function todayText() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function setView(view) {
  if (protectedViews.has(view) && !currentUser) {
    requireAuth(labels[view] || "회원 기능");
    view = activeView || "home";
  }

  activeView = view;

  panels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === view);
  });

  buttons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });

  // Sync mobile bottom nav items
  const mobileNavItems = document.querySelectorAll(".mobile-bottom-nav .mobile-nav-item");
  mobileNavItems.forEach(item => {
    item.classList.toggle("is-active", item.dataset.view === view);
  });

  if (crumb) {
    crumb.textContent = labels[view] || "홈";
  }

  if (view === "notifications") {
    renderNotifications();
  }

  const surface = document.querySelector(".main-content-surface");
  if (surface) {
    surface.scrollIntoView({ block: "start", behavior: "smooth" });
  }
}

function selectedCategory() {
  const active = document.querySelector(".category-tabs .is-active");
  if (!active || active.textContent.trim() === "전체") {
    return "프로젝트";
  }
  return active.textContent.trim();
}

function createRoundIcon(category) {
  const span = document.createElement("span");
  span.className = `round-icon ${iconByCategory[category] || "code"}`;
  return span;
}

function syncSelectedActivity(record) {
  const activity = document.querySelector(".selected-activity");
  if (!activity) return;

  const title = activity.querySelector("h2");
  const markWrap = activity.querySelector("p");
  const description = activity.querySelectorAll("p")[1];
  const cards = document.querySelectorAll(".career-cards article");

  if (title) title.textContent = record.title;
  if (markWrap) {
    markWrap.innerHTML = "";
    [record.category, record.career, record.competencies || "성장 기록"].filter(Boolean).forEach((tag) => {
      const mark = document.createElement("mark");
      mark.textContent = tag;
      markWrap.appendChild(mark);
    });
  }
  if (description) {
    description.textContent = record.content || `${record.title} 활동을 기록하고 배운 점과 느낀 점을 정리했어요.`;
  }

  const abilityList = cards[0]?.querySelector("ul");
  const jobList = cards[1]?.querySelector("ul");
  const majorList = cards[2]?.querySelector("ul");

  if (abilityList) {
    const competencies = (record.competencies || "문제 해결, 협업, 자기주도성")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    abilityList.innerHTML = "";
    competencies.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      abilityList.appendChild(li);
    });
  }
  if (jobList) {
    jobList.innerHTML = record.career ? `<li>${record.career}</li>` : "<li>관련 진로를 선택하면 표시됩니다</li>";
  }
  if (majorList) {
    majorList.innerHTML = studentState.major ? `<li>${studentState.major}</li>` : "<li>희망 학과 선택 후 표시됩니다</li>";
  }
}

function renderEmptyHistory() {
  const list = document.querySelector(".history-list");
  if (!list) return;

  list.innerHTML = `
    <li class="history-empty">
      <div>
        <b>아직 기록이 없어요</b>
        <small>활동 기록에서 첫 기록을 남겨보세요.</small>
      </div>
    </li>
  `;
}

function prependHistory(record) {
  const list = document.querySelector(".history-list");
  if (!list) return;

  list.querySelector(".history-empty")?.remove();

  const li = document.createElement("li");
  li.appendChild(createRoundIcon(record.category));

  const body = document.createElement("div");
  const title = document.createElement("b");
  const small = document.createElement("small");
  title.textContent = record.title;
  small.textContent = record.date;
  body.append(title, small);

  const status = document.createElement("strong");
  status.textContent = "완료";
  li.append(body, status);
  list.prepend(li);
}

function prependSummary(record) {
  const list = document.querySelector(".summary-cards");
  if (!list) return;

  const li = document.createElement("li");
  li.appendChild(createRoundIcon(record.category));

  const body = document.createElement("div");
  const badge = document.createElement("em");
  const title = document.createElement("b");
  const small = document.createElement("small");
  badge.textContent = record.category;
  title.textContent = record.title;
  small.textContent = `${record.category} / ${record.career}`;
  body.append(badge, title, small);

  const time = document.createElement("time");
  time.textContent = record.date;
  li.append(body, time);
  list.prepend(li);
}

function updatePortfolioFromRecord(record) {
  const activityArticle = document.querySelector(".portfolio-list article:nth-child(3) p");
  const resultArticle = document.querySelector(".portfolio-list article:nth-child(4) p");
  const goalArticle = document.querySelector(".portfolio-list article:nth-child(5) p");

  if (activityArticle) {
    activityArticle.textContent = `${record.title}, ${record.category} 활동${record.role ? ` · 역할: ${record.role}` : ""}`;
  }
  if (resultArticle) {
    resultArticle.textContent = record.learned || record.solution || `${record.career}와 연결되는 결과물을 정리 중입니다.`;
  }
  if (goalArticle) {
    goalArticle.textContent = `${record.career} 분야에서 사용자에게 도움이 되는 결과를 만들고 싶습니다.`;
  }
}

function setupRecordForm() {
  const form = document.querySelector(".record-form");
  if (!form) return;

  // Set up career select options
  const careerSelect = document.getElementById("record-career");
  if (careerSelect) refreshCareerSelectOptions();

  // Set today as default date
  const dateInput = document.getElementById("record-date");
  if (dateInput && !dateInput.value) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  const saveButton = form.querySelector(".primary");
  const cancelButton = form.querySelector(".ghost");
  const addFileButton = form.querySelector(".add-file");
  const uploadBox = form.querySelector(".upload-box");

  saveButton?.addEventListener("click", async () => {
    const titleInput = document.getElementById("record-title");
    const dateInputEl = document.getElementById("record-date");
    const categorySelect = document.getElementById("record-category");
    const contentTA = document.getElementById("record-content");
    const roleInput = document.getElementById("record-role");
    const competencyInput = document.getElementById("record-competency");
    const learnedTA = document.getElementById("record-learned");
    const feelingTA = document.getElementById("record-feeling");
    const difficultyTA = document.getElementById("record-difficulty");
    const solutionTA = document.getElementById("record-solution");
    const careerSel = document.getElementById("record-career");
    const linkInput = document.getElementById("record-link");

    const title = titleInput?.value.trim();
    if (!title) {
      showToast("⚠️ 활동 제목을 입력해 주세요.");
      titleInput?.focus();
      return;
    }

    // Format date from YYYY-MM-DD to YYYY.MM.DD
    const rawDate = dateInputEl?.value || "";
    const date = rawDate ? rawDate.replace(/-/g, ".") : todayText();
    const category = categorySelect?.value || "프로젝트";
    const career = careerSel?.value || "";
    if (!career) {
      showToast("관련 진로를 먼저 선택해 주세요.");
      careerSel?.focus();
      return;
    }

    const record = {
      title,
      date,
      category,
      career,
      content: contentTA?.value.trim() || "",
      role: roleInput?.value.trim() || "",
      competencies: competencyInput?.value.trim() || "",
      learned: learnedTA?.value.trim() || "",
      feeling: feelingTA?.value.trim() || "",
      difficulty: difficultyTA?.value.trim() || "",
      solution: solutionTA?.value.trim() || "",
      link: linkInput?.value.trim() || "",
    };

    const saved = await saveActivityToServer(record);
    if (!saved) return;

    prependHistory(record);
    prependSummary(record);
    syncSelectedActivity(record);
    updatePortfolioFromRecord(record);

    const firstTodo = document.querySelector(".daily-todo input[type='checkbox']");
    if (firstTodo && !firstTodo.checked) {
      firstTodo.checked = true;
      firstTodo.dispatchEvent(new Event("change"));
    }
    activitiesList.unshift(record);

    // Reset form after save
    if (titleInput) titleInput.value = "";
    if (contentTA) contentTA.value = "";
    if (roleInput) roleInput.value = "";
    if (competencyInput) competencyInput.value = "";
    if (learnedTA) learnedTA.value = "";
    if (feelingTA) feelingTA.value = "";
    if (difficultyTA) difficultyTA.value = "";
    if (solutionTA) solutionTA.value = "";
    if (linkInput) linkInput.value = "";
    if (careerSel) careerSel.selectedIndex = 0;
    if (categorySelect) categorySelect.selectedIndex = 1;
    const todayD = new Date();
    if (dateInputEl) dateInputEl.value = `${todayD.getFullYear()}-${String(todayD.getMonth()+1).padStart(2,"0")}-${String(todayD.getDate()).padStart(2,"0")}`;

    showToast("✅ 활동 기록이 저장됐어요!");
  });

  cancelButton?.addEventListener("click", () => {
    form.reset();
    const todayD = new Date();
    const dateInputEl = document.getElementById("record-date");
    if (dateInputEl) dateInputEl.value = `${todayD.getFullYear()}-${String(todayD.getMonth()+1).padStart(2,"0")}-${String(todayD.getDate()).padStart(2,"0")}`;
    showToast("입력 내용을 비웠어요.");
  });

  addFileButton?.addEventListener("click", () => {
    attachedCount += 1;
    const thumb = document.createElement("span");
    thumb.className = attachedCount % 2 === 0 ? "file-thumb photo" : "file-thumb";
    addFileButton.before(thumb);
    if (uploadBox) uploadBox.textContent = `${attachedCount}개의 자료가 첨부됐어요`;
    showToast("첨부 자료 칸을 추가했어요.");
  });
}

function setupCategoryTabs() {
  document.querySelectorAll(".category-tabs button").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".category-tabs button").forEach((button) => {
        button.classList.toggle("is-active", button === tab);
      });
      const selectedCat = tab.textContent.trim();
      filterActivityList(selectedCat);
    });
  });
}

function filterActivityList(category) {
  const historyList = document.querySelector(".history-list");
  const summaryCards = document.querySelector(".summary-cards");
  if (!historyList) return;

  const filterFn = category === "전체" ? 
    () => true : 
    (record) => record.category === category;

  const toRender = activitiesList.filter(filterFn);
  historyList.innerHTML = "";
  if (summaryCards) summaryCards.innerHTML = "";

  toRender.forEach(record => {
    prependHistory(record);
    if (summaryCards) prependSummary(record);
  });

  if (toRender.length === 0) {
    historyList.innerHTML = `<li style="text-align:center;color:var(--muted);padding:24px;">해당 카테고리의 기록이 없어요.</li>`;
  }
}

function selectedInterests() {
  return Array.from(document.querySelectorAll(".profile-form-page .chip.selected")).map((chip) => chip.textContent.trim());
}

function renderInterestMarks() {
  const target = document.querySelector(".portfolio-list article:nth-child(2) p");
  if (!target) return;

  target.innerHTML = "";
  (studentState.interests || selectedInterests()).forEach((interest) => {
    const mark = document.createElement("mark");
    mark.textContent = interest;
    target.appendChild(mark);
  });
}

function updateDigitalCardAndDashboard() {
  const cardName = document.getElementById("card-name-txt");
  const cardGrade = document.getElementById("card-grade-txt");
  const cardJob = document.getElementById("card-job-txt");
  const cardMajor = document.getElementById("card-major-txt");
  const cardInterests = document.getElementById("card-interests-tags");
  
  const dashGpa = document.getElementById("dash-gpa-txt");
  const dashMock = document.getElementById("dash-mock-txt");
  const dashQ = document.getElementById("dash-q-txt");
  const dashTip = document.getElementById("dash-tip-txt");

  if (cardName) cardName.textContent = cleanStudentDisplayName(studentState.name) || "이름 미입력";
  if (cardGrade) cardGrade.textContent = studentState.grade || "학년 미입력";
  if (cardJob) cardJob.textContent = studentState.job || "희망 직업 미선택";
  if (cardMajor) cardMajor.textContent = studentState.major || "희망 학과 미선택";

  if (cardInterests) {
    cardInterests.innerHTML = "";
    const visibleTags = Array.from(new Set([
      ...(studentState.interests || []),
      ...(studentState.preferenceTags || [])
    ])).slice(0, 6);
    visibleTags.forEach(interest => {
      const mark = document.createElement("mark");
      mark.textContent = interest;
      cardInterests.appendChild(mark);
    });
  }

  if (dashGpa) dashGpa.textContent = studentState.gpa ? `${studentState.gpa.toFixed(1)}등급` : "미입력";
  if (dashMock) dashMock.textContent = studentState.mock ? `${studentState.mock}%` : "미입력";

  // Update initials on avatars
  const initials = getAvatarInitials();
  const headerNameText = currentUser ? `${getStudentDisplayName()} 님` : "비회원";
  const headerName = document.getElementById("header-user-name");
  if (headerName) headerName.textContent = headerNameText;
  
  const avatarMini = document.getElementById("avatar-initials-mini");
  const avatarPreview = document.getElementById("avatar-initials-preview");
  const avatarProfileBig = document.getElementById("avatar-initials-profile-big");
  const avatarCard = document.getElementById("avatar-initials-card");
  
  if (avatarMini) avatarMini.textContent = initials;
  if (avatarPreview) avatarPreview.textContent = initials;
  if (avatarProfileBig) avatarProfileBig.textContent = initials;
  if (avatarCard) avatarCard.textContent = initials;
  
  const activeCount = document.querySelectorAll(".summary-cards li").length;
  if (dashQ) dashQ.textContent = `${activeCount}개 활동 연동`;
  
  if (dashTip) {
    if (activeCount >= 3) {
      dashTip.textContent = `현재 연동된 활동(${activeCount}개)이 충분하여 학종 정성 경쟁력이 우수합니다. [진로 설계] 탭에서 종합 입시 로드맵을 가동해 보십시오.`;
    } else {
      dashTip.textContent = `학종 정성 평가 지수를 보완하려면 최소 3개 이상의 활동 연동이 권장됩니다. 현재 연동 활동은 ${activeCount}개입니다.`;
    }
  }
}

function syncProfileInputsToUI() {
  const dName = document.getElementById("profile-name");
  const dGrade = document.getElementById("profile-grade");
  const dJob = document.getElementById("profile-job");
  const dMajor = document.getElementById("profile-major");
  const dGpa = document.getElementById("profile-gpa");
  const dMock = document.getElementById("profile-mock");
  const dIntro = document.getElementById("profile-intro");

  if (dName) dName.value = studentState.name;
  if (dGrade) dGrade.value = studentState.grade;
  if (dJob) dJob.value = studentState.job;
  if (dMajor) dMajor.value = studentState.major;
  if (dGpa) dGpa.value = studentState.gpa || "";
  if (dMock) dMock.value = studentState.mock || "";
  if (dIntro) dIntro.value = studentState.intro;

  // Tablet
  const tName = document.getElementById("tablet-name");
  const tGrade = document.getElementById("tablet-grade");
  const tJob = document.getElementById("tablet-job");
  const tMajor = document.getElementById("tablet-major");
  const tGpa = document.getElementById("tablet-gpa");
  const tMock = document.getElementById("tablet-mock");

  if (tName) tName.value = studentState.name;
  if (tGrade) tGrade.value = studentState.grade;
  if (tJob) tJob.value = studentState.job;
  if (tMajor) tMajor.value = studentState.major;
  if (tGpa) tGpa.value = studentState.gpa || "";
  if (tMock) tMock.value = studentState.mock || "";

  // Mobile
  const mName = document.getElementById("mobile-name");
  const mGrade = document.getElementById("mobile-grade");
  const mJob = document.getElementById("mobile-job");
  const mMajor = document.getElementById("mobile-major");
  const mGpa = document.getElementById("mobile-gpa");
  const mMock = document.getElementById("mobile-mock");

  if (mName) mName.value = studentState.name;
  if (mGrade) mGrade.value = studentState.grade;
  if (mJob) mJob.value = studentState.job;
  if (mMajor) mMajor.value = studentState.major;
  if (mGpa) mGpa.value = studentState.gpa || "";
  if (mMock) mMock.value = studentState.mock || "";

  const profileName = document.getElementById("header-user-name");
  const previewName = document.querySelector(".preview-card h3");
  const previewGrade = document.getElementById("preview-grade");
  if (profileName) profileName.textContent = currentUser ? `${getStudentDisplayName()} 님` : "비회원";
  if (previewName) previewName.textContent = cleanStudentDisplayName(studentState.name) || "이름 미입력";
  if (previewGrade) previewGrade.textContent = studentState.grade || "학년 미입력";

  const goalArticle = document.querySelector(".portfolio-list article:nth-child(5) p");
  if (goalArticle) {
    goalArticle.textContent = studentState.job && studentState.major
      ? `${studentState.job} 분야에서 ${studentState.major} 진학을 통해 전문가로 성장하고 싶습니다.`
      : "희망 직업과 학과를 선택하면 진로 목표 문장이 표시됩니다.";
  }

  // Update digital ID card and dashboard
  refreshCareerSelectOptions();
  updateDigitalCardAndDashboard();
}

function setupProfileForm() {
  syncProfileInputsToUI();

  // 입력값 기반 디지털 진로 카드 피드백 제공
  const dName = document.getElementById("profile-name");
  const dGrade = document.getElementById("profile-grade");
  const dJob = document.getElementById("profile-job");
  const dMajor = document.getElementById("profile-major");
  const dGpa = document.getElementById("profile-gpa");
  const dMock = document.getElementById("profile-mock");
  const dIntro = document.getElementById("profile-intro");

  dName?.addEventListener("input", (e) => {
    studentState.name = e.target.value.trim();
    updateDigitalCardAndDashboard();
  });
  dGrade?.addEventListener("change", (e) => {
    studentState.grade = e.target.value;
    updateDigitalCardAndDashboard();
  });
  dJob?.addEventListener("input", (e) => {
    studentState.job = e.target.value.trim();
    refreshCareerSelectOptions();
    updateDigitalCardAndDashboard();
  });
  dMajor?.addEventListener("input", (e) => {
    studentState.major = e.target.value.trim();
    updateDigitalCardAndDashboard();
  });
  dGpa?.addEventListener("input", (e) => {
    studentState.gpa = parseFloat(e.target.value) || 0;
    updateDigitalCardAndDashboard();
  });
  dMock?.addEventListener("input", (e) => {
    studentState.mock = parseInt(e.target.value) || 0;
    updateDigitalCardAndDashboard();
  });
  dIntro?.addEventListener("input", (e) => {
    studentState.intro = e.target.value.trim();
  });

  document.querySelectorAll(".chip-field .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      chip.classList.toggle("selected");
      setStudentInterests(
        Array.from(document.querySelectorAll(".chip-field .chip.selected")).map(c => c.textContent.trim()),
        { persist: true, addTodo: true, toast: true }
      );
    });
  });

  document.querySelectorAll(".mobile-chips button").forEach((button) => {
    button.addEventListener("click", () => {
      button.classList.toggle("selected");
      const check = button.querySelector("span");
      if (button.classList.contains("selected") && !check) {
        const span = document.createElement("span");
        span.textContent = "✓";
        button.appendChild(span);
      }
      if (!button.classList.contains("selected") && check) {
        check.remove();
      }
      setStudentInterests(
        Array.from(document.querySelectorAll(".mobile-chips button.selected")).map(b => b.textContent.replace("✓", "").trim()),
        { persist: true, addTodo: true, toast: true }
      );
    });
  });

  document.querySelector(".student-form:not(.tablet-card) .primary")?.addEventListener("click", async () => {
    studentState.name = document.getElementById("profile-name")?.value.trim() || "";
    studentState.grade = document.getElementById("profile-grade")?.value || "";
    studentState.job = document.getElementById("profile-job")?.value.trim() || "";
    studentState.major = document.getElementById("profile-major")?.value.trim() || "";
    studentState.gpa = parseFloat(document.getElementById("profile-gpa")?.value) || 0;
    studentState.mock = parseInt(document.getElementById("profile-mock")?.value) || 0;
    studentState.intro = document.getElementById("profile-intro")?.value.trim() || "";

    const saveBtn = document.querySelector(".student-form:not(.tablet-card) .primary");
    if (saveBtn) { saveBtn.textContent = "저장 완료 ✓"; saveBtn.style.background = "#059669"; }
    setTimeout(() => {
      if (saveBtn) { saveBtn.textContent = "저장하기"; saveBtn.style.background = ""; }
    }, 2000);

    syncProfileInputsToUI();
    syncInterestFlow({ persist: true });
    await saveStudentStateToServer();
    showToast("✅ 학생 정보가 저장됐어요.");
  });

  document.querySelector(".student-form.tablet-card .primary")?.addEventListener("click", () => {
    studentState.name = document.getElementById("tablet-name")?.value.trim() || "";
    studentState.grade = document.getElementById("tablet-grade")?.value || "";
    studentState.job = document.getElementById("tablet-job")?.value || "";
    studentState.major = document.getElementById("tablet-major")?.value || "";
    studentState.gpa = parseFloat(document.getElementById("tablet-gpa")?.value) || 0;
    studentState.mock = parseInt(document.getElementById("tablet-mock")?.value) || 0;

    syncProfileInputsToUI();
    syncInterestFlow({ persist: true });
    showToast("학생 정보(태블릿)가 저장됐어요.");
  });

  document.querySelector(".mobile-cta button")?.addEventListener("click", () => {
    studentState.name = document.getElementById("mobile-name")?.value.trim() || "";
    studentState.grade = document.getElementById("mobile-grade")?.value || "";
    studentState.job = document.getElementById("mobile-job")?.value || "";
    studentState.major = document.getElementById("mobile-major")?.value || "";
    studentState.gpa = parseFloat(document.getElementById("mobile-gpa")?.value) || 0;
    studentState.mock = parseInt(document.getElementById("mobile-mock")?.value) || 0;

    syncProfileInputsToUI();
    syncInterestFlow({ persist: true });
    showToast("학생 정보(모바일)가 저장됐어요.");
  });
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage);
  } catch {
    showToast("복사 권한이 없어 화면에서 직접 주소를 복사해 주세요.");
  }
}

function setupActionButtons() {
  document.querySelectorAll("[data-view-jump]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.viewJump));
  });

  document.querySelector(".help-button")?.addEventListener("click", () => {
    setView("feedback");
    showToast("피드백 화면에서 도움말을 확인할 수 있어요.");
  });

  document.querySelector(".bell")?.addEventListener("click", () => {
    setView("notifications");
    showToast("알림 페이지에서 다음 행동을 확인해요.");
  });

  document.getElementById("btn-clear-notifications")?.addEventListener("click", () => {
    const list = document.getElementById("notification-list");
    const count = document.getElementById("notification-count");
    if (list) {
      list.innerHTML = `<article class="notification-item is-empty"><div><strong>새 알림이 없어요</strong><p>관심 분야를 바꾸거나 활동을 기록하면 다시 추천 알림이 생깁니다.</p></div></article>`;
    }
    if (count) count.textContent = "0";
  });

  document.querySelectorAll("[data-home-interest-chips] .flow-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const interest = chip.dataset.interest;
      const selected = new Set(studentState.interests || []);
      if (selected.has(interest) && selected.size > 1) {
        selected.delete(interest);
      } else {
        selected.add(interest);
      }
      setStudentInterests(Array.from(selected), { persist: true, addTodo: true, toast: true });
    });
  });

  document.querySelectorAll(".portfolio-list button").forEach((button, index) => {
    button.addEventListener("click", () => {
      setView(index < 2 ? "profile" : "record");
    });
  });

  document.querySelectorAll(".bottom-actions button").forEach((button) => {
    const label = button.textContent.trim();
    button.addEventListener("click", () => {
      if (label.includes("PDF")) {
        showToast("인쇄 창에서 PDF로 저장할 수 있어요.");
        window.setTimeout(() => window.print(), 200);
      } else if (label.includes("공유") || label.includes("복사")) {
        copyText(`${location.href.split("#")[0]}#portfolio`, "공유 링크를 복사했어요.");
      } else if (label.includes("ZEP") || label.includes("입장")) {
        setView("zep");
        showToast("ZEP 전시관 화면으로 이동했어요.");
      }
    });
  });

  document.querySelectorAll(".panel-head button").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.closest(".summary-panel")) {
        setView("record");
      } else {
        showToast("추천 활동 목록을 확인했어요.");
      }
    });
  });

  // 기존 explore-grid 리스너 제거됨

  // 홈 서비스 피첫마음 카드 관련 진로 탐색 탭 직접 연결
  document.querySelectorAll("[data-explore-goto]").forEach(card => {
    card.addEventListener("click", () => {
      const target = card.dataset.exploreGoto;
      setView("explore");
      setTimeout(() => {
        const tabBtn = document.querySelector(`[data-explore-tab="${target}"]`);
        if (tabBtn) tabBtn.click();
      }, 50);
    });
  });

  // ZEP 버튼 연결
  document.querySelectorAll(".bottom-actions button, .zep-grid ~ .bottom-actions button").forEach((button) => {
    const label = button.textContent.trim();
    if (label.includes("ZEP") || label.includes("입장")) {
      button.addEventListener("click", () => {
        document.getElementById("zep-enter-modal").style.display = "grid";
      });
    } else if (label.includes("콴테츠") || label.includes("링크 복사")) {
      button.addEventListener("click", () => {
        copyText(`${location.href.split("#")[0]}#zep`, "전시관 링크를 복사했어요.");
      });
    }
  });

  document.getElementById("btn-close-zep-modal")?.addEventListener("click", () => {
    document.getElementById("zep-enter-modal").style.display = "none";
  });

  // History list item click → career tab
  document.querySelector(".history-list")?.addEventListener("click", (e) => {
    const li = e.target.closest("li");
    if (!li) return;
    const title = li.querySelector("b")?.textContent;
    if (!title) return;
    const record = activitiesList.find(a => a.title === title);
    if (record) {
      syncSelectedActivity(record);
      setView("career");
    }
  });

  // Summary cards click → career tab
  document.querySelector(".summary-cards")?.addEventListener("click", (e) => {
    const li = e.target.closest("li");
    if (!li) return;
    const title = li.querySelector("b")?.textContent;
    if (!title) return;
    const record = activitiesList.find(a => a.title === title);
    if (record) {
      syncSelectedActivity(record);
      setView("career");
    }
  });

  // Sidebar todo add button
  const sidebarTodoInput = document.getElementById("sidebar-todo-input");
  const sidebarTodoAddBtn = document.getElementById("btn-sidebar-todo-add");
  const addSidebarTodo = () => {
    const title = sidebarTodoInput?.value.trim();
    if (!title) { showToast("할 일을 입력해 주세요!"); return; }
    addTodoItem(title);
    if (sidebarTodoInput) sidebarTodoInput.value = "";
  };
  sidebarTodoAddBtn?.addEventListener("click", addSidebarTodo);
  sidebarTodoInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); addSidebarTodo(); }
  });

  // Inquiry form submit
  document.getElementById("btn-inquiry-submit")?.addEventListener("click", () => {
    if (!currentUser) {
      requireAuth("피드백 반영 메모 저장");
      return;
    }

    const type = document.getElementById("inquiry-type")?.value || "진로 연결성";
    const title = document.getElementById("inquiry-title")?.value.trim();
    const content = document.getElementById("inquiry-content")?.value.trim();
    if (!title || !content) {
      showToast("피드백 태그와 반영 메모를 입력해 주세요.");
      return;
    }
    const cardTitle = document.getElementById("feedback-card-title");
    const cardDesc = document.getElementById("feedback-card-desc");
    if (cardTitle) cardTitle.textContent = `[${type}] ${title}`;
    if (cardDesc) cardDesc.textContent = content;
    
    const resultArea = document.getElementById("inquiry-result-area");
    if (resultArea) {
      resultArea.style.display = "block";
      resultArea.innerHTML = `<div style="padding:16px;border-radius:12px;background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;font-weight:700;">반영 메모가 저장되었습니다. 포트폴리오 보완 내역에 반영할 수 있어요.</div>`;
    }
    document.getElementById("inquiry-title").value = "";
    document.getElementById("inquiry-content").value = "";
    showToast("피드백 반영 메모가 저장됐어요.");
  });
}

// 6대 기존 시스템 시뮬레이터 모의 데이터
const systemSimData = {
  careernet: {
    title: "진로심리검사",
    disadvantage: "검사 결과가 '웹 개발자 적합'과 같이 일반적으로만 제시되어, 실제 학년별 생활기록부에 어떤 책을 적고 어떤 기획 프로젝트를 수행해야 하는지 구체적인 실행 계획(로드맵)으로 즉시 연결하기 어렵습니다.",
    html: `
      <div style="font-family:inherit;">
        <p><strong>진로심리검사 (흥미/적성) 시뮬레이션</strong></p>
        <p style="font-size:13px; color:#6b7b95;">자신의 주된 관심사 분야를 체크하고 검사를 제출해보세요.</p>
        <div style="display:grid; gap:8px; margin: 12px 0;">
          <label style="display:flex; align-items:center; gap:8px; font-size:14px;"><input type="checkbox" id="sim-cn-cb1" checked /> 컴퓨터 프로그래밍 및 알고리즘 설계</label>
          <label style="display:flex; align-items:center; gap:8px; font-size:14px;"><input type="checkbox" id="sim-cn-cb2" checked /> UI 디자인 및 웹 퍼블리싱</label>
          <label style="display:flex; align-items:center; gap:8px; font-size:14px;"><input type="checkbox" id="sim-cn-cb3" /> 문학 독서 및 소설 창작</label>
        </div>
        <div id="sim-careernet-result" style="display:none; padding:12px; background:#e8f4fd; border-radius:8px; margin-top:12px; font-size:13.5px;">
          <strong>🎯 검사 분석 결과:</strong><br>
          흥미 코드: <strong>IU (탐구형-예술형)</strong><br>
          추천 직업군: <strong>웹 개발자, 소프트웨어 엔지니어, UI/UX 디자이너</strong><br>
          추천 학과: <strong>컴퓨터공학과, 멀티미디어학과</strong>
        </div>
      </div>
    `,
    actionText: "심리검사 제출하기",
    action: function() {
      const res = document.getElementById("sim-careernet-result");
      if (res) {
        const cb1 = document.getElementById("sim-cn-cb1")?.checked;
        const cb2 = document.getElementById("sim-cn-cb2")?.checked;
        const cb3 = document.getElementById("sim-cn-cb3")?.checked;
        
        let typeCode = "일반형";
        let jobs = "다양한 분야 진출 가능";
        let majors = "인문/사회/이공학 계열";
        
        if (cb1 && cb2 && cb3) {
          typeCode = "IUA (탐구-예술-실제형)";
          jobs = "웹 퍼블리셔, 테크니컬 라이터, UI/UX 개발자";
          majors = "컴퓨터공학과, 문예창작과 융합";
        } else if (cb1 && cb2) {
          typeCode = "IU (탐구형-예술형)";
          jobs = "웹 개발자, 소프트웨어 엔지니어, UI/UX 디자이너";
          majors = "컴퓨터공학과, 소프트웨어학과, 디자인학과";
        } else if (cb1 && cb3) {
          typeCode = "IC (탐구형-관습형)";
          jobs = "데이터베이스 관리자, 시스템 보안 분석가";
          majors = "정보보안학과, 컴퓨터공학과";
        } else if (cb2 && cb3) {
          typeCode = "AR (예술형-실제형)";
          jobs = "웹 퍼블리셔, 디지털 아티스트, 콘텐츠 제작자";
          majors = "멀티미디어디자인학과, 미디어커뮤니케이션학과";
        } else if (cb1) {
          typeCode = "I (탐구형)";
          jobs = "시스템 아키텍트, 백엔드 엔지니어, 연구원";
          majors = "컴퓨터공학과, 수학과";
        } else if (cb2) {
          typeCode = "A (예술형)";
          jobs = "UI/UX 디자이너, 일러스트레이터";
          majors = "시각디자인학과, 산업디자인학과";
        } else if (cb3) {
          typeCode = "A (예술형)";
          jobs = "소설가, 출판 기획자, 번역가";
          majors = "국어국문학과, 영어영문학과";
        }
        
        res.innerHTML = `
          <strong>🎯 검사 분석 결과:</strong><br>
          흥미 코드: <strong>${typeCode}</strong><br>
          추천 직업군: <strong>${jobs}</strong><br>
          추천 학과: <strong>${majors}</strong>
        `;
        res.style.display = "block";
      }
    }
  },
  adiga: {
    title: "성적 분석 시뮬레이터",
    disadvantage: "성적 등급 등 단순한 '정량적 수치'만 분석할 뿐, 학생이 학교 홈페이지 제작 같은 주도적 프로젝트를 수행했는지 여부나 학생부 세특 기록의 깊이 같은 '정성적 요소'를 함께 보지 못해 진로 상담 자료로 쓰기 어렵습니다.",
    html: `
      <div style="font-family:inherit;">
        <p><strong>내신 성적 지원 참고 자료</strong></p>
        <p style="font-size:13px; color:#6b7b95;">평균 내신 등급을 입력하면 전형 검토용 참고 문구를 보여줍니다.</p>
        <div style="display:flex; gap:12px; align-items:center; margin: 12px 0;">
          <label style="font-size:14px;">평균 내신 등급: <input type="number" id="sim-gpa-val" value="2.3" step="0.1" style="width:70px; height:34px; padding:0 8px; border:1px solid #d4e0ef; border-radius:6px;" /></label>
        </div>
        <div id="sim-adiga-result" style="display:none; padding:12px; background:#e8f4fd; border-radius:8px; margin-top:12px; font-size:13.5px;">
          <strong>📊 정량 성적 분석 결과 (A대학 컴퓨터공학과):</strong><br>
          참고 등급: <strong>2.1등급</strong><br>
          내 성적: <strong>2.3등급</strong> (검토 상태: 전형 확인)<br>
          <span style="color:#d6336c; font-size:12px;">* 본 진단은 학생부 종합 전형의 정성적 비교과 활동(세특, 동아리 등) 내역을 반영하지 않습니다.</span>
        </div>
      </div>
    `,
    actionText: "지원 참고 문구 보기",
    action: function() {
      const res = document.getElementById("sim-adiga-result");
      const gpaInput = document.getElementById("sim-gpa-val");
      if (res && gpaInput) {
        const val = parseFloat(gpaInput.value) || 2.3;
        let prediction = "보완 권장";
        if (val <= 1.9) prediction = "준비 우수";
        else if (val <= 2.3) prediction = "전형 확인";
        else prediction = "상담 필요";
        
        res.innerHTML = `
          <strong>📊 정량 성적 분석 결과 (A대학 컴퓨터공학과):</strong><br>
          참고 등급: <strong>2.1등급</strong><br>
          내 성적: <strong>${val.toFixed(1)}등급</strong> (검토 상태: ${prediction})<br>
          <span style="color:#d6336c; font-size:12px;">* 본 진단은 학생부 종합 전형의 정성적 비교과 활동(세특, 동아리 등) 내역을 반영하지 않습니다.</span>
        `;
        res.style.display = "block";
      }
    }
  },
  kace: {
    title: "한국진로교육학회 학술DB 검색",
    disadvantage: "학술 및 연구 기반 정책 자료 중심이어서 일반 학생이 실생활에 적용할 수 있는 맞춤형 추천 기능이나 진로 로드맵을 자동으로 설계해주는 실용성이 전혀 제공되지 않습니다.",
    html: `
      <div style="font-family:inherit;">
        <p><strong>진로 교육 학술자료 연구검색</strong></p>
        <p style="font-size:13px; color:#6b7b95;">키워드를 검색하면 관련 연구 논문 정보를 조회합니다.</p>
        <div style="display:flex; gap:8px; margin: 12px 0;">
          <input type="text" id="sim-kace-query" value="자기효능감" style="flex:1; height:36px; padding:0 10px; border:1px solid #d4e0ef; border-radius:6px;" />
        </div>
        <div id="sim-kace-result" style="display:none; padding:12px; background:#e8f4fd; border-radius:8px; margin-top:12px; font-size:13.5px;">
          <strong>📄 검색된 논문 리스트:</strong><br>
          1. 중학생의 진로장벽이 진로결정자기효능감과 진로준비행동에 미치는 영향 (2023)<br>
          2. 학교 진로체험 프로그램 만족도가 진로성숙도에 미치는 종단적 연구 (2022)
        </div>
      </div>
    `,
    actionText: "논문 자료 검색",
    action: function() {
      const res = document.getElementById("sim-kace-result");
      const qInput = document.getElementById("sim-kace-query");
      if (res && qInput) {
        const query = qInput.value.trim() || "진로";
        res.innerHTML = `
          <strong>📄 [${query}] 검색된 학술자료:</strong><br>
          1. 고등학생의 <strong>${query}</strong> 장벽과 학업 자기효능감의 매개효과 분석 (2024)<br>
          2. 학교 <strong>${query}</strong>체험활동 및 고교학점제 과목선택 흥미도의 연계성 연구 (2023)<br>
          <span style="color:#d6336c; font-size:12px;">* 본 자료는 논문 참고용이며 학생 개별 로드맵 설계까지 자동 연결되지는 않습니다.</span>
        `;
        res.style.display = "block";
      }
    }
  },
  kkumgil: {
    title: "진로체험 프로그램 신청",
    disadvantage: "인기 있는 4차 산업 코딩 등의 체험은 조기 마감되거나 대도시 지역에만 체험처가 쏠려 있어 불평등이 발생하며, 일회성 체험 이후의 장기적인 진로 로드맵 연계나 피드백 장치가 현저히 부족합니다.",
    html: `
      <div style="font-family:inherit;">
        <p><strong>내 지역 진로체험 프로그램 찾기</strong></p>
        <p style="font-size:13px; color:#6b7b95;">지역을 선택하고 관심 체험 분야를 검색해보세요.</p>
        <div style="display:flex; gap:8px; margin:12px 0;">
          <select id="sim-kg-region" style="height:36px; padding:0 8px; border:1px solid #d4e0ef; border-radius:6px;">
            <option value="마포구">서울특별시 마포구</option>
            <option value="울릉군">경상북도 울릉군</option>
          </select>
          <input type="text" id="sim-kg-query" value="코딩 캠프" style="flex:1; height:36px; padding:0 10px; border:1px solid #d4e0ef; border-radius:6px;" />
        </div>
        <div id="sim-kkumgil-result" style="display:none; padding:12px; background:#e8f4fd; border-radius:8px; margin-top:12px; font-size:13.5px;">
          <strong>🚗 체험처 매핑 결과:</strong><br>
          - 마포구 청소년 IT 코딩 부트캠프 (정원 초과 / <strong>마감</strong>)<br>
          - 인공지능 로봇 조종 교실 (대기 접수 중)<br>
          - 3D 프린팅 시제품 제작 현장 (학교 단체 운영 방식 확인 필요)
        </div>
      </div>
    `,
    actionText: "체험 프로그램 조회",
    action: function() {
      const res = document.getElementById("sim-kkumgil-result");
      const regionSelect = document.getElementById("sim-kg-region");
      const searchInput = document.getElementById("sim-kg-query");
      if (res && regionSelect && searchInput) {
        const region = regionSelect.value;
        const query = searchInput.value.trim() || "코딩 캠프";
        if (region.includes("울릉군")) {
          res.innerHTML = `
            <strong>🚗 체험처 매핑 결과 (${region}):</strong><br>
            <span style="color:#d6336c; font-weight:bold;">[검색결과 없음] 울릉군 지역 내에는 "${query}" 관련 진로체험 프로그램 및 등록 체험처가 존재하지 않습니다.</span><br>
            <small style="color:var(--muted);">* 인근 지역 프로그램이나 온라인 영상 진로멘토링 일정을 확인해 보세요.</small>
          `;
        } else {
          res.innerHTML = `
            <strong>🚗 체험처 매핑 결과 (${region}):</strong><br>
            - 마포구 청소년 IT ${query} 캠프 (정원 초과 / <span style="color:#d6336c; font-weight:bold;">마감</span>)<br>
            - 인공지능 로봇 및 ${query} 교실 (대기 접수 중)<br>
            - 대학교 연계 IT ${query} 체험 프로그램 (30명 이상 단체 운영 방식 확인 필요)
          `;
        }
        res.style.display = "block";
      }
    }
  },
  worknet: {
    title: "직업 전망 참고 정보",
    disadvantage: "성인 및 실직자 취업 훈련 등에 특화되어 있어, 고교 학점제 과목 선택이나 생기부 연계 같은 중고등학생들의 실제 학교생활 및 입시 연동성이 결여되어 있습니다.",
    html: `
      <div style="font-family:inherit;">
        <p><strong>직업 통계 및 전망 조회</strong></p>
        <p style="font-size:13px; color:#6b7b95;">알고 싶은 직업의 고용 지표 및 임금을 검색합니다.</p>
        <div style="display:flex; gap:8px; margin: 12px 0;">
          <input type="text" id="sim-wn-query" value="웹 개발자" style="flex:1; height:36px; padding:0 10px; border:1px solid #d4e0ef; border-radius:6px;" />
        </div>
        <div id="sim-worknet-result" style="display:none; padding:12px; background:#e8f4fd; border-radius:8px; margin-top:12px; font-size:13.5px;">
          <strong>💼 직업 전망 참고 정보:</strong><br>
          - 평균 연봉: <strong>4,200만원</strong><br>
          - 일자리 전망: <strong>다소 증가</strong><br>
          - 현재 채용 중인 공고: <strong>1,482건</strong><br>
          <span style="color:#d6336c; font-size:12px;">* 본 정보는 중·고교 과목 선택 및 대입 지원 정보와 연동되지 않습니다.</span>
        </div>
      </div>
    `,
    actionText: "직업 통계 조회",
    action: function() {
      const res = document.getElementById("sim-worknet-result");
      const jobInput = document.getElementById("sim-wn-query");
      if (res && jobInput) {
        const job = jobInput.value.trim() || "웹 개발자";
        res.innerHTML = `
          <strong>💼 직업 전망 참고 정보 (${job}):</strong><br>
          - 중위 임금: <strong>연 4,200만원</strong><br>
          - 향후 10년간 일자리 전망: <strong>증가율 높음</strong><br>
          - 현재 기업 구인 공고수: <strong>1,482건 등록됨</strong><br>
          <span style="color:#d6336c; font-size:12px; font-weight:bold;">⚠️ 경고: 이 데이터는 고등학교 학생부 기재 요령이나 학종 전공적합성 세특 설계용 추천 가이드를 전혀 지원하지 않습니다.</span>
        `;
        res.style.display = "block";
      }
    }
  },
  alimi: {
    title: "대학 정보 조회",
    disadvantage: "취업률이나 등록금 등 통계 수치는 보여주지만, 내 역량과 흥미에 비추어 특정 대학 학과를 어떻게 준비할지에 대한 활동 피드백을 주지 못합니다.",
    html: `
      <div style="font-family:inherit;">
        <p><strong>대학 지표 비교</strong></p>
        <p style="font-size:13px; color:#6b7b95;">조회하고자 하는 대학 학과를 입력해보세요.</p>
        <div style="display:flex; gap:8px; margin: 12px 0;">
          <input type="text" id="sim-al-query" value="A대학교 컴퓨터공학과" style="flex:1; height:36px; padding:0 10px; border:1px solid #d4e0ef; border-radius:6px;" />
        </div>
        <div id="sim-alimi-result" style="display:none; padding:12px; background:#e8f4fd; border-radius:8px; margin-top:12px; font-size:13.5px;">
          <strong>📊 대학 정보:</strong><br>
          - 전공 취업률: <strong>78.4%</strong><br>
          - 학생 1인당 연간 장학금: <strong>3,420,000원</strong><br>
          - 신입생 충원율: <strong>100%</strong><br>
          - 등록금 현황: <strong>8,120,000원/연</strong>
        </div>
      </div>
    `,
    actionText: "대학 정보 조회",
    action: function() {
      const res = document.getElementById("sim-alimi-result");
      const univInput = document.getElementById("sim-al-query");
      if (res && univInput) {
        const univ = univInput.value.trim() || "A대학교 컴퓨터공학과";
        res.innerHTML = `
          <strong>📊 대학 정보 (${univ}):</strong><br>
          - 전공 취업률: <strong>78.4%</strong><br>
          - 1인당 연평균 장학금액: <strong>3,420,000원</strong><br>
          - 신입생 수시/정시 경쟁률: <strong>9.2 : 1</strong><br>
          - 연간 수업료 고액도: <strong>8,120,000원</strong><br>
          <span style="color:#d6336c; font-size:12.5px;">* 이 지표는 대학의 환경 통계일 뿐, 해당 대학 전공을 준비하기 위한 학생부 활동 조합 가이드는 없습니다.</span>
        `;
        res.style.display = "block";
      }
    }
  }
};

function updateLiveAiGuide() {
  const gpaInput = document.getElementById("rm-input-gpa");
  const mockInput = document.getElementById("rm-input-mock");
  const targetSelect = document.getElementById("rm-select-target");
  const checkedActs = Array.from(document.querySelectorAll("#rm-activity-selector input[type='checkbox']:checked")).map(cb => cb.dataset.actTitle);
  
  const gpaVal = parseFloat(gpaInput?.value) || 2.3;
  const mockVal = parseInt(mockInput?.value) || 88;
  const targetVal = targetSelect?.value || "종합";
  const activeCount = checkedActs.length;
  
  const aiGpaStat = document.getElementById("ai-gpa-stat");
  const aiMockStat = document.getElementById("ai-mock-stat");
  const aiActivityStat = document.getElementById("ai-activity-stat");
  const aiRatingStat = document.getElementById("ai-rating-stat");
  const aiAdvice = document.getElementById("ai-advice-paragraph");

  if (aiGpaStat) {
    if (gpaVal <= 2.1) {
      aiGpaStat.textContent = "최상위권 (준비 우수)";
      aiGpaStat.className = "match-good";
    } else if (gpaVal <= 2.5) {
      aiGpaStat.textContent = "보통 (전형 확인)";
      aiGpaStat.className = "";
    } else {
      aiGpaStat.textContent = "도전 필요 (보완 권장)";
      aiGpaStat.className = "match-warn";
    }
  }

  if (aiMockStat) {
    if (mockVal >= 90) {
      aiMockStat.textContent = `상위 ${100 - mockVal}% (인서울 주요대학)`;
    } else if (mockVal >= 80) {
      aiMockStat.textContent = `상위 ${100 - mockVal}% (수도권 대학 가능)`;
    } else {
      aiMockStat.textContent = `상위 ${100 - mockVal}% (학종 대비 필요)`;
    }
  }

  if (aiActivityStat) {
    aiActivityStat.textContent = `${activeCount}개 선택됨`;
  }

  let rating = "미흡 (C)";
  let advice = "비교과 활동이 선택되지 않았습니다. 종합전형을 준비하려면 아래 활동 목록에서 1개 이상의 전공 관련 활동을 체크하여 연동해 주세요.";

  if (targetVal === "종합") {
    if (activeCount >= 3) {
      rating = "최우수 (S)";
      advice = `학생부종합전형(학종)을 대비하기에 최상의 상태입니다. 선택한 ${activeCount}개의 주도적 활동(예: ${checkedActs[0] || '학교 홈페이지 제작'}) 덕분에 정성적 생기부 지수가 매우 견고합니다. 내신 등급(${gpaVal}등급)을 커버할 수 있는 세특 스토리가 돋보입니다.`;
    } else if (activeCount >= 2) {
      rating = "우수 (A)";
      advice = `학종 대비 활동이 ${activeCount}개로 준수합니다. 독서 기록이나 동아리 활동 1개를 추가 연동하면 전공 관심과 성장 과정 설명이 더 탄탄해집니다.`;
    } else if (activeCount >= 1) {
      rating = "보통 (B)";
      advice = `연동된 비교과 활동이 1개뿐이어서 대입 학종의 정성 평가 요소에서 경쟁력을 확보하기에 다소 부족합니다. 활동 기록 탭에서 전공 분야 활동 기록을 보강할 것을 권장합니다.`;
    } else {
      rating = "미흡 (C)";
      advice = `비교과 활동이 선택되지 않았습니다. 종합전형을 준비하려면 아래 활동 목록에서 1개 이상의 전공 관련 활동을 체크하여 연동해 주세요.`;
    }
  } else if (targetVal === "교과") {
    if (gpaVal <= 1.8) {
      rating = "최우수 (S)";
      advice = `학생부교과전형(내신 중심)을 준비하기에 유리한 내신 등급(${gpaVal}등급)입니다. 수능 최저학력기준, 반영 교과, 대학별 전형 변화를 함께 확인하세요.`;
    } else if (gpaVal <= 2.3) {
      rating = "우수 (A)";
      advice = `교과전형을 검토할 수 있는 내신 등급(${gpaVal}등급)입니다. 반영 교과와 학기별 성적 흐름을 확인하고, 학생부종합전형용 활동 기록도 함께 보완하세요.`;
    } else if (gpaVal <= 3.0) {
      rating = "보통 (B)";
      advice = `내신 ${gpaVal}등급은 교과전형 기준 수도권 및 지방 거점 국립대 적정선입니다. 주요 대학 진학을 위해서는 비교과 활동을 보완하여 '학생부종합전형'으로 선회하거나 정시 수능 전형 대비를 강화하는 것을 추천합니다.`;
    } else {
      rating = "미흡 (C)";
      advice = `내신 ${gpaVal}등급으로 학생부교과전형 지원은 불리한 편입니다. 학생부종합전형 지원을 위한 전공적합 세특 보완과 SW 진로 체험 참여가 필요합니다.`;
    }
  } else { // targetVal === "수능"
    if (mockVal >= 90) {
      rating = "최우수 (S)";
      advice = `모의고사 백분위 상위 ${100 - mockVal}% (${mockVal}%) 수준입니다. 정시 지원군을 넓게 비교하면서 취약 과목 보완과 실전 관리 계획을 세우는 것이 좋습니다.`;
    } else if (mockVal >= 80) {
      rating = "우수 (A)";
      advice = `모의고사 백분위 ${mockVal}%는 수도권 주요 대학 IT 학과 지원 가능선입니다. 취약 영역(수학 또는 과학탐구)의 4점 문항 2~3개를 극복하면 메이저 대학 지원군으로 도약할 수 있습니다.`;
    } else if (mockVal >= 60) {
      rating = "보통 (B)";
      advice = `백분위 ${mockVal}%는 정시 기준 적정 지원선 확보를 위해 수능 등급의 보강이 절실합니다. 정성적 강점을 살릴 수 있는 학생부종합전형(학종) 원서 접수를 3회 이상 병행하는 포트폴리오 믹스가 유리합니다.`;
    } else {
      rating = "미흡 (C)";
      advice = `모의고사 백분위 ${mockVal}%로 정시 IT 학과 진학은 어렵습니다. 교내 활동을 ZEP 전시관 포트폴리오로 조속히 연계하여 학생부 정성 종합전형으로 역전의 기회를 노려야 합니다.`;
    }
  }

  if (aiRatingStat) {
    aiRatingStat.textContent = rating;
  }
  if (aiAdvice) {
    aiAdvice.textContent = advice;
  }
}

function setupRoadmapDesigner() {
  const btnGenerate = document.querySelector(".btn-generate-roadmap");
  const designerCard = document.querySelector(".roadmap-designer-card");
  const loadingOverlay = document.querySelector(".roadmap-loading-overlay");
  const resultPanel = document.querySelector(".roadmap-result-panel");
  const progressFill = document.querySelector(".progress-fill");
  const loadingText = document.getElementById("loading-status-text");
  
  const rmGpaInput = document.getElementById("rm-input-gpa");
  const rmMockInput = document.getElementById("rm-input-mock");
  const rmSelectTarget = document.getElementById("rm-select-target");

  const syncRmInputs = () => {
    const gpaVal = parseFloat(rmGpaInput?.value) || 0;
    const mockVal = parseInt(rmMockInput?.value) || 0;
    
    studentState.gpa = gpaVal;
    studentState.mock = mockVal;
    
    // Sync back to Profile Inputs (Desktop)
    const dGpa = document.getElementById("profile-gpa");
    const dMock = document.getElementById("profile-mock");
    if (dGpa) dGpa.value = gpaVal;
    if (dMock) dMock.value = mockVal;

    // Sync to Tablet Profile Inputs
    const tGpa = document.getElementById("tablet-gpa");
    const tMock = document.getElementById("tablet-mock");
    if (tGpa) tGpa.value = gpaVal;
    if (tMock) tMock.value = mockVal;

    // Sync to Mobile Profile Inputs
    const mGpa = document.getElementById("mobile-gpa");
    const mMock = document.getElementById("mobile-mock");
    if (mGpa) mGpa.value = gpaVal;
    if (mMock) mMock.value = mockVal;

    updateDigitalCardAndDashboard();
    updateLiveAiGuide();
  };

  rmGpaInput?.addEventListener("input", syncRmInputs);
  rmMockInput?.addEventListener("input", syncRmInputs);
  rmSelectTarget?.addEventListener("change", syncRmInputs);

  btnGenerate?.addEventListener("click", () => {
    if (!currentUser) {
      requireAuth("로드맵 생성");
      return;
    }

    const gpaVal = parseFloat(rmGpaInput?.value) || 0;
    const mockVal = parseInt(rmMockInput?.value) || 0;
    
    studentState.gpa = gpaVal;
    studentState.mock = mockVal;
    
    const checkedActs = Array.from(document.querySelectorAll("#rm-activity-selector input[type='checkbox']:checked")).map(cb => cb.dataset.actTitle);
    
    if (designerCard) designerCard.style.display = "none";
    if (loadingOverlay) loadingOverlay.style.display = "flex";
    if (progressFill) progressFill.style.width = "0%";
    
    const steps = [
      { percentage: 20, text: "진로브릿지 분석 시작..." },
      { percentage: 40, text: "진로 흥미 데이터 결합 완료..." },
      { percentage: 65, text: "성적 정보와 활동 기록 비교 중..." },
      { percentage: 85, text: "관심 학과 정보 매핑 완료..." },
      { percentage: 100, text: "통합 진로 로드맵 설계 완료!" }
    ];
    
    let currentStep = 0;
    
    const interval = setInterval(async () => {
      if (currentStep < steps.length) {
        if (progressFill) progressFill.style.width = steps[currentStep].percentage + "%";
        if (loadingText) loadingText.textContent = steps[currentStep].text;
        currentStep++;
      } else {
        clearInterval(interval);
        
        if (loadingOverlay) loadingOverlay.style.display = "none";
        if (resultPanel) resultPanel.style.display = "block";
        
        const resStudentName = document.getElementById("res-student-name");
        const resHopeJob = document.getElementById("res-hope-job");
        const resHopeMajor = document.getElementById("res-hope-major");
        const resGpa = document.getElementById("res-gpa");
        const resMock = document.getElementById("res-mock");
 
        if (resStudentName) resStudentName.textContent = studentState.name || "학생";
        if (resHopeJob) resHopeJob.textContent = studentState.job || "미선택";
        if (resHopeMajor) resHopeMajor.textContent = studentState.major || "미선택";
        if (resGpa) resGpa.textContent = studentState.gpa.toFixed(1);
        if (resMock) resMock.textContent = studentState.mock;
        
        const activeCount = checkedActs.length;
        document.querySelectorAll(".active-count-placeholder").forEach(el => el.textContent = String(activeCount));
        
        const firstAct = checkedActs[0] || "선택한 활동 없음";
        document.querySelectorAll(".active-title-placeholder").forEach(el => el.textContent = firstAct);
        
        const fillEl = document.querySelector(".gpa-comparison-graph .graph-fill");
        const posEl = document.querySelector(".gpa-comparison-graph .my-pos");
        
        const percentage = Math.max(5, Math.min(95, ((9.0 - studentState.gpa) / 8.0) * 100));
        if (fillEl) fillEl.style.width = `${percentage}%`;
        if (posEl) {
          posEl.style.left = `${percentage}%`;
          posEl.textContent = `내 위치: ${studentState.gpa.toFixed(1)}등급`;
        }
        
        const levelEl = document.getElementById("res-q-level");
        let qLevelText = "보통 (B)";
        if (activeCount >= 3) {
          qLevelText = "최우수 (S)";
        } else if (activeCount >= 2) {
          qLevelText = "우수 (A)";
        } else if (activeCount >= 1) {
          qLevelText = "장려 (B+)";
        }
        if (levelEl) levelEl.textContent = qLevelText;
        
        const roadmapData = {
          checkedActs,
          qLevelText,
          gpa: studentState.gpa,
          mock: studentState.mock
        };
        const saved = await saveRoadmapToServer(roadmapData);
        showToast(saved ? "학생의 활동 및 성적 데이터를 통합 분석한 로드맵이 생성됐습니다." : "로그인하면 로드맵을 저장할 수 있어요.");
      }
    }, 400);
  });
  
  document.querySelector(".btn-print-roadmap")?.addEventListener("click", () => {
    showToast("인쇄 창에서 로드맵을 PDF로 저장할 수 있습니다.");
    window.setTimeout(() => window.print(), 200);
  });
  
  document.querySelector(".btn-pin-roadmap")?.addEventListener("click", () => {
    showToast("통합 로드맵을 학생 정보 상단에 고정했습니다.");
  });
  
  document.querySelectorAll(".btn-add-road-todo").forEach(btn => {
    btn.addEventListener("click", () => {
      const todoTitle = btn.dataset.todoTitle;
      addTodoItem(todoTitle);
      btn.disabled = true;
      btn.style.background = "#bcd6ff";
      btn.textContent = "추가됨";
    });
  });
}

function populateActivitySelector() {
  const container = document.getElementById("rm-activity-selector");
  if (!container) return;
  
  container.innerHTML = "";
  
  if (activitiesList.length === 0) {
    container.innerHTML = `<p class="empty-activities-text" style="color: var(--muted); font-size: 13.5px; padding: 10px 0;">아직 등록된 활동이 없습니다. [활동 기록] 탭에서 먼저 활동을 기록해 주세요.</p>`;
    updateLiveAiGuide();
    return;
  }
  
  activitiesList.forEach((record, index) => {
    const label = document.createElement("label");
    label.className = "activity-check-label";
    
    const isChecked = index < 3;
    
    label.innerHTML = `
      <input type="checkbox" data-act-title="${record.title}" data-act-type="${record.category}" data-act-career="${record.career}" ${isChecked ? "checked" : ""} />
      <div class="activity-check-text">
        <strong>${record.title}</strong>
        <span>${record.category} | ${record.career}</span>
      </div>
    `;
    
    label.querySelector("input").addEventListener("change", () => {
      updateLiveAiGuide();
    });
    
    container.appendChild(label);
  });
  
  updateLiveAiGuide();
}

function setupExplorePortal() {
  const tabs = document.querySelectorAll(".explore-tab-btn");
  const contents = document.querySelectorAll(".explore-tab-content");
  
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("is-active"));
      contents.forEach(c => c.classList.remove("is-active"));
      
      tab.classList.add("is-active");
      const targetContent = document.getElementById(`explore-tab-${tab.dataset.exploreTab}`);
      if (targetContent) targetContent.classList.add("is-active");
      
      if (tab.dataset.exploreTab === "integrated") {
        syncIntegratedInputs();
        populateActivitySelector();
      } else if (tab.dataset.exploreTab === "university") {
        syncUniversityTabGrades();
        matchUniversities();
      } else if (tab.dataset.exploreTab === "highschool") {
        matchHighSchools();
      }
    });
  });
  
  document.getElementById("btn-go-integrated")?.addEventListener("click", () => {
    const rmTab = document.querySelector('[data-explore-tab="integrated"]');
    if (rmTab) rmTab.click();
  });

  // --- 1. 커리어넷 API 검색기 ---
  const CAREERNET_API_KEY = "297e4105c3f5f0625592fc8369dc0332";
  const CAREERNET_OPEN_API = "https://www.career.go.kr/cnet/openapi/getOpenApi";
  const CAREERNET_JOB_API = "https://www.career.go.kr/cnet/front/openapi/jobs.json";
  const careerNetRegionCodes = {
    서울: "100260",
    부산: "100267",
    인천: "100269",
    대전: "100271",
    대구: "100272",
    울산: "100273",
    광주: "100275",
    경기: "100276",
    강원: "100278",
    충북: "100280",
    충남: "100281",
    전북: "100282",
    전남: "100283",
    경북: "100285",
    경남: "100291",
    제주: "100292"
  };
  const careerNetSch1Codes = {
    일반고: "100362",
    특성화고: "100363",
    과학고: "100364",
    외고: "100364",
    국제고: "100364",
    마이스터고: "100364",
    영재학교: "100364",
    예술고: "100364",
    체육고: "100364",
    자사고: "100365"
  };
  const careerNetJobCategoryCodes = {
    IT: "1",
    보건: "3",
    교육: "2",
    사회: "2",
    경영: "0",
    공학: "1",
    문화: "4",
    서비스: "5",
    농생명: "9"
  };
  const careerNetMajorSubjectCodes = {
    IT: "100394",
    보건: "100396",
    교육: "100393",
    사회: "100392",
    경영: "100392",
    공학: "100394",
    문화: "100397",
    서비스: "100392",
    농생명: "100395"
  };
  const careerNetSchoolCache = new Map();
  const careerNetDictionaryCache = new Map();

  function stripApiText(value = "") {
    return String(value || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function toArray(value) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") return [value];
    return [];
  }

  function getCareerNetContent(data) {
    return toArray(data?.dataSearch?.content);
  }

  function safeExternalUrl(value = "") {
    const raw = String(value || "").trim();
    if (!raw || raw === "null") return "";
    try {
      const url = new URL(raw, "https://www.career.go.kr");
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function normalizeRegionName(region = "") {
    const value = String(region || "");
    if (value.includes("서울")) return "서울";
    if (value.includes("부산")) return "부산";
    if (value.includes("인천")) return "인천";
    if (value.includes("대전")) return "대전";
    if (value.includes("대구")) return "대구";
    if (value.includes("울산")) return "울산";
    if (value.includes("광주")) return "광주";
    if (value.includes("경기")) return "경기";
    if (value.includes("강원")) return "강원";
    if (value.includes("충북") || value.includes("충청북")) return "충북";
    if (value.includes("충남") || value.includes("충청남")) return "충남";
    if (value.includes("전북")) return "전북";
    if (value.includes("전남") || value.includes("전라남")) return "전남";
    if (value.includes("경북") || value.includes("경상북")) return "경북";
    if (value.includes("경남") || value.includes("경상남")) return "경남";
    if (value.includes("제주")) return "제주";
    return value || "지역 미상";
  }

  function inferHighSchoolType(school = {}) {
    const text = [school.schoolName, school.schoolType, school.schoolGubun].join(" ");
    if (/영재/.test(text)) return "영재학교";
    if (/과학고|과학/.test(text)) return "과학고";
    if (/외국어|외고/.test(text)) return "외고";
    if (/국제/.test(text)) return "국제고";
    if (/마이스터/.test(text)) return "마이스터고";
    if (/예술|공연|디자인/.test(text)) return "예술고";
    if (/체육/.test(text)) return "체육고";
    if (/자율|자사/.test(text)) return "자사고";
    if (/특성화|직업|공업|상업|정보|디지털|인터넷|금융|관광|조리|농업|해사/.test(text)) return "특성화고";
    return "일반고";
  }

  function inferHighSchoolTracks(name = "", type = "") {
    const tracks = new Set();
    const text = `${name} ${type}`;
    if (/소프트웨어|디지털|인터넷|정보|컴퓨터|게임|IT/i.test(text)) tracks.add("IT");
    if (/과학|영재/.test(text)) tracks.add("과학");
    if (/외국어|외고|국제/.test(text)) tracks.add("외국어");
    if (/금융|상업|경영|비즈니스/.test(text)) tracks.add("상경");
    if (/디자인|애니|미디어|콘텐츠|영상|만화|예술|공연/.test(text)) tracks.add("디자인");
    if (/로봇|자동화/.test(text)) tracks.add("로봇");
    if (/전기|전자|에너지/.test(text)) tracks.add("전기전자");
    if (/반도체/.test(text)) tracks.add("반도체");
    if (/자동차/.test(text)) tracks.add("자동차");
    if (/기계|공업/.test(text)) tracks.add("기계");
    if (/항공/.test(text)) tracks.add("항공");
    if (/해사|해양/.test(text)) tracks.add("해양");
    if (/조리|식품|외식/.test(text)) tracks.add("조리");
    if (/의료|보건|바이오/.test(text)) tracks.add("보건");
    if (/농업|농생명|생명과학/.test(text)) tracks.add("농생명");
    if (/체육/.test(text)) tracks.add("체육");
    if (!tracks.size && type === "일반고") tracks.add("일반");
    return Array.from(tracks);
  }

  function mapCareerNetSchool(item) {
    const type = inferHighSchoolType(item);
    const name = item.schoolName || "학교명 미상";
    const rawRegion = item.region || "";
    const rawType = item.schoolType || item.schoolGubun || "고등학교";
    const address = stripApiText(item.adres || item.address || "");
    const campus = stripApiText(item.campusName || "");
    return {
      name,
      region: normalizeRegionName(rawRegion),
      rawRegion,
      type,
      tracks: inferHighSchoolTracks(name, type),
      estType: stripApiText(item.estType || ""),
      schoolType: stripApiText(rawType),
      schoolGubun: stripApiText(item.schoolGubun || ""),
      address,
      campus,
      desc: [rawRegion, item.estType, rawType].filter(Boolean).join(" · "),
      link: safeExternalUrl(item.link)
    };
  }

  async function fetchCareerNetSchools({ gubun, rawKeyword, region, filterType, perPage = 500, maxPages = 30 }) {
    const cacheKey = JSON.stringify({ gubun, rawKeyword, region, filterType, perPage, maxPages });
    if (careerNetSchoolCache.has(cacheKey)) return careerNetSchoolCache.get(cacheKey);

    const baseParams = {
      apiKey: CAREERNET_API_KEY,
      svcType: "api",
      svcCode: "SCHOOL",
      contentType: "json",
      gubun,
      perPage: String(perPage)
    };
    if (rawKeyword) baseParams.searchSchulNm = rawKeyword;
    if (region !== "all" && careerNetRegionCodes[region] && region !== "수도권" && region !== "지방거점") {
      baseParams.region = careerNetRegionCodes[region];
    }
    if (filterType !== "all" && careerNetSch1Codes[filterType]) baseParams.sch1 = careerNetSch1Codes[filterType];

    const schools = [];
    let totalCount = 0;
    for (let page = 1; page <= maxPages; page++) {
      const params = new URLSearchParams({ ...baseParams, thisPage: String(page) });
      const response = await fetch(`${CAREERNET_OPEN_API}?${params.toString()}`);
      if (!response.ok) throw new Error("커리어넷 학교정보 API 응답 실패");
      const data = await response.json();
      const list = getCareerNetContent(data);
      if (!list.length) break;
      totalCount = Number(list[0]?.totalCount || data?.dataSearch?.totalCount || totalCount || list.length);
      schools.push(...list.map(mapCareerNetSchool));
      if (schools.length >= totalCount) break;
    }

    const result = { schools, totalCount: totalCount || schools.length };
    careerNetSchoolCache.set(cacheKey, result);
    return result;
  }

  function regionMatchesSchool(school, region) {
    if (region === "all") return true;
    const regionText = normalizeCareerText(`${school.region} ${school.rawRegion}`);
    if (region === "수도권") return ["경기", "인천"].some((item) => regionText.includes(normalizeCareerText(item)));
    if (region === "지방거점") return !["서울", "경기", "인천"].some((item) => regionText.includes(normalizeCareerText(item)));
    return regionText.includes(normalizeCareerText(region));
  }

  function schoolMatchesType(school, filterType) {
    if (filterType === "all") return true;
    const haystack = normalizeCareerText([school.name, school.type, school.schoolType, school.schoolGubun].join(" "));
    return school.type === filterType || haystack.includes(normalizeCareerText(filterType));
  }

  function renderApiLoading(target, text) {
    target.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 42px 20px; color: var(--muted);">
        <div class="spinner" style="margin: 0 auto 16px;"></div>${escapeHtml(text)}
      </div>
    `;
  }

  const hsSearchInput = document.getElementById("hs-search-input");
  const hsRegionFilter = document.getElementById("hs-region-filter");
  const hsFilter = document.getElementById("hs-type-filter");
  const hsTrackFilter = document.getElementById("hs-track-filter");
  const hsStatus = document.getElementById("hs-result-status");

  let hsSearchRequestId = 0;
  let hsSearchTimer = null;

  const matchHighSchools = async () => {
    const requestId = ++hsSearchRequestId;
    const rawKeyword = (hsSearchInput?.value || "").trim();
    const keyword = normalizeCareerText(rawKeyword);
    const region = hsRegionFilter ? hsRegionFilter.value : "all";
    const filterType = hsFilter ? hsFilter.value : "all";
    const track = hsTrackFilter ? hsTrackFilter.value : "all";

    const listEl = document.getElementById("highschool-list");
    if (!listEl) return;

    if (hsStatus) {
      hsStatus.textContent = "커리어넷 학교정보 API에서 고등학교 정보를 불러오는 중입니다.";
    }
    renderApiLoading(listEl, "커리어넷 고등학교 정보를 불러오는 중...");

    try {
      const { schools, totalCount } = await fetchCareerNetSchools({
        gubun: "high_list",
        rawKeyword,
        region,
        filterType
      });
      if (requestId !== hsSearchRequestId) return;

      const profile = currentInterestProfile();
      const filtered = schools.filter((school) => {
      const haystack = normalizeCareerText([
        school.name,
        school.region,
        school.rawRegion,
        school.type,
        school.tracks.join(" "),
        school.desc,
        school.schoolType,
        school.schoolGubun,
        school.address
      ].join(" "));
      if (keyword && !haystack.includes(keyword)) return false;
      if (!regionMatchesSchool(school, region)) return false;
      if (!schoolMatchesType(school, filterType)) return false;
      if (track !== "all" && !school.tracks.includes(track)) return false;
      return true;
    }).sort((a, b) => {
      const profileText = normalizeCareerText([profile.job, profile.major, profile.schoolType, profile.school, profile.searchQuery].join(" "));
      const aInterest = (a.type === profile.schoolType || a.tracks.some((item) => profileText.includes(normalizeCareerText(item)))) ? 1 : 0;
      const bInterest = (b.type === profile.schoolType || b.tracks.some((item) => profileText.includes(normalizeCareerText(item)))) ? 1 : 0;
      return bInterest - aInterest || a.region.localeCompare(b.region, "ko") || a.name.localeCompare(b.name, "ko");
    });

    if (hsStatus) {
        const renderedCount = Math.min(filtered.length, 120);
        hsStatus.textContent = `커리어넷 학교정보 API 기준 ${totalCount.toLocaleString("ko-KR")}곳 중 조건에 맞는 ${filtered.length.toLocaleString("ko-KR")}곳을 찾았습니다. 화면에는 ${renderedCount.toLocaleString("ko-KR")}곳까지 표시됩니다.`;
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <article class="hs-school-card hs-school-card-manual" style="grid-column: 1 / -1;">
          <h4>검색 결과가 없습니다</h4>
          <p class="hs-desc">커리어넷 학교정보 API에서 현재 조건과 일치하는 고등학교를 찾지 못했습니다. 학교명 일부, 지역, 유형, 계열 필터를 조정해 주세요.</p>
        </article>
      `;
      return;
    }

      listEl.innerHTML = "";
      filtered.slice(0, 120).forEach((school) => {
      const isInterest = school.tracks.some((item) => (studentState.interests || []).join(" ").includes(item));
      const card = document.createElement("article");
      card.className = "hs-school-card";
      card.innerHTML = `
        <div class="hs-card-top">
          <div class="hs-tag-row">
            <span class="hs-tag ${school.type}">${school.type}</span>
            <span class="hs-tag neutral">${school.region}</span>
            ${school.tracks.map((item) => `<span class="hs-tag track">${item}</span>`).join("")}
          </div>
          <span class="match-pill info">입시 정보</span>
        </div>
        <h4>${escapeHtml(school.name)}${isInterest ? " <small>관심 분야 추천</small>" : ""}</h4>
        <p class="hs-desc">${escapeHtml(school.desc || "커리어넷 학교정보 API에서 제공한 학교 정보입니다.")}</p>
        <dl class="hs-detail-list">
          <div><dt>학교 종류</dt><dd>${escapeHtml(school.schoolGubun || school.schoolType || school.type)}</dd></div>
          <div><dt>주소</dt><dd>${escapeHtml(school.address || "주소 정보 없음")}</dd></div>
          <div><dt>설립</dt><dd>${escapeHtml(school.estType || "설립 정보 없음")}${school.campus ? ` · ${escapeHtml(school.campus)}` : ""}</dd></div>
        </dl>
        ${school.link ? `<a class="hs-link" href="${school.link}" target="_blank" rel="noopener">학교 홈페이지 열기</a>` : `<div class="hs-spec">커리어넷에 학교 홈페이지 링크가 등록되어 있지 않습니다.</div>`}
      `;
      listEl.appendChild(card);
    });
    } catch (error) {
      console.error(error);
      if (requestId !== hsSearchRequestId) return;
      if (hsStatus) {
        hsStatus.textContent = "커리어넷 학교정보 API 연결에 실패했습니다.";
      }
      listEl.innerHTML = `
        <article class="hs-school-card" style="grid-column: 1 / -1;">
          <h4>API 연결 필요</h4>
          <p class="hs-desc">고등학교 목록은 내장 데이터 없이 커리어넷 학교정보 API에서만 불러옵니다. 네트워크 또는 브라우저 보안 정책 때문에 요청이 막히면 결과를 표시하지 않습니다.</p>
        </article>
      `;
    }
  };

  const scheduleHighSchoolSearch = () => {
    window.clearTimeout(hsSearchTimer);
    hsSearchTimer = window.setTimeout(matchHighSchools, 300);
  };

  hsSearchInput?.addEventListener("input", scheduleHighSchoolSearch);
  hsRegionFilter?.addEventListener("change", matchHighSchools);
  hsFilter?.addEventListener("change", matchHighSchools);
  hsTrackFilter?.addEventListener("change", matchHighSchools);

  // --- 2. 대학교 API 검색기 ---
  const univRegionFilter = document.getElementById("univ-region-filter");
  const univSubjectFilter = document.getElementById("univ-subject-filter");
  const univSearchInput = document.getElementById("univ-search-input");
  const univStatus = document.getElementById("univ-result-status");
  let univSearchRequestId = 0;

  const syncUniversityTabGrades = () => {};

  const matchUniversities = async () => {
    const requestId = ++univSearchRequestId;
    const rawKeyword = (univSearchInput?.value || "").trim();
    const region = univRegionFilter ? univRegionFilter.value : "all";
    const subject = univSubjectFilter ? univSubjectFilter.value : "all";
    const tbody = document.getElementById("univ-matching-tbody");
    if (!tbody) return;

    if (univStatus) {
      univStatus.textContent = "커리어넷 학교정보 API에서 대학교 정보를 불러오는 중입니다.";
    }
    tbody.innerHTML = `<tr><td colspan="6" style="padding: 28px; text-align: center; color: var(--muted);">대학교 정보를 불러오는 중입니다.</td></tr>`;

    try {
      const { schools, totalCount } = await fetchCareerNetSchools({
        gubun: "univ_list",
        rawKeyword,
        region,
        filterType: "all",
        perPage: 200,
        maxPages: 12
      });
      if (requestId !== univSearchRequestId) return;

      const filtered = schools.filter((school) => regionMatchesSchool(school, region));

    if (filtered.length === 0) {
        if (univStatus) {
          univStatus.textContent = "커리어넷 학교정보 API에서 현재 조건과 일치하는 대학교를 찾지 못했습니다.";
        }
        tbody.innerHTML = `<tr><td colspan="6" style="padding: 24px; text-align: center; color: var(--muted);">검색 결과가 없습니다. 대학명 일부나 지역 조건을 바꿔 보세요.</td></tr>`;
      return;
    }

      if (univStatus) {
        const subjectNote = subject === "all" ? "" : " 선택한 학과 계열은 아래 직업·학과 검색 탭에서 세부 학과 API로 다시 확인하세요.";
        univStatus.textContent = `커리어넷 학교정보 API 기준 ${totalCount.toLocaleString("ko-KR")}곳 중 ${filtered.length.toLocaleString("ko-KR")}곳을 찾았습니다. 화면에는 100곳까지 표시됩니다.${subjectNote}`;
      }

      tbody.innerHTML = "";
      filtered.slice(0, 100).forEach((univ) => {
      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid var(--soft-line)";
      tr.innerHTML = `
        <td style="padding: 14px 16px; font-weight: 800; color: var(--ink);">${escapeHtml(univ.name)}</td>
        <td style="padding: 14px 16px; color: var(--text);">${escapeHtml(univ.rawRegion || univ.region)}</td>
        <td style="padding: 14px 16px; color: var(--text);">${escapeHtml(univ.schoolGubun || univ.schoolType || "대학교")}</td>
        <td style="padding: 14px 16px; color: var(--text);">${escapeHtml(univ.estType || "정보 없음")}</td>
        <td style="padding: 14px 16px; color: var(--muted); font-size: 13px;">${escapeHtml(univ.address || univ.campus || "주소 정보 없음")}</td>
        <td style="padding: 14px 16px;">${univ.link ? `<a class="hs-link table-link" href="${univ.link}" target="_blank" rel="noopener">홈페이지</a>` : `<span style="color: var(--muted); font-size: 12px;">링크 없음</span>`}</td>
      `;
      tbody.appendChild(tr);
    });
    } catch (error) {
      console.error(error);
      if (requestId !== univSearchRequestId) return;
      if (univStatus) {
        univStatus.textContent = "커리어넷 학교정보 API 연결에 실패했습니다.";
      }
      tbody.innerHTML = `<tr><td colspan="6" style="padding: 24px; text-align: center; color: var(--muted);">대학교 정보는 내장 데이터 없이 커리어넷 API에서만 불러옵니다. 네트워크 요청을 확인해 주세요.</td></tr>`;
    }
  };

  window.jobbridgeRefreshExplore = () => {
    matchHighSchools();
    syncUniversityTabGrades();
    matchUniversities();
  };

  univRegionFilter?.addEventListener("change", matchUniversities);
  univSubjectFilter?.addEventListener("change", matchUniversities);
  univSearchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") matchUniversities();
  });
  univSearchInput?.addEventListener("input", () => {
    window.clearTimeout(univSearchInput._jobbridgeTimer);
    univSearchInput._jobbridgeTimer = window.setTimeout(matchUniversities, 350);
  });

  // --- 3. 진로 흥미 정밀 검사 ---
  const riasecProfiles = {
    R: {
      label: "현실형(실행·기술)",
      icon: "🛠",
      desc: "분명하고 실제적인 활동, 도구·기계·제작·정비처럼 손으로 확인하며 해결하는 일에 흥미가 큽니다.",
      jobs: ["전기공학 기술자", "자동차 정비원", "소방관", "항공정비사"],
      majors: ["전기전자공학과", "기계공학과", "항공정비학과", "토목공학과"],
      programs: [
        { title: "전기 회로와 안전 실습", provider: "지역 공업교육센터", location: "전국", date: "상시", detail: "기초 회로, 안전 수칙, 전기 직무를 체험합니다." },
        { title: "자동차 구조 분해 관찰", provider: "자동차 진로체험관", location: "부산/경기", date: "방학", detail: "엔진, 제동장치, 전장 부품의 역할을 관찰합니다." }
      ]
    },
    I: {
      label: "탐구형(분석·연구)",
      icon: "🔬",
      desc: "지적 호기심이 강하고 자료를 분석하며 과학·수학·실험·연구 문제를 깊게 생각하는 활동에 어울립니다.",
      jobs: ["생명공학 연구원", "인공지능 전문가", "화학공학 연구원", "환경공학 기술자"],
      majors: ["생명공학과", "인공지능학과", "화학공학과", "환경공학과"],
      programs: [
        { title: "생명과학 실험 설계 워크숍", provider: "과학문화센터", location: "온라인/충북", date: "분기별", detail: "가설, 변인 통제, 실험 보고서 작성을 연습합니다." },
        { title: "환경 데이터 분석 프로젝트", provider: "환경교육센터", location: "교내/지역", date: "상시", detail: "수질·대기 데이터를 해석하고 개선 방안을 제안합니다." }
      ]
    },
    A: {
      label: "예술형(창작·표현)",
      icon: "🎨",
      desc: "상상력과 표현력이 풍부하며 글, 그림, 영상, 음악, 공연, 디자인으로 생각을 자유롭게 드러내는 활동에 맞습니다.",
      jobs: ["디지털 콘텐츠 제작자", "UX/UI 디자이너", "작가", "공연예술가"],
      majors: ["디자인학과", "디지털콘텐츠과", "문예창작학과", "미디어커뮤니케이션학과"],
      programs: [
        { title: "영상 편집과 스토리보드 제작", provider: "미디어센터", location: "지역별", date: "주말", detail: "기획, 촬영, 편집, 저작권 기초를 배웁니다." },
        { title: "브랜드 포스터 디자인 실습", provider: "디자인교육센터", location: "서울/경기", date: "방학", detail: "콘셉트, 색상, 타이포그래피를 결과물로 연결합니다." }
      ]
    },
    S: {
      label: "사회형(교육·돌봄)",
      icon: "🤝",
      desc: "사람을 돕고 설명하며 협력하는 활동에 흥미가 높고, 교육·상담·보건·복지 분야와 연결됩니다.",
      jobs: ["교사", "상담심리사", "간호사", "사회복지사"],
      majors: ["교육학과", "심리학과", "간호학과", "사회복지학과"],
      programs: [
        { title: "또래 멘토링 수업 설계", provider: "학교 진로부", location: "교내", date: "학기 중", detail: "학습 자료를 만들고 설명 방식에 대한 피드백을 받습니다." },
        { title: "응급처치와 보건 캠페인", provider: "청소년 보건교육센터", location: "전국", date: "방학", detail: "건강, 안전, 돌봄 직업군을 함께 탐색합니다." }
      ]
    },
    E: {
      label: "진취형(설득·경영)",
      icon: "📈",
      desc: "리더 역할, 설득, 발표, 사업 기획, 조직 운영처럼 사람에게 영향을 주고 목표를 달성하는 활동에 흥미가 큽니다.",
      jobs: ["마케터", "상품기획자", "서비스 기획자", "호텔리어"],
      majors: ["경영학과", "e-비즈니스과", "호텔관광학과", "미디어커뮤니케이션학과"],
      programs: [
        { title: "청소년 창업 아이디어 피칭", provider: "창업교육센터", location: "온라인/수도권", date: "월 1회", detail: "문제 발견, 고객 분석, 발표 자료를 만듭니다." },
        { title: "관광 서비스 기획 실습", provider: "관광진로센터", location: "서울/부산", date: "예약제", detail: "고객 경험과 서비스 흐름을 설계합니다." }
      ]
    },
    C: {
      label: "관습형(자료·사무)",
      icon: "📋",
      desc: "정해진 원칙을 따르고 자료, 숫자, 기록, 문서를 정확하게 정리하는 활동에 강점이 있습니다.",
      jobs: ["회계사", "은행원", "공무원", "행정사무원"],
      majors: ["회계학과", "경제학과", "행정학과", "경영학과"],
      programs: [
        { title: "모의 회계 장부와 예산표 만들기", provider: "금융교육기관", location: "전국", date: "상시", detail: "수입·지출, 예산, 회계 문서 기초를 익힙니다." },
        { title: "모의 은행 업무와 금융 기초", provider: "청소년 금융교실", location: "온라인/전국", date: "월 1회", detail: "저축, 대출, 금융 윤리, 사무 절차를 배웁니다." }
      ]
    }
  };

  const likertOptions = [
    { label: "전혀 그렇지 않다", value: 1 },
    { label: "그렇지 않다", value: 2 },
    { label: "보통이다", value: 3 },
    { label: "그렇다", value: 4 },
    { label: "매우 그렇다", value: 5 }
  ];

  const cnQuestions = [
    { type: "R", q: "도구나 장비를 직접 다루는 활동이 흥미롭다." },
    { type: "I", q: "왜 그런 결과가 나왔는지 원리와 근거를 끝까지 확인하고 싶다." },
    { type: "A", q: "글, 그림, 영상, 음악 등으로 내 생각을 표현하는 일이 좋다." },
    { type: "S", q: "친구가 어려워하는 내용을 이해할 때까지 설명해 주는 편이다." },
    { type: "E", q: "사람들 앞에서 아이디어를 제안하고 설득하는 일이 어렵지 않다." },
    { type: "C", q: "자료, 일정, 숫자, 규칙을 정확하게 정리하는 일이 편하다." },
    { type: "R", q: "기계, 전기, 자동차, 로봇, 조리처럼 손으로 익히는 실습이 잘 맞는다." },
    { type: "I", q: "실험, 관찰, 조사, 데이터 분석처럼 증거를 모으는 과정이 재미있다." },
    { type: "A", q: "정답이 하나로 정해진 과제보다 새롭게 구성하는 과제가 더 끌린다." },
    { type: "S", q: "상담, 교육, 보건, 복지처럼 사람을 돕는 분야에 관심이 있다." },
    { type: "E", q: "팀 활동에서 방향을 정하고 역할을 나누는 일을 자주 맡는다." },
    { type: "C", q: "보고서 형식, 표, 체크리스트, 절차가 정리되어 있으면 일이 잘 풀린다." },
    { type: "R", q: "컴퓨터 화면보다 실제 장치나 재료를 만지며 배우는 활동도 좋아한다." },
    { type: "I", q: "과학, 수학, 사회 현상을 깊게 파고드는 탐구 보고서를 써보고 싶다." },
    { type: "A", q: "디자인, 콘텐츠, 공연, 글쓰기처럼 분위기와 메시지를 만드는 일에 끌린다." },
    { type: "S", q: "다른 사람의 감정과 상황을 살피고 맞춰 주는 편이다." },
    { type: "E", q: "창업, 홍보, 마케팅, 캠페인처럼 사람들의 선택을 움직이는 일이 흥미롭다." },
    { type: "C", q: "회계, 행정, 금융, 기록 관리처럼 정확성이 중요한 일을 해보고 싶다." },
    { type: "R", q: "고장 난 물건을 살펴보거나 구조를 알아내는 활동에 호기심이 생긴다." },
    { type: "I", q: "가설을 세우고 결과가 맞는지 검증하는 과정이 즐겁다." },
    { type: "A", q: "같은 자료라도 보기 좋고 인상적으로 전달하는 방법을 고민한다." },
    { type: "S", q: "모둠 안에서 갈등이 생기면 중간에서 조율하려고 한다." },
    { type: "E", q: "목표를 세우고 사람들을 모아 실행까지 밀고 가는 편이다." },
    { type: "C", q: "작업을 시작하기 전에 기준, 순서, 필요한 자료를 먼저 정리한다." },
    { type: "R", q: "현장 체험, 실습실, 공방, 작업장 같은 공간에서 배우는 것이 좋다." },
    { type: "I", q: "새로운 지식을 배우면 관련 자료를 더 찾아보는 편이다." },
    { type: "A", q: "나만의 스타일이나 관점을 결과물에 담고 싶다." },
    { type: "S", q: "누군가의 성장이나 회복을 돕는 일을 하면 보람을 느낀다." },
    { type: "E", q: "발표, 토론, 면접처럼 말로 의견을 전달하는 활동에 자신이 있다." },
    { type: "C", q: "실수 없이 확인하고 마감에 맞춰 완성하는 일을 중요하게 생각한다." },
    { type: "R", q: "에너지, 건설, 항공, 제조, 조리, 스포츠처럼 실제 기능을 쓰는 분야가 궁금하다." },
    { type: "I", q: "생명, 환경, 인공지능, 우주, 신소재처럼 연구 주제가 넓은 분야에 끌린다." },
    { type: "A", q: "사람들이 보고 듣고 느끼는 경험을 설계하는 일이 흥미롭다." },
    { type: "S", q: "교육 봉사, 멘토링, 캠페인처럼 사람과 직접 만나는 활동을 해보고 싶다." },
    { type: "E", q: "새로운 서비스나 상품을 기획해 실제로 운영해 보고 싶다." },
    { type: "C", q: "문서, 기록, 통계, 예산처럼 체계적으로 관리하는 분야가 잘 맞을 것 같다." }
  ];

  let currentQ = 0;
  let qScores = Object.fromEntries(Object.keys(riasecProfiles).map((key) => [key, 0]));
  let qCounts = Object.fromEntries(Object.keys(riasecProfiles).map((key) => [key, 0]));
  let qResponses = [];

  const btnStartTest = document.getElementById("btn-start-test");
  const btnRestartTest = document.getElementById("btn-restart-test");
  const introBox = document.getElementById("test-intro-box");
  const questionBox = document.getElementById("test-question-box");
  const resultBox = document.getElementById("test-result-box");
  const qCurrentNum = document.getElementById("q-current-num");
  const qTotalNum = document.getElementById("q-total-num");
  const qText = document.getElementById("q-text");

  const renderQuestion = () => {
    if (!qCurrentNum || !qText) return;
    
    qCurrentNum.textContent = currentQ + 1;
    if (qTotalNum) qTotalNum.textContent = cnQuestions.length;
    const question = cnQuestions[currentQ];
    qText.textContent = question.q;

    const answersList = document.querySelector(".test-answers-list");
    if (!answersList) return;

    answersList.innerHTML = "";
    likertOptions.forEach((option) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "answer-btn scale-answer";
      btn.innerHTML = `<span>${option.value}</span><strong>${option.label}</strong>`;
      btn.onclick = () => {
        qScores[question.type] += option.value;
        qCounts[question.type]++;
        qResponses.push({ type: question.type, value: option.value });
        currentQ++;
        if (currentQ < cnQuestions.length) {
          renderQuestion();
        } else {
          showTestResult();
        }
      };
      answersList.appendChild(btn);
    });
  };

  const getSortedInterestScores = () => Object.keys(riasecProfiles)
    .map((key) => ({
      key,
      score: qScores[key],
      count: qCounts[key] || 1,
      max: (qCounts[key] || 1) * 5,
      profile: riasecProfiles[key]
    }))
    .map((item) => ({ ...item, percent: Math.round((item.score / item.max) * 100) }))
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));

  const renderTestScoreSummary = (sortedScores) => {
    const summary = document.getElementById("test-score-summary");
    if (!summary) return;

    const topThree = sortedScores.slice(0, 3);
    const uniqueAnswers = new Set(qResponses.map((item) => item.value)).size;
    const clarityGap = (topThree[0]?.score || 0) - (topThree[2]?.score || 0);
    const clarityText = uniqueAnswers <= 1
      ? "응답이 한쪽으로 치우쳐 재검사 권장"
      : clarityGap >= 8
        ? "유형이 뚜렷함"
        : clarityGap >= 4
          ? "주요 유형이 어느 정도 구분됨"
          : "복합 흥미형";

    summary.innerHTML = `
      <div class="test-code-card">
        <span>상위 흥미 코드</span>
        <strong>${topThree.map((item) => item.key).join("-")}</strong>
        <p>${topThree.map((item) => item.profile.label).join(" · ")}</p>
        <em>${clarityText}</em>
      </div>
      <div class="test-score-bars">
        ${sortedScores.map((item) => `
          <div class="test-score-row">
            <div><strong>${item.profile.icon} ${item.profile.label}</strong><span>${item.score}/${item.max}점</span></div>
            <i><b style="width:${item.percent}%"></b></i>
          </div>
        `).join("")}
      </div>
      <p class="test-score-note">이 결과는 진로 상담과 포트폴리오 설계를 돕기 위한 참고용입니다. 실제 진로 결정은 활동 기록, 성적, 상담 피드백과 함께 보세요.</p>
    `;
  };

  const showTestResult = () => {
    if (questionBox) questionBox.style.display = "none";
    if (resultBox) resultBox.style.display = "block";

    const badge = document.getElementById("test-result-badge");
    const desc = document.getElementById("test-result-desc");
    if (!badge || !desc) return;

    const sortedScores = getSortedInterestScores();
    const resultKey = sortedScores[0]?.key || "I";
    const result = riasecProfiles[resultKey];
    const topProfiles = sortedScores.slice(0, 3).map((item) => item.profile);
    const recommendedPrograms = topProfiles.flatMap((profile) => profile.programs).slice(0, 6);
    const topJobs = Array.from(new Set(topProfiles.flatMap((profile) => profile.jobs))).slice(0, 8);
    const topMajors = Array.from(new Set(topProfiles.flatMap((profile) => profile.majors))).slice(0, 8);

    badge.textContent = `${result.icon} ${result.label}`;
    desc.textContent = `${result.desc} 상위 조합 기준 추천 직업은 ${topJobs.join(", ")}이고, 관련 학과는 ${topMajors.join(", ")}입니다.`;
    renderTestScoreSummary(sortedScores);
    setStudentInterests(topProfiles.map((profile) => profile.label), { persist: Boolean(currentUser), addTodo: true });

    const progListEl = document.getElementById("experience-program-list");
    if (!progListEl) return;

    progListEl.innerHTML = "";
    recommendedPrograms.forEach(prog => {
      const card = document.createElement("div");
      card.className = "cn-result-card";
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <span class="cn-badge">체험 연계</span>
          <span style="font-size: 11.5px; background: #eff6ff; color: #1d4ed8; padding: 2px 6px; border-radius: 4px; font-weight: 800;">체험 예시</span>
        </div>
        <h4 style="margin: 6px 0 0; font-size: 15.5px; color: var(--ink); font-weight: 800;">${prog.title}</h4>
        <p style="font-size: 13px; color: var(--text); margin-top: 8px; margin-bottom: 8px; text-align: left;">${prog.detail}</p>
        <div class="cn-meta" style="font-size: 12px; color: var(--muted); border-top: 1px solid var(--soft-line); padding-top: 10px; margin-top: auto; text-align: left;"><b>운영:</b> ${prog.provider}<br><b>장소:</b> ${prog.location}<br><b>일정:</b> ${prog.date}</div>
        <button type="button" class="primary btn-apply-prog" style="width: 100%; height: 38px; border: 0; margin-top: 8px; cursor: pointer; border-radius: 8px; font-weight: 700;">할 일에 추가</button>
      `;
      card.querySelector(".btn-apply-prog").onclick = () => {
        showToast(`[${prog.title}] 체험 준비 할 일이 추가되었습니다.`);
        addTodoItem(`${prog.title.substring(0, 10)}... 참가하기`);
      };
      progListEl.appendChild(card);
    });
  };

  btnStartTest?.addEventListener("click", () => {
    if (introBox) introBox.style.display = "none";
    if (questionBox) questionBox.style.display = "block";
    currentQ = 0;
    qScores = Object.fromEntries(Object.keys(riasecProfiles).map((key) => [key, 0]));
    qCounts = Object.fromEntries(Object.keys(riasecProfiles).map((key) => [key, 0]));
    qResponses = [];
    renderQuestion();
  });

  btnRestartTest?.addEventListener("click", () => {
    if (resultBox) resultBox.style.display = "none";
    if (questionBox) questionBox.style.display = "block";
    currentQ = 0;
    qScores = Object.fromEntries(Object.keys(riasecProfiles).map((key) => [key, 0]));
    qCounts = Object.fromEntries(Object.keys(riasecProfiles).map((key) => [key, 0]));
    qResponses = [];
    renderQuestion();
  });

  const renderInterestDirectory = () => {
    const grid = document.getElementById("interest-field-grid");
    if (!grid) return;
    grid.innerHTML = "";
    Object.values(riasecProfiles).forEach((profile) => {
      const card = document.createElement("article");
      card.className = "interest-field-card";
      card.innerHTML = `
        <div class="field-card-title"><span>${profile.icon}</span><strong>${profile.label}</strong></div>
        <p>${profile.desc}</p>
        <dl>
          <div><dt>대표 직업</dt><dd>${profile.jobs.join(", ")}</dd></div>
          <div><dt>관련 학과</dt><dd>${profile.majors.join(", ")}</dd></div>
        </dl>
      `;
      grid.appendChild(card);
    });
  };

  const renderExperienceDirectory = () => {
    const list = document.getElementById("experience-directory-list");
    const filter = document.getElementById("experience-field-filter")?.value || "all";
    if (!list) return;
    const programs = Object.values(riasecProfiles).flatMap((profile) => {
      const fieldLabel = profile.label.replace(/\(.+\)/, "");
      return profile.programs.map((program) => ({ ...program, fieldLabel }));
    }).filter((program) => filter === "all" || program.fieldLabel.includes(filter));

    list.innerHTML = "";
    programs.forEach((program) => {
      const card = document.createElement("article");
      card.className = "cn-result-card experience-directory-card";
      card.innerHTML = `
        <span class="cn-badge">${program.fieldLabel}</span>
        <h4>${program.title}</h4>
        <p>${program.detail}</p>
        <div class="cn-meta"><b>운영:</b> ${program.provider}<br><b>장소:</b> ${program.location}<br><b>일정:</b> ${program.date}</div>
      `;
      list.appendChild(card);
    });
  };

  renderInterestDirectory();
  renderExperienceDirectory();
  document.getElementById("experience-field-filter")?.addEventListener("change", renderExperienceDirectory);

  // --- 4. 커리어넷 직업·학과 API 검색 ---
  const searchInput = document.getElementById("cn-search-input");
  const searchBtn = document.getElementById("btn-cn-search");
  const resultsList = document.getElementById("cn-results-list");
  const searchStatus = document.getElementById("cn-search-status");
  const cnFieldFilter = document.getElementById("cn-field-filter");

  function mapCareerNetJob(item = {}) {
    const seq = item.job_cd || item.seq || item.jobdicSeq || item.job_code || "";
    return {
      name: stripApiText(item.job_nm || item.job || "직업명 미상"),
      category: stripApiText(item.top_nm || item.profession || item.tob_nm || "직업분류 정보 없음"),
      field: stripApiText(item.aptit_name || item.jobSe || ""),
      summary: stripApiText(item.work || item.summary || "커리어넷 직업백과에서 제공한 직업 정보입니다."),
      wage: stripApiText(item.wage || item.salery || "정보 없음"),
      related: stripApiText(item.rel_job_nm || item.similarJob || item.similarjob || ""),
      seq,
      link: seq ? `https://www.career.go.kr/cnet/front/base/job/jobView.do?SEQ=${encodeURIComponent(seq)}` : ""
    };
  }

  function mapCareerNetMajor(item = {}) {
    const seq = item.majorSeq || item.MAJOR_SEQ || item.SEQ || "";
    const name = item.facilName || item.mClass || item.majorNm || item.major || item.MAJOR_NM || "학과명 미상";
    return {
      name: stripApiText(name),
      category: stripApiText(item.lClass || item.category || "계열 정보 없음"),
      summary: stripApiText(item.summary || item.purpose || item.interest || "커리어넷 학과정보 API에서 제공한 학과 정보입니다."),
      jobs: stripApiText(item.relatedjob || item.jobNames || item.jobs || ""),
      department: stripApiText(item.department || item.mClass || item.facilName || ""),
      seq,
      link: seq ? `https://www.career.go.kr/cnet/front/base/major/FunivMajorView.do?SEQ=${encodeURIComponent(seq)}` : ""
    };
  }

  async function fetchCareerNetJobs({ query, field }) {
    const cacheKey = JSON.stringify({ type: "jobs", query, field });
    if (careerNetDictionaryCache.has(cacheKey)) return careerNetDictionaryCache.get(cacheKey);

    const jobs = [];
    let totalCount = 0;
    const baseParams = { apiKey: CAREERNET_API_KEY };
    if (query) baseParams.searchJobNm = query;
    if (field !== "all" && careerNetJobCategoryCodes[field]) {
      baseParams.searchJobCd = careerNetJobCategoryCodes[field];
    }

    for (let page = 1; page <= 60; page++) {
      const params = new URLSearchParams({ ...baseParams, pageIndex: String(page) });
      const response = await fetch(`${CAREERNET_JOB_API}?${params.toString()}`);
      if (!response.ok) throw new Error("커리어넷 직업백과 API 응답 실패");
      const data = await response.json();
      const list = toArray(data.jobs);
      if (!list.length) break;
      totalCount = Number(data.count || totalCount || list.length);
      jobs.push(...list.map(mapCareerNetJob));
      if (jobs.length >= totalCount) break;
    }

    const result = { items: jobs, totalCount: totalCount || jobs.length };
    careerNetDictionaryCache.set(cacheKey, result);
    return result;
  }

  async function fetchCareerNetMajors({ query, field }) {
    const cacheKey = JSON.stringify({ type: "majors", query, field });
    if (careerNetDictionaryCache.has(cacheKey)) return careerNetDictionaryCache.get(cacheKey);

    const baseParams = {
      apiKey: CAREERNET_API_KEY,
      svcType: "api",
      svcCode: "MAJOR",
      contentType: "json",
      gubun: "univ_list",
      perPage: "100"
    };
    if (query) baseParams.searchTitle = query;
    if (field !== "all" && careerNetMajorSubjectCodes[field]) {
      baseParams.subject = careerNetMajorSubjectCodes[field];
    }

    const majors = [];
    let totalCount = 0;
    for (let page = 1; page <= 20; page++) {
      const params = new URLSearchParams({ ...baseParams, thisPage: String(page) });
      const response = await fetch(`${CAREERNET_OPEN_API}?${params.toString()}`);
      if (!response.ok) throw new Error("커리어넷 학과정보 API 응답 실패");
      const data = await response.json();
      const list = getCareerNetContent(data);
      if (!list.length) break;
      totalCount = Number(list[0]?.totalCount || data?.dataSearch?.totalCount || totalCount || list.length);
      majors.push(...list.map(mapCareerNetMajor));
      if (majors.length >= totalCount) break;
    }

    const result = { items: majors, totalCount: totalCount || majors.length };
    careerNetDictionaryCache.set(cacheKey, result);
    return result;
  }

  async function searchCareerNetDictionary(query, type, field) {
    const result = type === "jobs"
      ? await fetchCareerNetJobs({ query, field })
      : await fetchCareerNetMajors({ query, field });
    const items = result.items.filter((item) => {
      if (field === "all") return true;
      const haystack = [item.name, item.category, item.field, item.summary, item.jobs, item.related, item.department].join(" ");
      return matchesCareerField(haystack, field);
    });
    return { items, totalCount: result.totalCount };
  }

  const runCnSearch = async () => {
    if (!searchInput || !resultsList) return;
    const query = searchInput.value.trim();
    const type = document.querySelector('input[name="cn-search-type"]:checked')?.value || "jobs";
    const field = cnFieldFilter?.value || "all";

    if (searchStatus) {
      searchStatus.textContent = "커리어넷 API에서 검색 중입니다.";
      searchStatus.style.display = "block";
    }

    resultsList.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--muted);"><div class="spinner" style="margin: 0 auto 16px;"></div>커리어넷 정보를 불러오는 중...</div>`;

    try {
      const { items, totalCount } = await searchCareerNetDictionary(query, type, field);

      if (searchStatus) {
        searchStatus.textContent = `커리어넷 ${type === "jobs" ? "직업백과" : "학과정보"} API 기준 ${totalCount.toLocaleString("ko-KR")}건 중 ${items.length.toLocaleString("ko-KR")}건을 표시합니다.`;
      }

      resultsList.innerHTML = "";
      if (items.length === 0) {
        resultsList.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--muted);">검색 결과가 없습니다. 다른 검색어를 입력해 보세요.</div>`;
        return;
      }

      items.slice(0, 120).forEach(item => {
        const card = document.createElement("div");
        card.className = "cn-result-card";
        
        let metaHtml = "";
        let regBtnText = "";
        if (type === "jobs") {
          metaHtml = `<b>평균 연봉:</b> ${escapeHtml(item.wage || "정보 없음")}<br><b>직업분류:</b> ${escapeHtml(item.category || item.field || "미분류")}${item.related ? `<br><b>관련직업:</b> ${escapeHtml(item.related)}` : ""}`;
          regBtnText = "내 희망 직업으로 등록";
        } else {
          metaHtml = `<b>계열:</b> ${escapeHtml(item.category || "미분류")}<br><b>세부학과:</b> ${escapeHtml(item.department || item.name)}${item.jobs ? `<br><b>관련직업:</b> ${escapeHtml(item.jobs)}` : ""}`;
          regBtnText = "내 희망 학과로 등록";
        }

        card.innerHTML = `
          <span class="cn-badge">${type === "jobs" ? "직업 정보" : "학과 정보"}</span>
          <h4 style="margin: 6px 0 0; font-size: 16.5px; color: var(--ink); font-weight: 800;">${escapeHtml(item.name)}</h4>
          <p style="font-size: 13.5px; color: var(--text); margin-top: 8px; margin-bottom: 8px;">${escapeHtml(item.summary)}</p>
          <div class="cn-meta" style="font-size: 12px; color: var(--muted); border-top: 1px solid var(--soft-line); padding-top: 10px; margin-top: auto; margin-bottom: 12px;">${metaHtml}</div>
          ${item.link ? `<a class="cn-link" href="${item.link}" target="_blank" rel="noopener">커리어넷 상세 정보 열기</a>` : ""}
          <button type="button" class="primary btn-reg-target" style="width: 100%; height: 38px; border: 0; cursor: pointer; border-radius: 8px; font-weight: 700;">${regBtnText}</button>
        `;

        card.querySelector(".btn-reg-target").onclick = async () => {
          if (!currentUser) {
            showToast("로그인 후 희망 직업·학과를 저장할 수 있습니다.");
            setView("auth");
            return;
          }
          if (type === "jobs") {
            studentState.job = item.name;
            showToast(`내 프로필 희망 직업이 [${item.name}]으로 변경되었습니다.`);
          } else {
            studentState.major = item.name;
            showToast(`내 프로필 희망 학과가 [${item.name}]으로 변경되었습니다.`);
          }
          await saveStudentStateToServer();
          syncProfileInputsToUI();
        };

        resultsList.appendChild(card);
      });
    } catch (err) {
      console.error(err);
      if (searchStatus) searchStatus.textContent = "커리어넷 API 검색 중 오류가 발생했습니다.";
      resultsList.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--muted);">내장 결과 없이 커리어넷 API에서만 검색합니다. 네트워크 요청을 확인해 주세요.</div>`;
    }
  };

  searchBtn?.addEventListener("click", runCnSearch);
  cnFieldFilter?.addEventListener("change", runCnSearch);
  document.querySelectorAll('input[name="cn-search-type"]').forEach((radio) => {
    radio.addEventListener("change", runCnSearch);
  });
  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runCnSearch();
  });
}

function syncIntegratedInputs() {
  const nameEl = document.getElementById("rm-name");
  const gradeEl = document.getElementById("rm-grade");
  const jobEl = document.getElementById("rm-job");
  const majorEl = document.getElementById("rm-major");
  
  if (nameEl) nameEl.textContent = studentState.name || "이름 미입력";
  if (gradeEl) gradeEl.textContent = studentState.grade || "학년 미입력";
  if (jobEl) jobEl.textContent = studentState.job || "미선택";
  if (majorEl) majorEl.textContent = studentState.major || "미선택";

  const gInput = document.getElementById("rm-input-gpa");
  const mInput = document.getElementById("rm-input-mock");
  if (gInput) gInput.value = studentState.gpa || "";
  if (mInput) mInput.value = studentState.mock || "";
}

function setupSimulator() {
  // 시뮬레이터 모달 제거됨 - 기능이 진로브릿지 내부 탭으로 직접 통합됨
  // ZEP 모달은 setupActionButtons에서 처리
}



function addTodoItem(title, options = {}) {
  if (!currentUser) {
    if (!options.silent) requireAuth("할 일 추가");
    return;
  }

  const todoLists = document.querySelectorAll(".daily-todo");
  if (todoLists.length === 0) return;

  if (options.unique) {
    const exists = Array.from(document.querySelectorAll(".daily-todo label")).some((label) => label.textContent.trim() === title);
    if (exists) return;
  }
  
  todoLists.forEach(todoList => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    label.appendChild(input);
    label.appendChild(document.createTextNode(" " + title));
    
    const totalCountNode = todoList.querySelector("strong");
    if (totalCountNode) {
      todoList.insertBefore(label, totalCountNode);
    } else {
      todoList.appendChild(label);
    }
  });
  
  todoLists.forEach(todoList => {
    const boxes = todoList.querySelectorAll("input[type='checkbox']");
    const count = todoList.querySelector("[data-daily-count]");
    
    const update = () => {
      const done = Array.from(boxes).filter((box) => box.checked).length;
      if (count) count.textContent = `${done}/${boxes.length} 완료`;
      if (done === boxes.length) {
        showToast("오늘의 할일을 모두 완료했어요.");
      }
    };
    
    boxes.forEach(box => {
      const label = box.closest("label");
      const boxText = label ? label.textContent.trim() : "";
      
      box.onchange = async () => {
        const checked = box.checked;
        document.querySelectorAll(`.daily-todo label`).forEach(lbl => {
          if (lbl.textContent.trim() === boxText) {
            const chk = lbl.querySelector("input");
            if (chk) chk.checked = checked;
          }
        });
        update();
        await serializeAndSaveTodos();
      };
    });
    
    update();
  });
  
  serializeAndSaveTodos();
  if (!options.silent) {
    showToast(`✅ [${title}] 일정을 오늘의 할 일에 추가했습니다!`);
  }
}


function setupInquiryForm() {
  const form = document.querySelector(".inquiry-form");
  if (!form) return;

  const button = form.querySelector("button");
  button?.addEventListener("click", () => {
    const type = form.querySelector("select")?.value || "진로 상담";
    const title = form.querySelector("input")?.value.trim() || "새 문의";
    const content = form.querySelector("textarea")?.value.trim() || "문의 내용이 접수됐어요.";
    const card = document.querySelector(".feedback-card");

    const heading = card?.querySelector("h2");
    const paragraph = card?.querySelector("p");
    if (heading) heading.textContent = `[${type}] ${title}`;
    if (paragraph) paragraph.textContent = content;

    showToast("문의가 저장됐어요. 피드백 카드에 반영했습니다.");
  });
}

buttons.forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

setupCategoryTabs();
setupRecordForm();
setupProfileForm();
setupActionButtons();
setupExplorePortal();
setupSimulator();
setupRoadmapDesigner();
setupAuthListeners();
setupPasswordToggles();

checkAuth();
setupMobileBottomNav();
