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
}

let isUsernameChecked = false;
let checkedUsername = "";

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
  
  let mode = "login";
  isUsernameChecked = false;
  checkedUsername = "";
  
  tabLogin?.addEventListener("click", () => {
    tabLogin.classList.add("is-active");
    tabSignup.classList.remove("is-active");
    btnAuthSubmit.textContent = "로그인";
    mode = "login";
    if (authError) authError.style.display = "none";
    if (confirmPasswordField) confirmPasswordField.style.display = "none";
    if (confirmPasswordInput) confirmPasswordInput.removeAttribute("required");
    if (btnCheckDuplicate) btnCheckDuplicate.style.display = "none";
    if (duplicateStatus) duplicateStatus.style.display = "none";
  });
  
  tabSignup?.addEventListener("click", () => {
    tabSignup.classList.add("is-active");
    tabLogin.classList.remove("is-active");
    btnAuthSubmit.textContent = "회원가입";
    mode = "signup";
    if (authError) authError.style.display = "none";
    if (confirmPasswordField) confirmPasswordField.style.display = "block";
    if (confirmPasswordInput) confirmPasswordInput.setAttribute("required", "true");
    if (btnCheckDuplicate) btnCheckDuplicate.style.display = "inline-block";
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
    }
    
    const endpoint = mode === "login" ? "/api/login" : "/api/signup";
    
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
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
      setupLogoutListener();
      updateAuthUI(true);
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

function updateAuthUI(isLoggedIn) {
  const btnLogin = document.getElementById("btn-login-desktop");
  const btnLogout = document.getElementById("btn-logout-desktop");
  const guestBanner = document.getElementById("guest-alert-banner");
  
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
    // Guest Mode: Load from localStorage or keep defaults
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
      }
    } else {
      // Default initial mock activities
      const defaultActs = [
        { title: "학교 홈페이지 제작", date: "2026.05.26", category: "프로젝트", career: "웹 개발자", content: "반별 소식과 자료를 공유할 수 있는 학급 홈페이지를 기획하고 제작했어요.", learned: "역할을 나누어 기획, 디자인, 구현을 진행하며 협업 역량을 키웠습니다.", feeling: "직접 코딩한 결과물이 실제 사용된다는 생각에 무척 뿌듯했습니다." },
        { title: "IT 해커톤 참가", date: "2026.05.24", category: "대회", career: "소프트웨어 엔지니어", content: "24시간 동안 환경 문제를 해결하기 위한 IT 웹 서비스 아이디어를 도출하고 프로토타입을 만들었습니다.", learned: "React와 CSS를 이용해 빠른 UI 구현을 하는 방법을 체득했습니다.", feeling: "시간 압박 속에서 끝까지 완수하여 큰 자신감을 가졌습니다." },
        { title: "「클린 코드」 독서", date: "2026.05.22", category: "독서", career: "소프트웨어 엔지니어", content: "가독성 높은 코드를 작성하기 위한 규칙과 리팩토링 사례를 공부했습니다.", learned: "네이밍 규칙, 함수 작성법, 주석 사용의 지양 등을 이해했습니다.", feeling: "내가 작성했던 코드를 반성하고 더 좋은 개발자가 되어야겠다고 다짐했습니다." }
      ];
      activitiesList = defaultActs;
      defaultActs.forEach(record => {
        prependSummary(record);
        prependHistory(record);
      });
      syncSelectedActivity(defaultActs[0]);
      updatePortfolioFromRecord(defaultActs[0]);
      localStorage.setItem("guest_activities", JSON.stringify(defaultActs));
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
    localStorage.setItem("guest_studentState", JSON.stringify(studentState));
    return;
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
  } catch (err) {
    console.error("Error saving student state", err);
  }
}

async function saveActivityToServer(record) {
  if (!currentUser) {
    let activities = [];
    const stored = localStorage.getItem("guest_activities");
    if (stored) {
      activities = JSON.parse(stored);
    }
    activities.unshift(record);
    localStorage.setItem("guest_activities", JSON.stringify(activities));
    return;
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
  } catch (err) {
    console.error("Error saving activity", err);
  }
}

async function saveTodosToServer(todos) {
  if (!currentUser) {
    localStorage.setItem("guest_todos", JSON.stringify(todos));
    return;
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
  } catch (err) {
    console.error("Error saving todos", err);
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
    localStorage.setItem("guest_roadmap", JSON.stringify(roadmapData));
    return;
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
  } catch (err) {
    console.error("Error saving roadmap", err);
  }
}

function renderRoadmapData(roadmapData) {
  const resStudentName = document.getElementById("res-student-name");
  const resHopeJob = document.getElementById("res-hope-job");
  const resHopeMajor = document.getElementById("res-hope-major");
  const resGpa = document.getElementById("res-gpa");
  const resMock = document.getElementById("res-mock");

  if (resStudentName) resStudentName.textContent = studentState.name;
  if (resHopeJob) resHopeJob.textContent = studentState.job;
  if (resHopeMajor) resHopeMajor.textContent = studentState.major;
  if (resGpa) resGpa.textContent = studentState.gpa.toFixed(1);
  if (resMock) resMock.textContent = studentState.mock;

  const activeCount = roadmapData.checkedActs.length;
  document.querySelectorAll(".active-count-placeholder").forEach(el => el.textContent = String(activeCount));

  const firstAct = roadmapData.checkedActs[0] || "학교 홈페이지 제작";
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
  name: "김브릿지",
  grade: "고등학교 2학년",
  job: "웹 개발자",
  major: "컴퓨터공학과",
  gpa: 2.3,
  mock: 88,
  interests: ["웹프로그래밍", "앱 개발", "인공지능"],
  intro: "기술로 사람들의 삶을 더 편리하게 만들고 싶어요!",
};


const labels = {
  home: "홈",
  record: "활동 기록",
  portfolio: "포트폴리오",
  explore: "진로 탐색",
  career: "진로 연결",
  zep: "ZEP 전시관",
  feedback: "문의하기",
  profile: "마이페이지",
};

const careerOptions = [
  "웹 개발자",
  "서비스 기획자",
  "UI/UX 디자이너",
  "데이터 분석가",
  "인공지능 개발자",
  "디지털 콘텐츠 기획자",
];

const iconByCategory = {
  독서: "book",
  프로젝트: "code",
  대회: "trophy",
  동아리: "people",
  진로체험: "briefcase",
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

function todayText() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function setView(view) {
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
    [record.category, record.career, "성장 기록"].forEach((tag) => {
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
    abilityList.innerHTML = "<li>문제 해결</li><li>기획·정리</li><li>자기주도성</li>";
  }
  if (jobList) {
    jobList.innerHTML = `<li>${record.career}</li><li>서비스 기획자</li><li>UI/UX 디자이너</li>`;
  }
  if (majorList) {
    majorList.innerHTML = "<li>컴퓨터공학과</li><li>웹프로그래밍과</li><li>학생부종합 탐색</li>";
  }
}

function prependHistory(record) {
  const list = document.querySelector(".history-list");
  if (!list) return;

  const li = document.createElement("li");
  li.appendChild(createRoundIcon(record.category));

  const body = document.createElement("div");
  const title = document.createElement("b");
  const small = document.createElement("small");
  title.textContent = record.title;
  small.textContent = `${record.category} · ${record.date}`;
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
    activityArticle.textContent = `${record.title}, ${record.category} 활동`;
  }
  if (resultArticle) {
    resultArticle.textContent = record.learned || `${record.career}와 연결되는 결과물을 정리 중입니다.`;
  }
  if (goalArticle) {
    goalArticle.textContent = `${record.career} 분야에서 사용자에게 도움이 되는 결과를 만들고 싶습니다.`;
  }
}

function setupRecordForm() {
  const form = document.querySelector(".record-form");
  if (!form) return;

  const careerSelect = form.querySelector("select");
  if (careerSelect && careerSelect.options.length <= 1) {
    careerOptions.forEach((career) => {
      const option = document.createElement("option");
      option.textContent = career;
      option.value = career;
      careerSelect.appendChild(option);
    });
  }

  const saveButton = form.querySelector(".primary");
  const cancelButton = form.querySelector(".ghost");
  const addFileButton = form.querySelector(".add-file");
  const uploadBox = form.querySelector(".upload-box");
  const dateInput = form.querySelectorAll("input")[1];

  if (dateInput && !dateInput.value) {
    dateInput.value = todayText();
  }

  saveButton?.addEventListener("click", async () => {
    const inputs = form.querySelectorAll("input");
    const textareas = form.querySelectorAll("textarea");
    const title = inputs[0]?.value.trim() || "새 활동 기록";
    const date = inputs[1]?.value.trim() || todayText();
    const category = selectedCategory();
    const career = careerSelect?.value && !careerSelect.value.includes("선택") ? careerSelect.value : "웹 개발자";

    const record = {
      title,
      date,
      category,
      career,
      content: textareas[0]?.value.trim(),
      learned: textareas[1]?.value.trim(),
      feeling: textareas[2]?.value.trim(),
    };

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
    await saveActivityToServer(record);
    showToast("활동 기록이 저장되고 진로 연결에 반영됐어요.");
  });

  cancelButton?.addEventListener("click", () => {
    form.reset();
    if (dateInput) dateInput.value = todayText();
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
      showToast(`${tab.textContent.trim()} 활동을 선택했어요.`);
    });
  });
}

function selectedInterests() {
  return Array.from(document.querySelectorAll(".profile-form-page .chip.selected")).map((chip) => chip.textContent.trim());
}

function renderInterestMarks() {
  const target = document.querySelector(".portfolio-list article:nth-child(2) p");
  if (!target) return;

  target.innerHTML = "";
  selectedInterests().forEach((interest) => {
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

  if (cardName) cardName.textContent = studentState.name;
  if (cardGrade) cardGrade.textContent = studentState.grade;
  if (cardJob) cardJob.textContent = studentState.job;
  if (cardMajor) cardMajor.textContent = studentState.major;

  if (cardInterests) {
    cardInterests.innerHTML = "";
    studentState.interests.forEach(interest => {
      const mark = document.createElement("mark");
      mark.textContent = interest;
      cardInterests.appendChild(mark);
    });
  }

  if (dashGpa) dashGpa.textContent = `${studentState.gpa.toFixed(1)}등급`;
  if (dashMock) dashMock.textContent = `${studentState.mock}%`;

  // Update initials on avatars
  const initials = currentUser ? (studentState.name ? studentState.name.substring(0, 2).toUpperCase() : "KB") : "GS";
  const headerNameText = currentUser ? `${studentState.name} 학생` : "ㅇㅇㅇ 학생";
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
  if (dGpa) dGpa.value = studentState.gpa;
  if (dMock) dMock.value = studentState.mock;
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
  if (tGpa) tGpa.value = studentState.gpa;
  if (tMock) tMock.value = studentState.mock;

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
  if (mGpa) mGpa.value = studentState.gpa;
  if (mMock) mMock.value = studentState.mock;

  const profileName = document.getElementById("header-user-name");
  const previewName = document.querySelector(".preview-card h3");
  const previewGrade = document.getElementById("preview-grade");
  if (profileName) profileName.textContent = currentUser ? `${studentState.name} 학생` : "ㅇㅇㅇ 학생";
  if (previewName) previewName.textContent = studentState.name;
  if (previewGrade) previewGrade.textContent = studentState.grade;

  const goalArticle = document.querySelector(".portfolio-list article:nth-child(5) p");
  if (goalArticle) {
    goalArticle.textContent = `${studentState.job} 분야에서 ${studentState.major} 진학을 통해 전문가로 성장하고 싶습니다.`;
  }

  // Update digital ID card and dashboard
  updateDigitalCardAndDashboard();
}

function setupProfileForm() {
  syncProfileInputsToUI();

  // 실시간 입력 연동 (디지털 진로 카드 피드백 제공)
  const dName = document.getElementById("profile-name");
  const dGrade = document.getElementById("profile-grade");
  const dJob = document.getElementById("profile-job");
  const dMajor = document.getElementById("profile-major");
  const dGpa = document.getElementById("profile-gpa");
  const dMock = document.getElementById("profile-mock");
  const dIntro = document.getElementById("profile-intro");

  dName?.addEventListener("input", (e) => {
    studentState.name = e.target.value.trim() || "김브릿지";
    updateDigitalCardAndDashboard();
  });
  dGrade?.addEventListener("change", (e) => {
    studentState.grade = e.target.value;
    updateDigitalCardAndDashboard();
  });
  dJob?.addEventListener("change", (e) => {
    studentState.job = e.target.value;
    updateDigitalCardAndDashboard();
  });
  dMajor?.addEventListener("change", (e) => {
    studentState.major = e.target.value;
    updateDigitalCardAndDashboard();
  });
  dGpa?.addEventListener("input", (e) => {
    studentState.gpa = parseFloat(e.target.value) || 2.3;
    updateDigitalCardAndDashboard();
  });
  dMock?.addEventListener("input", (e) => {
    studentState.mock = parseInt(e.target.value) || 88;
    updateDigitalCardAndDashboard();
  });
  dIntro?.addEventListener("input", (e) => {
    studentState.intro = e.target.value.trim();
  });

  document.querySelectorAll(".chip-field .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      chip.classList.toggle("selected");
      studentState.interests = Array.from(document.querySelectorAll(".chip-field .chip.selected")).map(c => c.textContent.trim());
      updateDigitalCardAndDashboard();
      renderInterestMarks();
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
      studentState.interests = Array.from(document.querySelectorAll(".mobile-chips button.selected")).map(b => b.textContent.replace("✓", "").trim());
      updateDigitalCardAndDashboard();
      renderInterestMarks();
    });
  });

  document.querySelector(".student-form:not(.tablet-card) .primary")?.addEventListener("click", async () => {
    studentState.name = document.getElementById("profile-name")?.value.trim() || studentState.name;
    studentState.grade = document.getElementById("profile-grade")?.value || studentState.grade;
    studentState.job = document.getElementById("profile-job")?.value || studentState.job;
    studentState.major = document.getElementById("profile-major")?.value || studentState.major;
    studentState.gpa = parseFloat(document.getElementById("profile-gpa")?.value) || studentState.gpa;
    studentState.mock = parseInt(document.getElementById("profile-mock")?.value) || studentState.mock;
    studentState.intro = document.getElementById("profile-intro")?.value.trim() || studentState.intro;

    syncProfileInputsToUI();
    renderInterestMarks();
    await saveStudentStateToServer();
    showToast("학생 정보(데스크톱)가 저장됐어요.");
  });

  document.querySelector(".student-form.tablet-card .primary")?.addEventListener("click", () => {
    studentState.name = document.getElementById("tablet-name")?.value.trim() || studentState.name;
    studentState.grade = document.getElementById("tablet-grade")?.value || studentState.grade;
    studentState.job = document.getElementById("tablet-job")?.value || studentState.job;
    studentState.major = document.getElementById("tablet-major")?.value || studentState.major;
    studentState.gpa = parseFloat(document.getElementById("tablet-gpa")?.value) || studentState.gpa;
    studentState.mock = parseInt(document.getElementById("tablet-mock")?.value) || studentState.mock;

    syncProfileInputsToUI();
    renderInterestMarks();
    showToast("학생 정보(태블릿)가 저장됐어요.");
  });

  document.querySelector(".mobile-cta button")?.addEventListener("click", () => {
    studentState.name = document.getElementById("mobile-name")?.value.trim() || studentState.name;
    studentState.grade = document.getElementById("mobile-grade")?.value || studentState.grade;
    studentState.job = document.getElementById("mobile-job")?.value || studentState.job;
    studentState.major = document.getElementById("mobile-major")?.value || studentState.major;
    studentState.gpa = parseFloat(document.getElementById("mobile-gpa")?.value) || studentState.gpa;
    studentState.mock = parseInt(document.getElementById("mobile-mock")?.value) || studentState.mock;

    syncProfileInputsToUI();
    renderInterestMarks();
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
    showToast("새 알림: 최근 활동 기록을 포트폴리오에 반영해 보세요.");
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
}

// 6대 기존 시스템 시뮬레이터 모의 데이터
const systemSimData = {
  careernet: {
    title: "커리어넷 진로심리검사",
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
    title: "어디가 성적 분석 시뮬레이터",
    disadvantage: "성적 등급 등 단순한 '정량적 수치'만 분석할 뿐, 학생이 학교 홈페이지 제작 같은 고난도 주도적 프로젝트를 수행했는지 여부나 학생부 세특 기록의 깊이와 같은 '정성적 요소'를 연동 평가하지 못해 종합적인 합격 가능성 진단이 어렵고 초보 학생에게는 용어가 매우 어렵습니다.",
    html: `
      <div style="font-family:inherit;">
        <p><strong>내신 성적 대입 지원 가능성 진단</strong></p>
        <p style="font-size:13px; color:#6b7b95;">평균 내신 등급을 입력하면 목표 대학 합격 가능성을 정량 분석합니다.</p>
        <div style="display:flex; gap:12px; align-items:center; margin: 12px 0;">
          <label style="font-size:14px;">평균 내신 등급: <input type="number" id="sim-gpa-val" value="2.3" step="0.1" style="width:70px; height:34px; padding:0 8px; border:1px solid #d4e0ef; border-radius:6px;" /></label>
        </div>
        <div id="sim-adiga-result" style="display:none; padding:12px; background:#e8f4fd; border-radius:8px; margin-top:12px; font-size:13.5px;">
          <strong>📊 정량 성적 분석 결과 (A대학 컴퓨터공학과):</strong><br>
          전년도 합격자 평균: <strong>2.1등급</strong><br>
          내 성적: <strong>2.3등급</strong> (지원선: 소신 지원)<br>
          <span style="color:#d6336c; font-size:12px;">* 본 진단은 학생부 종합 전형의 정성적 비교과 활동(세특, 동아리 등) 내역을 반영하지 않습니다.</span>
        </div>
      </div>
    `,
    actionText: "대입 합격 가능성 진단",
    action: function() {
      const res = document.getElementById("sim-adiga-result");
      const gpaInput = document.getElementById("sim-gpa-val");
      if (res && gpaInput) {
        const val = parseFloat(gpaInput.value) || 2.3;
        let prediction = "소신 지원";
        if (val <= 1.9) prediction = "안정권 지원 가능";
        else if (val <= 2.3) prediction = "적정/소신 지원선";
        else prediction = "도전 필요 (우주 예비선)";
        
        res.innerHTML = `
          <strong>📊 정량 성적 분석 결과 (A대학 컴퓨터공학과):</strong><br>
          전년도 합격자 평균: <strong>2.1등급</strong><br>
          내 성적: <strong>${val.toFixed(1)}등급</strong> (지원선: ${prediction})<br>
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
          <span style="color:#d6336c; font-size:12px;">* 본 자료는 순수 논문이며 학생 개개인을 위한 실시간 연동 로드맵 설계 기능은 제공되지 않습니다.</span>
        `;
        res.style.display = "block";
      }
    }
  },
  kkumgil: {
    title: "꿈길 진로체험 프로그램 신청",
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
          - 3D 프린팅 시제품 제작 현장 (신청 가능하나 학교 단체 신청만 허용)
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
            <small style="color:var(--muted);">* 인근 내륙(포항 등)으로 이동하거나 온라인 원격 영상 진로멘토링만 신청 가능합니다.</small>
          `;
        } else {
          res.innerHTML = `
            <strong>🚗 체험처 매핑 결과 (${region}):</strong><br>
            - 마포구 청소년 IT ${query} 캠프 (정원 초과 / <span style="color:#d6336c; font-weight:bold;">마감</span>)<br>
            - 인공지능 로봇 및 ${query} 교실 (대기 접수 중)<br>
            - 대학교 연계 IT ${query} 체험 프로그램 (신청 가능하나 30명 이상 단체 공문 필요)
          `;
        }
        res.style.display = "block";
      }
    }
  },
  worknet: {
    title: "고용24 / 워크넷 직업정보",
    disadvantage: "성인 및 실직자 취업 훈련 등에 특화되어 있어, 고교 학점제 과목 선택이나 생기부 연계 같은 중고등학생들의 실제 학교생활 및 입시 연동성이 결여되어 있습니다.",
    html: `
      <div style="font-family:inherit;">
        <p><strong>워크넷 구인 통계 및 직업 전망 조회</strong></p>
        <p style="font-size:13px; color:#6b7b95;">알고 싶은 직업의 고용 지표 및 임금을 검색합니다.</p>
        <div style="display:flex; gap:8px; margin: 12px 0;">
          <input type="text" id="sim-wn-query" value="웹 개발자" style="flex:1; height:36px; padding:0 10px; border:1px solid #d4e0ef; border-radius:6px;" />
        </div>
        <div id="sim-worknet-result" style="display:none; padding:12px; background:#e8f4fd; border-radius:8px; margin-top:12px; font-size:13.5px;">
          <strong>💼 워크넷 노동시장 정보:</strong><br>
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
          <strong>💼 워크넷 노동시장 정보 (${job}):</strong><br>
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
    title: "대학알리미 공시자료 조회",
    disadvantage: "대학별 순수 정보 공시 사이트로 취업률이나 등록금 등 통계 수치는 보여주지만, 내 역량과 흥미에 비추어 특정 대학 학과에 어떻게 합격할 수 있는지 추천 피드백을 주지 못합니다.",
    html: `
      <div style="font-family:inherit;">
        <p><strong>대학정보공시 지표 비교</strong></p>
        <p style="font-size:13px; color:#6b7b95;">조회하고자 하는 대학 학과를 입력해보세요.</p>
        <div style="display:flex; gap:8px; margin: 12px 0;">
          <input type="text" id="sim-al-query" value="A대학교 컴퓨터공학과" style="flex:1; height:36px; padding:0 10px; border:1px solid #d4e0ef; border-radius:6px;" />
        </div>
        <div id="sim-alimi-result" style="display:none; padding:12px; background:#e8f4fd; border-radius:8px; margin-top:12px; font-size:13.5px;">
          <strong>📊 공시 정보:</strong><br>
          - 전공 취업률: <strong>78.4%</strong><br>
          - 학생 1인당 연간 장학금: <strong>3,420,000원</strong><br>
          - 신입생 충원율: <strong>100%</strong><br>
          - 등록금 현황: <strong>8,120,000원/연</strong>
        </div>
      </div>
    `,
    actionText: "대학 공시 데이터 조회",
    action: function() {
      const res = document.getElementById("sim-alimi-result");
      const univInput = document.getElementById("sim-al-query");
      if (res && univInput) {
        const univ = univInput.value.trim() || "A대학교 컴퓨터공학과";
        res.innerHTML = `
          <strong>📊 대학알리미 공시 정보 (${univ}):</strong><br>
          - 전공 취업률: <strong>78.4%</strong><br>
          - 1인당 연평균 장학금액: <strong>3,420,000원</strong><br>
          - 신입생 수시/정시 경쟁률: <strong>9.2 : 1</strong><br>
          - 연간 수업료 고액도: <strong>8,120,000원</strong><br>
          <span style="color:#d6336c; font-size:12.5px;">* 이 지표는 대학의 환경 통계일 뿐, 해당 대학 전공에 합격하기 위한 학생부 활동 조합 가이드는 없습니다.</span>
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
      aiGpaStat.textContent = "최상위권 (합격 유력)";
      aiGpaStat.className = "match-good";
    } else if (gpaVal <= 2.5) {
      aiGpaStat.textContent = "보통 (적정 지원선)";
      aiGpaStat.className = "";
    } else {
      aiGpaStat.textContent = "도전 필요 (소신 지원)";
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
  let advice = "비교과 활동이 선택되지 않았습니다. 종합전형 지원을 희망하시면 아래 활동 목록에서 1개 이상의 전공 관련 활동을 체크하여 연동해 주십시오.";

  if (targetVal === "종합") {
    if (activeCount >= 3) {
      rating = "최우수 (S)";
      advice = `학생부종합전형(학종)을 대비하기에 최상의 상태입니다. 선택한 ${activeCount}개의 주도적 활동(예: ${checkedActs[0] || '학교 홈페이지 제작'}) 덕분에 정성적 생기부 지수가 매우 견고합니다. 내신 등급(${gpaVal}등급)을 커버할 수 있는 세특 스토리가 돋보입니다.`;
    } else if (activeCount >= 2) {
      rating = "우수 (A)";
      advice = `학종 대비 활동이 ${activeCount}개로 준수합니다. 독서 기록이나 동아리 활동 1개를 추가 연동하면 안정적인 '최우수 (S등급)' 합격 경쟁력을 확보할 수 있습니다.`;
    } else if (activeCount >= 1) {
      rating = "보통 (B)";
      advice = `연동된 비교과 활동이 1개뿐이어서 대입 학종의 정성 평가 요소에서 경쟁력을 확보하기에 다소 부족합니다. 활동 기록 탭에서 전공 분야 활동 기록을 보강할 것을 권장합니다.`;
    } else {
      rating = "미흡 (C)";
      advice = `비교과 활동이 선택되지 않았습니다. 종합전형 지원을 희망하시면 아래 활동 목록에서 1개 이상의 전공 관련 활동을 체크하여 연동해 주십시오.`;
    }
  } else if (targetVal === "교과") {
    if (gpaVal <= 1.8) {
      rating = "최우수 (S)";
      advice = `학생부교과전형(내신 중심)에 매우 유리한 내신 등급(${gpaVal}등급)입니다. 목표 대학 컴퓨터공학과 기준 합격선 안정권에 위치해 있으며, 수능 최저학력기준 충족 여부만 최종 점검하시면 안전합니다.`;
    } else if (gpaVal <= 2.3) {
      rating = "우수 (A)";
      advice = `교과전형 지원선 적정 수준의 내신 등급(${gpaVal}등급)입니다. 전년도 평균 2.1등급에 근접하므로 소신/적정 수준이며, 내신 평점을 2.1 이내로 추가 상승시키면 합격 가능성이 비약적으로 증가합니다.`;
    } else if (gpaVal <= 3.0) {
      rating = "보통 (B)";
      advice = `내신 ${gpaVal}등급은 교과전형 기준 수도권 및 지방 거점 국립대 적정선입니다. 주요 대학 진학을 위해서는 비교과 활동을 보완하여 '학생부종합전형'으로 선회하거나 정시 수능 전형 대비를 강화하는 것을 추천합니다.`;
    } else {
      rating = "미흡 (C)";
      advice = `내신 ${gpaVal}등급으로 학생부교과전형 지원은 불리한 편입니다. 학생부종합전형 지원을 위한 전공적합 세특 보완과 꿈길 SW 체험 참여가 필요합니다.`;
    }
  } else { // targetVal === "수능"
    if (mockVal >= 90) {
      rating = "최우수 (S)";
      advice = `모의고사 백분위 상위 ${100 - mockVal}% (${mockVal}%)는 정시전형 기준 메이저 대학 IT/공학 계열 합격선 안정권입니다. 현 상태를 유지하며 수능 당일 실수를 방지하는 것이 최우선 과제입니다.`;
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
    const gpaVal = parseFloat(rmGpaInput?.value) || 2.3;
    const mockVal = parseInt(rmMockInput?.value) || 88;
    
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
    const gpaVal = parseFloat(rmGpaInput?.value) || 2.3;
    const mockVal = parseInt(rmMockInput?.value) || 88;
    
    studentState.gpa = gpaVal;
    studentState.mock = mockVal;
    
    const checkedActs = Array.from(document.querySelectorAll("#rm-activity-selector input[type='checkbox']:checked")).map(cb => cb.dataset.actTitle);
    
    if (designerCard) designerCard.style.display = "none";
    if (loadingOverlay) loadingOverlay.style.display = "flex";
    if (progressFill) progressFill.style.width = "0%";
    
    const steps = [
      { percentage: 20, text: "진로브릿지 AI 엔진 분석 시작..." },
      { percentage: 40, text: "커리어넷 심리 데이터 결합 완료..." },
      { percentage: 65, text: "어디가 성적 분석 및 대학 합격선 비교 분석 중..." },
      { percentage: 85, text: "대학알리미 SW 학과 공시 통계 연계 매핑 완료..." },
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
 
        if (resStudentName) resStudentName.textContent = studentState.name;
        if (resHopeJob) resHopeJob.textContent = studentState.job;
        if (resHopeMajor) resHopeMajor.textContent = studentState.major;
        if (resGpa) resGpa.textContent = studentState.gpa.toFixed(1);
        if (resMock) resMock.textContent = studentState.mock;
        
        const activeCount = checkedActs.length;
        document.querySelectorAll(".active-count-placeholder").forEach(el => el.textContent = String(activeCount));
        
        const firstAct = checkedActs[0] || "학교 홈페이지 제작";
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
        await saveRoadmapToServer(roadmapData);
        showToast("✨ 학생의 활동 및 성적 데이터를 통합 분석한 로드맵이 생성됐습니다.");
      }
    }, 400);
  });
  
  document.querySelector(".btn-print-roadmap")?.addEventListener("click", () => {
    showToast("인쇄 창에서 로드맵을 PDF로 저장할 수 있습니다.");
    window.setTimeout(() => window.print(), 200);
  });
  
  document.querySelector(".btn-pin-roadmap")?.addEventListener("click", () => {
    showToast("📌 통합 로드맵을 마이페이지 상단에 고정했습니다!");
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

  // --- 1. 고입 매칭기 ---
  const hsData = [
    { name: "경기과학고등학교", type: "과학고", desc: "국내 최정상급 과학영재학교로, 이공계 인재 육성을 위한 심화 교육과정 및 연구(R&E) 중심 교육을 제공합니다.", cutoff: 95, spec: "수학·과학 성취도 A 필수, 면접 및 창의성 캠프 대비 필요" },
    { name: "서울과학고등학교", type: "과학고", desc: "영재학교로서 대학 수준의 전문 교과 과정을 이수하며, 매년 다수의 국제올림피아드 국가대표를 배출합니다.", cutoff: 96, spec: "수학·과학 지필 평가 및 자기주도성 검증 중요" },
    { name: "한영외국어고등학교", type: "외고", desc: "글로벌 어학 인재를 양성하는 명문 외고로, 다양한 제2외국어 심화 트랙 및 글로벌 리더십 프로그램을 운영합니다.", cutoff: 88, spec: "영어 교과 성취도 A 필수, 자기소개서 및 면접 대비" },
    { name: "대원외국어고등학교", type: "외고", desc: "국내 최고의 외고 학업 경쟁력을 보유하고 있으며, 어학 특화 인문학 소양 교육과 대입 진학 성과가 우수합니다.", cutoff: 90, spec: "영어 내신 및 면접 만점 기준 대비 필요" },
    { name: "미래IT마이스터고", type: "마이스터고", desc: "소프트웨어 개발 및 정보보안 분야 기술명장을 육성하는 특수목적고로, 대기업 및 공공기관 100% 취업 연계를 지원합니다.", cutoff: 80, spec: "코딩 기초 소양 및 협업 능력 평가, 포트폴리오 우대" },
    { name: "한국반도체마이스터고", type: "마이스터고", desc: "삼성전자, SK하이닉스 등 반도체 제조 대기업과 협약된 맞춤형 실습 및 장학생 선발 프로그램을 갖추고 있습니다.", cutoff: 82, spec: "기계·공학 기초 물리성적 중시, 면접 심사 비중 높음" },
    { name: "민족사관고등학교", type: "자사고", desc: "전국 단위 모집 자율형 사립고등학교로, 토론식 수업 및 융합형 무학년제 인재 육성을 지향합니다.", cutoff: 94, spec: "전교과 성취도 A 필수, 체력 검정 및 다면 면접 평가" },
    { name: "상산고등학교", type: "자사고", desc: "자사고 중 의약학계열 및 이공계 진학률이 독보적이며, 심화 수학 및 논술 대비 프로그램이 강점입니다.", cutoff: 93, spec: "수학 성적 가중치 높음, 독서 토론 면접 대비 중요" },
    { name: "서울디지텍고등학교", type: "특성화고", desc: "게임 개발, VR/AR 콘텐츠 제작을 가르치며 탄탄한 IT 실무 역량을 배양하고 조기 취업을 보장합니다.", cutoff: 70, spec: "컴퓨터 흥미 및 직업 적성 면접 평가" },
    { name: "한국조리과학고등학교", type: "특성화고", desc: "외식 및 조리 전반의 전문 자격증 취득과 국내외 유명 호텔 취업 및 조리학과 대입 연계를 지원합니다.", cutoff: 75, spec: "실기 적성 평가 및 조리 직무 의지 면접" }
  ];

  const hsFilter = document.getElementById("hs-type-filter");
  const hsRange = document.getElementById("hs-grade-range");
  const hsRangeVal = document.getElementById("hs-grade-val");

  const matchHighSchools = () => {
    const filterType = hsFilter ? hsFilter.value : "all";
    const score = hsRange ? parseInt(hsRange.value) : 90;
    
    if (hsRangeVal) hsRangeVal.textContent = `${score}점`;

    const listEl = document.getElementById("highschool-list");
    if (!listEl) return;

    listEl.innerHTML = "";

    const filtered = hsData.filter(school => {
      if (filterType === "all") return true;
      if (filterType === "과학고" && school.type === "과학고") return true;
      if (filterType === "외고" && school.type === "외고") return true;
      if (filterType === "마이스터고" && school.type === "마이스터고") return true;
      if (filterType === "자사고" && school.type === "자사고") return true;
      if (filterType === "특성화고" && school.type === "특성화고") return true;
      return false;
    });

    filtered.forEach(school => {
      let matchText = "";
      let matchClass = "";
      if (score >= school.cutoff) {
        matchText = "안정 (매우 높음)";
        matchClass = "background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0;";
      } else if (score >= school.cutoff - 4) {
        matchText = "적정 (도전 가능)";
        matchClass = "background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;";
      } else if (score >= school.cutoff - 8) {
        matchText = "소신 (역량 보완)";
        matchClass = "background: #fffbeb; color: #d97706; border: 1px solid #fde68a;";
      } else {
        matchText = "위험 (성적 부족)";
        matchClass = "background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;";
      }

      const card = document.createElement("article");
      card.className = "hs-school-card";
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
          <span class="hs-tag ${school.type}">${school.type}</span>
          <span style="font-size: 11.5px; font-weight: 800; padding: 3px 8px; border-radius: 6px; ${matchClass}">${matchText}</span>
        </div>
        <h4 style="margin: 8px 0 4px; font-size: 16.5px; color: var(--ink); font-weight: 800;">${school.name}</h4>
        <p class="hs-desc" style="font-size: 13.5px; color: var(--text); line-height: 1.5; margin: 4px 0 10px;">${school.desc}</p>
        <div class="hs-spec" style="font-size: 12.5px; background: #f8fbff; border-radius: 8px; padding: 8px 10px; border: 1px solid var(--soft-line); color: var(--blue); font-weight: 700;">
          🔑 <b>입시 핵심:</b> ${school.spec} (합격선: ${school.cutoff}점)
        </div>
      `;
      listEl.appendChild(card);
    });
  };

  hsFilter?.addEventListener("change", matchHighSchools);
  hsRange?.addEventListener("input", matchHighSchools);

  // --- 2. 대입/대학 매칭기 ---
  const univData = [
    { name: "서울대학교", major: "컴퓨터공학부", region: "서울", category: "공학", emp: "82.5%", tuition: "602만원", type: "학생부종합", gpaCut: 1.3, mockCut: 98 },
    { name: "연세대학교", major: "인공지능학과", region: "서울", category: "공학", emp: "79.1%", tuition: "910만원", type: "학생부종합", gpaCut: 1.5, mockCut: 96 },
    { name: "고려대학교", major: "컴퓨터학과", region: "서울", category: "공학", emp: "81.0%", tuition: "890만원", type: "학생부종합", gpaCut: 1.6, mockCut: 95 },
    { name: "한양대학교", major: "융합전자공학부", region: "서울", category: "공학", emp: "78.4%", tuition: "850만원", type: "학생부교과", gpaCut: 1.8, mockCut: 93 },
    { name: "성균관대학교", major: "소프트웨어학과", region: "서울", category: "공학", emp: "83.2%", tuition: "870만원", type: "학생부종합", gpaCut: 1.9, mockCut: 92 },
    { name: "서강대학교", major: "컴퓨터공학과", region: "서울", category: "공학", emp: "76.5%", tuition: "840만원", type: "학생부종합", gpaCut: 2.0, mockCut: 92 },
    { name: "중앙대학교", major: "소프트웨어학부", region: "서울", category: "공학", emp: "75.0%", tuition: "830만원", type: "학생부종합", gpaCut: 2.2, mockCut: 90 },
    { name: "서울과학기술대학교", major: "정밀화학과", region: "서울", category: "자연과학", emp: "68.2%", tuition: "540만원", type: "학생부교과", gpaCut: 2.4, mockCut: 85 },
    { name: "이화여자대학교", major: "생명과학과", region: "서울", category: "자연과학", emp: "65.5%", tuition: "820만원", type: "학생부종합", gpaCut: 2.1, mockCut: 88 },
    { name: "경희대학교", major: "경영학과", region: "서울", category: "인문사회", emp: "71.2%", tuition: "780만원", type: "학생부종합", gpaCut: 2.3, mockCut: 89 },
    { name: "건국대학교", major: "미디어커뮤니케이션학과", region: "서울", category: "인문사회", emp: "70.1%", tuition: "790만원", type: "학생부종합", gpaCut: 2.2, mockCut: 87 },
    { name: "국민대학교", major: "자동차공학과", region: "수도권", category: "공학", emp: "77.0%", tuition: "810만원", type: "학생부교과", gpaCut: 2.5, mockCut: 82 },
    { name: "인하대학교", major: "정보통신공학과", region: "수도권", category: "공학", emp: "74.8%", tuition: "800만원", type: "학생부교과", gpaCut: 2.6, mockCut: 80 },
    { name: "아주대학교", major: "소프트웨어학과", region: "수도권", category: "공학", emp: "78.2%", tuition: "820만원", type: "학생부종합", gpaCut: 2.5, mockCut: 83 },
    { name: "부산대학교", major: "기계공학부", region: "지방거점", category: "공학", emp: "70.5%", tuition: "446만원", type: "학생부교과", gpaCut: 2.4, mockCut: 84 },
    { name: "경북대학교", major: "전자공학부", region: "지방거점", category: "공학", emp: "72.0%", tuition: "450만원", type: "학생부교과", gpaCut: 2.5, mockCut: 83 },
    { name: "홍익대학교", major: "시각디자인과", region: "서울", category: "예체능", emp: "66.0%", tuition: "900만원", type: "학생부종합", gpaCut: 1.7, mockCut: 94 }
  ];

  const univRegionFilter = document.getElementById("univ-region-filter");
  const univSubjectFilter = document.getElementById("univ-subject-filter");

  const syncUniversityTabGrades = () => {
    const gpaLabel = document.getElementById("univ-sync-gpa");
    const mockLabel = document.getElementById("univ-sync-mock");
    if (gpaLabel) gpaLabel.textContent = `${studentState.gpa.toFixed(1)}등급`;
    if (mockLabel) mockLabel.textContent = `${studentState.mock}%`;
  };

  const matchUniversities = () => {
    const region = univRegionFilter ? univRegionFilter.value : "all";
    const subject = univSubjectFilter ? univSubjectFilter.value : "all";
    const tbody = document.getElementById("univ-matching-tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    const filtered = univData.filter(univ => {
      if (region !== "all" && univ.region !== region) return false;
      if (subject !== "all" && univ.category !== subject) return false;
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="padding: 24px; text-align: center; color: var(--muted);">선택한 조건에 부합하는 대학 정보가 없습니다.</td></tr>`;
      return;
    }

    filtered.forEach(univ => {
      let predictText = "";
      let predictStyle = "";
      
      const gpaDiff = studentState.gpa - univ.gpaCut; 
      const mockDiff = studentState.mock - univ.mockCut; 
      
      if (gpaDiff <= 0 && mockDiff >= 0) {
        predictText = "안정 (A+)";
        predictStyle = "background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; border-radius: 6px; padding: 4px 10px;";
      } else if (gpaDiff <= 0.3 && mockDiff >= -4) {
        predictText = "적정 (B)";
        predictStyle = "background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 6px; padding: 4px 10px;";
      } else if (gpaDiff <= 0.6 && mockDiff >= -8) {
        predictText = "소신 (C)";
        predictStyle = "background: #fffbeb; color: #d97706; border: 1px solid #fde68a; border-radius: 6px; padding: 4px 10px;";
      } else {
        predictText = "위험 (D)";
        predictStyle = "background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; border-radius: 6px; padding: 4px 10px;";
      }

      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid var(--soft-line)";
      tr.innerHTML = `
        <td style="padding: 14px 16px; font-weight: 700; color: var(--ink);">${univ.name}</td>
        <td style="padding: 14px 16px; color: var(--text);">${univ.major}</td>
        <td style="padding: 14px 16px; color: var(--blue); font-weight: 700;">${univ.emp}</td>
        <td style="padding: 14px 16px; color: var(--text);">${univ.tuition}</td>
        <td style="padding: 14px 16px; color: var(--muted); font-size: 13px;">${univ.type} (기준선: ${univ.gpaCut}등급)</td>
        <td style="padding: 14px 16px;"><span style="${predictStyle}">${predictText}</span></td>
      `;
      tbody.appendChild(tr);
    });
  };

  univRegionFilter?.addEventListener("change", matchUniversities);
  univSubjectFilter?.addEventListener("change", matchUniversities);

  // --- 3. 간이 진로 흥미 검사 ---
  const cnQuestions = [
    {
      q: "새로운 모바일 어플리케이션을 기획할 때 가장 관심이 가는 단계는 무엇인가요?",
      answers: [
        { text: "화면 레이아웃 디자인 및 감성적인 시각 연출 설계", score: "A" },
        { text: "코딩 개발 및 서버 데이터베이스와의 연동 구현", score: "B" },
        { text: "기획서 작성 및 타겟 분석과 마케팅 홍보 방안 도출", score: "C" }
      ]
    },
    {
      q: "여가 시간에 컴퓨터나 IT 기기로 작업할 때 가장 흥미로운 활동은?",
      answers: [
        { text: "디자인 툴을 이용해 사진을 보정하거나 캐릭터 일러스트 그리기", score: "A" },
        { text: "자동화 스크립트를 짜보거나 가벼운 텍스트 웹 사이트 코딩하기", score: "B" },
        { text: "요즘 유행하는 트렌드 키워드를 찾아 분석하고 피드 작성하기", score: "C" }
      ]
    },
    {
      q: "모둠 프로젝트를 진행할 때 본인이 가장 잘 소화할 수 있는 역할은?",
      answers: [
        { text: "발표 슬라이드 제작 및 세부 시각적 연출과 꾸미기 전담", score: "A" },
        { text: "핵심 기술 설계 및 알고리즘 구현 기여", score: "B" },
        { text: "발표자 조율 및 프로젝트 전체 일정 관리와 스케줄 조절", score: "C" }
      ]
    },
    {
      q: "IT 및 디지털 과학 뉴스 중 눈길을 끄는 흥미로운 소식은?",
      answers: [
        { text: "새로운 생성형 AI 기반 일러스트 툴과 메타버스 예술 전시", score: "A" },
        { text: "양자 컴퓨터 기술 진보와 차세대 브라우저 최적화 성능 패치", score: "B" },
        { text: "테슬라의 플랫폼 비즈니스 유료 구독화 전략과 브랜딩 성공 요인", score: "C" }
      ]
    },
    {
      q: "나만의 스타트업 서비스를 기획한다면 구현해보고 싶은 테마는?",
      answers: [
        { text: "개인 창작자들의 아름다운 포트폴리오를 감상할 수 있는 갤러리 플랫폼", score: "A" },
        { text: "학생들의 일정을 효율적으로 분석해주는 인공지능 일정 자동화 캘린더", score: "B" },
        { text: "동네 상권을 분석하여 유망 사업 정보 트렌드를 모아 보여주는 지도 서비스", score: "C" }
      ]
    }
  ];

  let currentQ = 0;
  let qScores = { A: 0, B: 0, C: 0 };

  const btnStartTest = document.getElementById("btn-start-test");
  const btnRestartTest = document.getElementById("btn-restart-test");
  const introBox = document.getElementById("test-intro-box");
  const questionBox = document.getElementById("test-question-box");
  const resultBox = document.getElementById("test-result-box");
  const qCurrentNum = document.getElementById("q-current-num");
  const qText = document.getElementById("q-text");

  const renderQuestion = () => {
    if (!qCurrentNum || !qText) return;
    
    qCurrentNum.textContent = currentQ + 1;
    qText.textContent = cnQuestions[currentQ].q;

    const answersList = document.querySelector(".test-answers-list");
    if (!answersList) return;

    answersList.innerHTML = "";
    cnQuestions[currentQ].answers.forEach(ans => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "answer-btn";
      btn.textContent = ans.text;
      btn.onclick = () => {
        qScores[ans.score]++;
        currentQ++;
        if (currentQ < 5) {
          renderQuestion();
        } else {
          showTestResult();
        }
      };
      answersList.appendChild(btn);
    });
  };

  const showTestResult = () => {
    if (questionBox) questionBox.style.display = "none";
    if (resultBox) resultBox.style.display = "block";

    const badge = document.getElementById("test-result-badge");
    const desc = document.getElementById("test-result-desc");
    if (!badge || !desc) return;

    let resType = "";
    let resTitle = "";
    let resDesc = "";
    let recommendedPrograms = [];

    if (qScores.B >= qScores.A && qScores.B >= qScores.C) {
      resType = "B";
      resTitle = "💻 공학 및 시스템 소프트웨어 개발자형 (Developer)";
      resDesc = "논리적 추론 및 알고리즘 분석 능력이 우수하며 시스템 구현에 큰 흥미를 느낍니다. 컴퓨터공학과, 인공지능학과 진학이 어울리며 웹 개발자, 인공지능 연구원 등의 직업군이 강력 추천됩니다.";
      recommendedPrograms = [
        { title: "네이버 커넥트 - 청소년 웹 코딩 개발 주말 단기 캠프", provider: "네이버재단", location: "온라인/분당", date: "2026.06.12 (토) 10:00" },
        { title: "인공지능 연구소 - 지능형 챗봇 제작 및 실습 해커톤", provider: "AI융합센터", location: "서울 강남구", date: "2026.06.20 (토) 09:00" }
      ];
    } else if (qScores.A >= qScores.B && qScores.A >= qScores.C) {
      resType = "A";
      resTitle = "🎨 크리에이티브 미디어 및 UI/UX 디자인형 (Designer)";
      resDesc = "미적 감각이 뛰어나며 사용자 중심의 시각 표현 및 미디어 제작에 소질이 있습니다. 디자인학과, 미디어커뮤니케이션학과 진학이 적합하며 UX/UI 디자이너, 영상 에디터 등이 추천됩니다.";
      recommendedPrograms = [
        { title: "디자인진흥원 - 피그마(Figma) 활용 앱 UI/UX 디자인 워크숍", provider: "한국디자인협회", location: "서울 마포구", date: "2026.06.05 (금) 14:00" },
        { title: "디지털 콘텐츠 센터 - 모바일 단편 영상 숏폼 편집 교실", provider: "영상문화센터", location: "경기 수원시", date: "2026.06.18 (목) 16:00" }
      ];
    } else {
      resType = "C";
      resTitle = "📈 IT 비즈니스 기획 및 데이터 분석 PM형 (Planner)";
      resDesc = "사람과 기술을 조율하는 소통 역량이 우수하고 트렌드 파악 및 비즈니스 마케팅 전략 수립에 흥미를 느낍니다. 경영학과, 빅데이터분석학과 전공이 어울리며 IT 서비스 기획자, 마케터 등이 좋습니다.";
      recommendedPrograms = [
        { title: "구글 스타트업 캠퍼스 - 청소년 창업 경진대회 아이디어 피칭", provider: "구글 코리아", location: "서울 강남구", date: "2026.06.15 (월) 13:00" },
        { title: "데이터사이언스 연구회 - 구글 트렌드 분석 및 온라인 브랜딩 세미나", provider: "비즈니스포럼", location: "온라인/대구", date: "2026.06.22 (월) 15:00" }
      ];
    }

    badge.textContent = resTitle;
    desc.textContent = resDesc;

    const progListEl = document.getElementById("experience-program-list");
    if (!progListEl) return;

    progListEl.innerHTML = "";
    recommendedPrograms.forEach(prog => {
      const card = document.createElement("div");
      card.className = "cn-result-card";
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <span class="cn-badge">체험 연계</span>
          <span style="font-size: 11.5px; background: #ecfdf5; color: #059669; padding: 2px 6px; border-radius: 4px; font-weight: 800;">신청 가능</span>
        </div>
        <h4 style="margin: 6px 0 0; font-size: 15.5px; color: var(--ink); font-weight: 800;">${prog.title}</h4>
        <p style="font-size: 13px; color: var(--text); margin-top: 8px; margin-bottom: 8px; text-align: left;"><b>체험처:</b> ${prog.provider} | <b>지역:</b> ${prog.location}</p>
        <div class="cn-meta" style="font-size: 12px; color: var(--muted); border-top: 1px solid var(--soft-line); padding-top: 10px; margin-top: auto; text-align: left;">📅 일시: ${prog.date}</div>
        <button type="button" class="primary btn-apply-prog" style="width: 100%; height: 38px; border: 0; margin-top: 8px; cursor: pointer; border-radius: 8px; font-weight: 700;">체험 신청하기</button>
      `;
      card.querySelector(".btn-apply-prog").onclick = () => {
        showToast(`🎉 [${prog.title}] 신청이 완료되었습니다! 일정이 추가되었습니다.`);
        addTodoItem(`${prog.title.substring(0, 10)}... 참가하기`);
      };
      progListEl.appendChild(card);
    });
  };

  btnStartTest?.addEventListener("click", () => {
    if (introBox) introBox.style.display = "none";
    if (questionBox) questionBox.style.display = "block";
    currentQ = 0;
    qScores = { A: 0, B: 0, C: 0 };
    renderQuestion();
  });

  btnRestartTest?.addEventListener("click", () => {
    if (resultBox) resultBox.style.display = "none";
    if (questionBox) questionBox.style.display = "block";
    currentQ = 0;
    qScores = { A: 0, B: 0, C: 0 };
    renderQuestion();
  });

  // --- 4. 커리어넷 실시간 백과사전 ---
  const searchInput = document.getElementById("cn-search-input");
  const searchBtn = document.getElementById("btn-cn-search");
  const resultsList = document.getElementById("cn-results-list");
  const searchStatus = document.getElementById("cn-search-status");

  const runCnSearch = async () => {
    if (!searchInput || !resultsList) return;
    const query = searchInput.value.trim();
    const type = document.querySelector('input[name="cn-search-type"]:checked')?.value || "jobs";
    
    if (!query) {
      showToast("검색어를 입력해 주세요!");
      return;
    }

    if (searchStatus) {
      searchStatus.textContent = "🔍 커리어넷 오픈 API 데이터 검색 중...";
      searchStatus.style.display = "block";
    }

    resultsList.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--muted);"><div class="spinner" style="margin: 0 auto 16px;"></div>커리어넷 API 데이터 조회 중...</div>`;

    try {
      const endpoint = type === "jobs" ? "/api/careernet/jobs" : "/api/careernet/majors";
      const response = await fetch(`${endpoint}?query=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (searchStatus) {
        searchStatus.textContent = `✅ 검색 완료: 총 ${data.length}건이 발견되었습니다.`;
      }

      resultsList.innerHTML = "";
      if (data.length === 0) {
        resultsList.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--muted);">검색 결과가 없습니다. 다른 검색어를 입력해 보세요.</div>`;
        return;
      }

      data.forEach(item => {
        const card = document.createElement("div");
        card.className = "cn-result-card";
        
        let metaHtml = "";
        let regBtnText = "";
        if (type === "jobs") {
          metaHtml = `💵 <b>평균 연봉:</b> ${item.wage || '정보없음'} <br> 💼 <b>직업군:</b> ${item.category || item.field || '미분류'}`;
          regBtnText = "내 희망 직업으로 등록";
        } else {
          metaHtml = `🎓 <b>계열:</b> ${item.category || '미분류'} <br> 💼 <b>진출 직업:</b> ${item.jobs || '정보없음'}`;
          regBtnText = "내 희망 학과로 등록";
        }

        card.innerHTML = `
          <span class="cn-badge">${type === "jobs" ? "직업 사전" : "학과 사전"}</span>
          <h4 style="margin: 6px 0 0; font-size: 16.5px; color: var(--ink); font-weight: 800;">${item.name}</h4>
          <p style="font-size: 13.5px; color: var(--text); margin-top: 8px; margin-bottom: 8px;">${item.summary}</p>
          <div class="cn-meta" style="font-size: 12px; color: var(--muted); border-top: 1px solid var(--soft-line); padding-top: 10px; margin-top: auto; margin-bottom: 12px;">${metaHtml}</div>
          <button type="button" class="primary btn-reg-target" style="width: 100%; height: 38px; border: 0; cursor: pointer; border-radius: 8px; font-weight: 700;">${regBtnText}</button>
        `;

        card.querySelector(".btn-reg-target").onclick = async () => {
          if (type === "jobs") {
            studentState.job = item.name;
            showToast(`🎯 내 프로필 희망 직업이 [${item.name}]으로 변경되었습니다.`);
          } else {
            studentState.major = item.name;
            showToast(`🎯 내 프로필 희망 학과가 [${item.name}]으로 변경되었습니다.`);
          }
          await saveStudentStateToServer();
          syncProfileInputsToUI();
        };

        resultsList.appendChild(card);
      });
    } catch (err) {
      console.error(err);
      if (searchStatus) searchStatus.textContent = "❌ 검색 중 오류가 발생했습니다.";
      resultsList.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--muted);">오류가 발생해 폴백 데이터를 복원하지 못했습니다.</div>`;
    }
  };

  searchBtn?.addEventListener("click", runCnSearch);
  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runCnSearch();
  });
}

function syncIntegratedInputs() {
  const nameEl = document.getElementById("rm-name");
  const gradeEl = document.getElementById("rm-grade");
  const jobEl = document.getElementById("rm-job");
  const majorEl = document.getElementById("rm-major");
  
  if (nameEl) nameEl.textContent = studentState.name;
  if (gradeEl) gradeEl.textContent = studentState.grade;
  if (jobEl) jobEl.textContent = studentState.job;
  if (majorEl) majorEl.textContent = studentState.major;

  const gInput = document.getElementById("rm-input-gpa");
  const mInput = document.getElementById("rm-input-mock");
  if (gInput) gInput.value = studentState.gpa;
  if (mInput) mInput.value = studentState.mock;
}

function setupSimulator() {
  const modal = document.getElementById("sys-simulator-modal");
  const modalTitle = document.getElementById("sim-modal-title");
  const modalBody = document.getElementById("sim-modal-body-content");
  const disadvantageBox = document.getElementById("sim-disadvantage-highlight");
  const disadvantageText = document.getElementById("sim-disadvantage-text");
  const btnAction = document.getElementById("btn-sim-action");
  const btnSolveJobBridge = document.getElementById("btn-sim-solve-jobbridge");
  const btnCloseSim = document.getElementById("btn-close-sim");
  const btnSimClose = document.getElementById("btn-sim-close");
  
  let currentSystem = "";
  
  document.querySelectorAll(".btn-simulate").forEach(btn => {
    btn.addEventListener("click", () => {
      const sysId = btn.dataset.simulate;
      const data = systemSimData[sysId];
      if (!data) return;
      
      currentSystem = sysId;
      
      modalTitle.textContent = data.title;
      modalBody.innerHTML = data.html;
      disadvantageText.textContent = data.disadvantage;
      
      disadvantageBox.style.display = "none";
      if (btnSolveJobBridge) btnSolveJobBridge.style.display = "none";
      btnAction.textContent = data.actionText;
      btnAction.style.display = "inline-block";
      
      modal.style.display = "grid";

      // Sync active state GPA into Adiga input on load
      if (sysId === "adiga") {
        setTimeout(() => {
          const gpaValInput = document.getElementById("sim-gpa-val");
          if (gpaValInput) gpaValInput.value = studentState.gpa;
        }, 10);
      }
    });
  });
  
  btnAction?.addEventListener("click", () => {
    const data = systemSimData[currentSystem];
    if (data && data.action) {
      data.action();
      disadvantageBox.style.display = "block";
      if (btnSolveJobBridge) btnSolveJobBridge.style.display = "inline-block";
      btnAction.style.display = "none";
      showToast("⚠️ 분석 완료. 시스템 한계(단점)가 아래쪽에 표시되었습니다.");
    }
  });

  btnSolveJobBridge?.addEventListener("click", () => {
    if (modal) modal.style.display = "none";
    const rmTab = document.querySelector('[data-explore-tab="integrated"]');
    if (rmTab) rmTab.click();
    setView("explore");
    showToast("✨ 진로브릿지 통합 설계 엔진으로 이동했습니다. 단점 없는 설계를 시작해보세요!");
  });
  
  const closeModal = () => {
    if (modal) modal.style.display = "none";
  };
  
  btnCloseSim?.addEventListener("click", closeModal);
  btnSimClose?.addEventListener("click", closeModal);
}



function addTodoItem(title) {
  const todoLists = document.querySelectorAll(".daily-todo");
  if (todoLists.length === 0) return;
  
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
  showToast(`✅ [${title}] 일정을 오늘의 할 일에 추가했습니다!`);
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
setupInquiryForm();
setupExplorePortal();
setupSimulator();
setupRoadmapDesigner();
setupAuthListeners();

checkAuth();
setupMobileBottomNav();
