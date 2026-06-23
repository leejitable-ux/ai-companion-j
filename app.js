const STORAGE_KEY = "ai-companion-j-v1";
const PHOTO_STORAGE_KEY = "ai-companion-j-profile-photo";

const character = {
  name: "J",
  age: "20대 중반",
  startRelation: "친해진 친구",
  userName: "너",
  nicknameAfterLover: "자기",
  jealousy: "중",
  sulkiness: "중",
};

const relationshipStages = [
  { label: "친해진 친구", min: 0 },
  { label: "서로 신경 쓰는 사이", min: 25 },
  { label: "썸", min: 48 },
  { label: "연인", min: 72 },
  { label: "안정적인 연인", min: 90 },
];

const starterMessages = [
  {
    role: "j",
    text: "왔네. 나 방금 네 생각하고 있었는데.\n오늘은 좀 어땠어? 편하게 말해도 돼.",
    at: Date.now(),
  },
];

let state = loadState();

const messagesEl = document.querySelector("#messages");
const formEl = document.querySelector("#chatForm");
const inputEl = document.querySelector("#messageInput");
const stageEl = document.querySelector("#relationshipStage");
const affectionEl = document.querySelector("#affectionScore");
const affectionFillEl = document.querySelector("#affectionFill");
const affectionLabelEl = document.querySelector("#affectionLabel");
const resetButton = document.querySelector("#resetButton");
const profileButton = document.querySelector("#profileButton");
const profileSheet = document.querySelector("#profileSheet");
const photoInput = document.querySelector("#photoInput");
const avatarImage = document.querySelector("#avatarImage");
const avatarInitial = document.querySelector("#avatarInitial");
const profileImage = document.querySelector("#profileImage");
const profileInitial = document.querySelector("#profileInitial");

render();
renderProfilePhoto();
clearOldAppCache();

formEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;

  addMessage("user", text);
  inputEl.value = "";
  autoResizeInput();
  updateAffection(text);
  showTyping();

  try {
    const reply = await createAiReply(text);
    removeTyping();
    addMessage("j", reply);
  } catch (error) {
    removeTyping();
    addMessage("j", `AI 연결 오류: ${error.message || "알 수 없는 오류"}`);
  }
});

inputEl.addEventListener("input", autoResizeInput);

resetButton.addEventListener("click", () => {
  const ok = window.confirm("J와의 대화를 처음부터 다시 시작할까?");
  if (!ok) return;

  state = createInitialState();
  saveState();
  render();
});

profileButton.addEventListener("click", openProfileSheet);

document.querySelectorAll("[data-close-profile]").forEach((node) => {
  node.addEventListener("click", closeProfileSheet);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeProfileSheet();
});

photoInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    window.localStorage.setItem(PHOTO_STORAGE_KEY, String(reader.result));
    renderProfilePhoto();
  });
  reader.readAsDataURL(file);
});

function createInitialState() {
  return {
    messages: starterMessages,
    affection: 12,
    lastUserReplyAt: null,
    facts: [],
  };
}

function loadState() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return createInitialState();

  try {
    const parsed = JSON.parse(raw);
    return {
      ...createInitialState(),
      ...parsed,
      messages: parsed.messages?.length ? parsed.messages : starterMessages,
    };
  } catch {
    return createInitialState();
  }
}

function saveState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  messagesEl.innerHTML = "";
  state.messages.forEach((message) => appendMessageNode(message.role, message.text));
  renderStatus();
  scrollToBottom();
}

function renderStatus() {
  const affection = Math.min(100, Math.max(0, Math.round(state.affection)));
  const stage = getCurrentStage();

  stageEl.textContent = stage.label;
  affectionEl.textContent = affection;
  affectionFillEl.style.width = `${affection}%`;
  affectionLabelEl.textContent = getAffectionLabel(affection);
}

function getAffectionLabel(affection) {
  if (affection >= 90) return "서로 가장 편한 사이";
  if (affection >= 72) return "연인처럼 가까운 사이";
  if (affection >= 48) return "설렘이 분명해지는 중";
  if (affection >= 25) return "서로 신경 쓰는 중";
  return "천천히 가까워지는 중";
}

function renderProfilePhoto() {
  const savedPhoto = window.localStorage.getItem(PHOTO_STORAGE_KEY);
  const images = [avatarImage, profileImage];
  const initials = [avatarInitial, profileInitial];

  if (!savedPhoto) {
    images.forEach((image) => {
      image.hidden = true;
      image.removeAttribute("src");
    });
    initials.forEach((initial) => {
      initial.hidden = false;
    });
    return;
  }

  images.forEach((image) => {
    image.src = savedPhoto;
    image.hidden = false;
  });
  initials.forEach((initial) => {
    initial.hidden = true;
  });
}

function openProfileSheet() {
  profileSheet.classList.add("open");
  profileSheet.setAttribute("aria-hidden", "false");
}

function closeProfileSheet() {
  profileSheet.classList.remove("open");
  profileSheet.setAttribute("aria-hidden", "true");
}

function addMessage(role, text) {
  state.messages.push({ role, text, at: Date.now() });
  if (role === "user") state.lastUserReplyAt = Date.now();
  saveState();
  appendMessageNode(role, text);
  renderStatus();
  scrollToBottom();
}

function appendMessageNode(role, text) {
  const node = document.createElement("div");
  node.className = `message ${role}`;
  node.textContent = text;
  messagesEl.appendChild(node);
}

function showTyping() {
  const node = document.createElement("div");
  node.className = "message j typing";
  node.dataset.typing = "true";
  node.textContent = "J가 입력 중...";
  messagesEl.appendChild(node);
  scrollToBottom();
}

function removeTyping() {
  document.querySelector("[data-typing='true']")?.remove();
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
}

function autoResizeInput() {
  inputEl.style.height = "auto";
  inputEl.style.height = `${inputEl.scrollHeight}px`;
}

function updateAffection(text) {
  const warmWords = ["좋아", "보고", "고마워", "귀여", "사랑", "힘들", "외로", "생각"];
  const questionBonus = text.includes("?") || text.includes("？") ? 1 : 0;
  const warmBonus = warmWords.some((word) => text.includes(word)) ? 2 : 0;
  const lengthBonus = text.length > 18 ? 1 : 0;
  state.affection = Math.min(100, state.affection + 2 + questionBonus + warmBonus + lengthBonus);
}

function getCurrentStage() {
  return relationshipStages
    .slice()
    .reverse()
    .find((stage) => state.affection >= stage.min);
}

async function createAiReply(userText) {
  rememberSimpleFacts(userText);

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: userText,
      stage: getCurrentStage().label,
      affection: state.affection,
      history: state.messages.slice(-14),
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.reply) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return String(data.reply).trim();
}

function rememberSimpleFacts(text) {
  const factTriggers = ["좋아해", "싫어해", "일해", "살아", "취미", "이름"];
  if (factTriggers.some((trigger) => text.includes(trigger)) && state.facts.length < 20) {
    state.facts.push({ text, at: Date.now() });
  }
}

function clearOldAppCache() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations?.().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
  }

  if ("caches" in window) {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    });
  }
}
