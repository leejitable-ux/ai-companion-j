const STORAGE_KEY = "ai-companion-j-v1";
const PHOTO_STORAGE_KEY = "ai-companion-j-profile-photo";
const SETTINGS_STORAGE_KEY = "ai-companion-j-settings";
const STYLE_REFERENCE_LIMIT = 8000;

const defaultSettings = {
  ageRange: "mid20s",
  ageRelation: "same",
  tone: "warm",
  playfulness: "medium",
  jealousy: "medium",
  sulkiness: "medium",
  replyLength: "short",
  styleMemo: "",
};

const scenarios = {
  closeFriend: {
    icon: "☁️",
    title: "친해진 친구",
    description: "이미 어느 정도 편하고, 천천히 더 가까워지는 사이",
    stage: "친해진 친구",
    affection: 12,
    context: "사용자와 J는 이미 어느 정도 친해진 친구다. 편하지만 아직 연인처럼 대하기엔 이르다.",
    starter: "왔네. 나 방금 네 생각하고 있었는데.\n오늘은 좀 어땠어? 편하게 말해도 돼.",
  },
  reconnected: {
    icon: "🌙",
    title: "오랜만에 다시 연락한 사이",
    description: "반갑지만 살짝 어색한 거리감에서 다시 시작",
    stage: "친해진 친구",
    affection: 8,
    context: "사용자와 J는 한동안 연락이 없다가 다시 대화를 시작했다. 반가움과 살짝 어색함이 함께 있다.",
    starter: "오랜만이다.\n뭔가 괜히 어색한데 또 반갑네. 잘 지냈어?",
  },
  dailyFriend: {
    icon: "💬",
    title: "매일 연락하는 친구",
    description: "별일 없어도 톡하는 편한 친구 같은 시작",
    stage: "서로 신경 쓰는 사이",
    affection: 24,
    context: "사용자와 J는 매일 가볍게 연락하는 편한 친구다. 장난과 일상 공유가 자연스럽다.",
    starter: "뭐해.\n나 그냥 별일 없는데 괜히 톡 보내고 싶었어 ㅋㅋ",
  },
  almostFlirt: {
    icon: "✨",
    title: "썸 직전의 친구",
    description: "친구인데 서로 은근히 신경 쓰는 분위기",
    stage: "서로 신경 쓰는 사이",
    affection: 36,
    context: "사용자와 J는 친구지만 서로 은근히 신경 쓰는 분위기다. 설렘은 있지만 확실한 연인 사이는 아니다.",
    starter: "왔네.\n나 너한테 톡 오면 괜히 좀 기분 좋아지는 거 알아? 아, 너무 티 냈나 ㅋㅋ",
  },
  newPerson: {
    icon: "🫧",
    title: "막 알게 된 사람",
    description: "조금 낯설고 조심스럽게 알아가는 시작",
    stage: "친해진 친구",
    affection: 4,
    context: "사용자와 J는 막 알게 된 사이다. 아직은 조심스럽고 서로를 알아가는 단계다.",
    starter: "안녕.\n아직은 좀 어색한데, 그래도 천천히 얘기해보면 좋겠다.",
  },
};

const relationshipStages = [
  { label: "친해진 친구", min: 0 },
  { label: "서로 신경 쓰는 사이", min: 25 },
  { label: "썸", min: 48 },
  { label: "연인", min: 72 },
  { label: "안정적인 연인", min: 90 },
];

let state = loadState();
let settings = loadSettings();
let pendingBoundary = { tooFast: false, terms: [] };

const launchScreen = document.querySelector("#launchScreen");
const onboardingEl = document.querySelector("#onboarding");
const scenarioListEl = document.querySelector("#scenarioList");
const appShell = document.querySelector("#appShell");
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
const ageRangeSetting = document.querySelector("#ageRangeSetting");
const ageRelationSetting = document.querySelector("#ageRelationSetting");
const toneSetting = document.querySelector("#toneSetting");
const playfulnessSetting = document.querySelector("#playfulnessSetting");
const jealousySetting = document.querySelector("#jealousySetting");
const sulkinessSetting = document.querySelector("#sulkinessSetting");
const replyLengthSetting = document.querySelector("#replyLengthSetting");
const styleMemoSetting = document.querySelector("#styleMemoSetting");

renderScenarioChoices();
renderAppMode();
render();
renderProfilePhoto();
renderSettings();
clearOldAppCache();
hideLaunchScreen();

formEl.addEventListener("submit", handleSubmit);

inputEl.addEventListener("input", autoResizeInput);
inputEl.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  formEl.requestSubmit();
});

resetButton.addEventListener("click", () => {
  const ok = window.confirm("J와의 대화를 처음부터 다시 시작하고 상황도 다시 고를까?");
  if (!ok) return;

  state = createUnstartedState();
  saveState();
  renderAppMode();
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

[
  ageRangeSetting,
  ageRelationSetting,
  toneSetting,
  playfulnessSetting,
  jealousySetting,
  sulkinessSetting,
  replyLengthSetting,
].forEach((select) => {
  select.addEventListener("change", saveSettingsFromForm);
});

styleMemoSetting.addEventListener("input", saveSettingsFromForm);

function hideLaunchScreen() {
  if (!launchScreen) return;
  window.setTimeout(() => {
    launchScreen.classList.add("hide");
    window.setTimeout(() => launchScreen.remove(), 420);
  }, 1250);
}

function renderScenarioChoices() {
  if (!scenarioListEl) return;
  scenarioListEl.innerHTML = Object.entries(scenarios)
    .map(
      ([key, scenario]) => `
        <button class="scenario-button" type="button" data-scenario="${key}">
          <span class="scenario-icon" aria-hidden="true">${scenario.icon}</span>
          <span>
            <span class="scenario-title">${scenario.title}</span>
            <span class="scenario-desc">${scenario.description}</span>
          </span>
          <span class="scenario-arrow" aria-hidden="true">›</span>
        </button>
      `
    )
    .join("");

  scenarioListEl.querySelectorAll("[data-scenario]").forEach((button) => {
    button.addEventListener("click", () => startScenario(button.dataset.scenario));
  });
}

function startScenario(key) {
  state = createInitialState(key);
  saveState();
  renderAppMode();
  render();
}

function renderAppMode() {
  const needsOnboarding = !state.started;
  onboardingEl.hidden = !needsOnboarding;
  appShell.hidden = needsOnboarding;
}

async function handleSubmit(event) {
  event.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;

  const idleMs = getIdleMs();

  addMessage("user", text);
  inputEl.value = "";
  autoResizeInput();
  pendingBoundary = updateAffection(text);

  const timing = getReplyTiming(text, idleMs);
  await wait(timing.firstDelay);
  showTyping();
  await wait(timing.secondDelay);

  try {
    const reply = await createAiReply(text);
    removeTyping();
    addMessage("j", reply);
  } catch (error) {
    removeTyping();
    addMessage("j", `AI 연결 오류: ${error.message || "알 수 없는 오류"}`);
  }
}

function createUnstartedState() {
  return {
    started: false,
    scenario: null,
    scenarioContext: "",
    messages: [],
    affection: 0,
    lastUserReplyAt: null,
    facts: [],
  };
}

function createInitialState(scenarioKey = "closeFriend") {
  const scenario = scenarios[scenarioKey] || scenarios.closeFriend;
  return {
    started: true,
    scenario: scenarioKey,
    scenarioContext: scenario.context,
    messages: [
      {
        role: "j",
        text: scenario.starter,
        at: Date.now(),
      },
    ],
    affection: scenario.affection,
    lastUserReplyAt: null,
    facts: [],
  };
}

function loadState() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return createUnstartedState();

  try {
    const parsed = JSON.parse(raw);
    if (!parsed.started && !parsed.messages?.length) return createUnstartedState();

    const fallback = parsed.started ? createInitialState(parsed.scenario || "closeFriend") : createUnstartedState();
    return {
      ...fallback,
      ...parsed,
      messages: parsed.messages?.length ? parsed.messages : fallback.messages,
      scenarioContext: parsed.scenarioContext || scenarios[parsed.scenario]?.context || fallback.scenarioContext || "",
    };
  } catch {
    return createUnstartedState();
  }
}

function loadSettings() {
  const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!raw) return { ...defaultSettings };

  try {
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return { ...defaultSettings };
  }
}

function saveState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function saveSettings() {
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function saveSettingsFromForm() {
  settings = {
    ageRange: ageRangeSetting.value,
    ageRelation: ageRelationSetting.value,
    tone: toneSetting.value,
    playfulness: playfulnessSetting.value,
    jealousy: jealousySetting.value,
    sulkiness: sulkinessSetting.value,
    replyLength: replyLengthSetting.value,
    styleMemo: styleMemoSetting.value.slice(0, STYLE_REFERENCE_LIMIT),
  };
  saveSettings();
}

function renderSettings() {
  ageRangeSetting.value = settings.ageRange;
  ageRelationSetting.value = settings.ageRelation;
  toneSetting.value = settings.tone;
  playfulnessSetting.value = settings.playfulness;
  jealousySetting.value = settings.jealousy;
  sulkinessSetting.value = settings.sulkiness;
  replyLengthSetting.value = settings.replyLength;
  styleMemoSetting.value = settings.styleMemo || "";
}

function render() {
  messagesEl.innerHTML = "";
  state.messages.forEach((message) => appendMessageNode(message.role, message.text, message.id));
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

function addMessage(role, text, options = {}) {
  const message = {
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    role,
    text,
    at: Date.now(),
    transient: Boolean(options.transient),
  };
  state.messages.push(message);
  if (role === "user") state.lastUserReplyAt = Date.now();
  saveState();
  appendMessageNode(role, text, message.id);
  renderStatus();
  scrollToBottom();
  return message;
}

function appendMessageNode(role, text, id) {
  const node = document.createElement("div");
  node.className = `message ${role}`;
  if (id) node.dataset.messageId = id;
  node.textContent = text;
  messagesEl.appendChild(node);
}

function showTyping() {
  const node = document.createElement("div");
  node.className = "message j typing";
  node.dataset.typing = "true";
  node.textContent = "입력중...";
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
  const boundary = detectPrematureRomance(text);
  const warmWords = ["좋아", "보고", "고마워", "귀여", "사랑", "힘들", "외로", "생각"];
  const questionBonus = text.includes("?") || text.includes("？") ? 1 : 0;
  const warmBonus = warmWords.some((word) => text.includes(word)) ? 2 : 0;
  const lengthBonus = text.length > 18 ? 1 : 0;
  const baseGain = 2 + questionBonus + warmBonus + lengthBonus;

  if (boundary.tooFast) {
    const penalty = state.affection < 25 ? 7 : state.affection < 48 ? 5 : 3;
    state.affection = Math.max(0, state.affection + Math.max(0, baseGain - 2) - penalty);
    saveState();
    renderStatus();
    return boundary;
  }

  state.affection = Math.min(100, state.affection + baseGain);
  saveState();
  return boundary;
}

function detectPrematureRomance(text) {
  const terms = ["자기", "여보", "애기", "공주", "내꺼", "사랑해", "사랑한다", "뽀뽀", "키스", "안아줘", "안기고", "보고싶어 죽겠"];
  const matched = terms.filter((term) => text.includes(term));
  const tooFast = matched.length > 0 && state.affection < 72;
  return { tooFast, terms: matched };
}

function getCurrentStage() {
  return relationshipStages
    .slice()
    .reverse()
    .find((stage) => state.affection >= stage.min);
}

function getIdleMs() {
  const lastRealMessage = state.messages
    .slice()
    .reverse()
    .find((message) => !message.transient && !message.text.startsWith("AI 연결 오류:"));

  return lastRealMessage?.at ? Date.now() - lastRealMessage.at : Number.POSITIVE_INFINITY;
}

function getReplyTiming(text, idleMs = 0) {
  const emotional = ["힘들", "우울", "외로", "보고", "좋아", "사랑", "미안", "화나", "서운"].some((word) => text.includes(word));
  const longText = text.length > 35;
  const longSilence = idleMs >= 30 * 60 * 1000;
  const shortSilence = idleMs >= 10 * 60 * 1000;

  return {
    firstDelay: getInitialReplyDelay({ longSilence, shortSilence }),
    secondDelay: emotional || longText ? randomBetween(2200, 5200) : randomBetween(1000, 2600),
  };
}

function getInitialReplyDelay({ longSilence, shortSilence }) {
  if (longSilence) return pickLongSilenceDelay();
  if (shortSilence) return randomBetween(5000, 30000);
  return randomBetween(750, 1700);
}

function pickLongSilenceDelay() {
  const roll = Math.random();
  if (roll < 0.52) return randomBetween(5000, 25000);
  if (roll < 0.80) return randomBetween(25000, 90000);
  if (roll < 0.94) return randomBetween(90000, 240000);
  return randomBetween(240000, 600000);
}

function randomBetween(min, max) {
  return Math.floor(min + Math.random() * (max - min));
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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
      scenario: state.scenarioContext,
      settings,
      boundary: pendingBoundary,
      history: buildConversationHistory(userText),
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.reply) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  pendingBoundary = { tooFast: false, terms: [] };
  return String(data.reply).trim();
}

function buildConversationHistory(currentText) {
  const normalizedCurrent = currentText.trim();
  return state.messages
    .filter((message) => !message.transient && !message.text.startsWith("AI 연결 오류:"))
    .filter((message, index, messages) => {
      const isLatest = index === messages.length - 1;
      return !(isLatest && message.role === "user" && message.text.trim() === normalizedCurrent);
    })
    .slice(-24)
    .map((message) => ({
      role: message.role,
      text: message.text,
      at: message.at,
    }));
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
