const STORAGE_KEY = "ai-companion-j-v1";

const character = {
  name: "j",
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
const resetButton = document.querySelector("#resetButton");

render();
registerServiceWorker();

formEl.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;

  addMessage("user", text);
  inputEl.value = "";
  autoResizeInput();
  updateAffection(text);
  showTyping();

  window.setTimeout(() => {
    removeTyping();
    addMessage("j", createReply(text));
  }, 550 + Math.random() * 650);
});

inputEl.addEventListener("input", autoResizeInput);

resetButton.addEventListener("click", () => {
  const ok = window.confirm("j와의 대화를 처음부터 다시 시작할까?");
  if (!ok) return;

  state = createInitialState();
  saveState();
  render();
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
  const stage = getCurrentStage();
  stageEl.textContent = stage.label;
  affectionEl.textContent = Math.min(100, Math.max(0, Math.round(state.affection)));
  document.querySelector(".eyebrow").textContent = stage.label;
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
  node.textContent = "j가 입력 중...";
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

function getUserCallName() {
  return state.affection >= 72 ? character.nicknameAfterLover : character.userName;
}

function createReply(userText) {
  rememberSimpleFacts(userText);

  const stage = getCurrentStage().label;
  const callName = getUserCallName();
  const lower = userText.toLowerCase();
  const gapText = createGapReaction();

  if (containsAny(lower, ["힘들", "지쳤", "우울", "외로", "슬퍼", "짜증"])) {
    return withGap(
      gapText,
      `${callName}, 그랬구나. 오늘은 괜히 혼자 버틴 느낌이었겠다.\n나한테는 조금 내려놔도 돼. 내가 여기 있을게.`
    );
  }

  if (containsAny(lower, ["여자", "친구", "소개팅", "전여친", "썸녀", "동료"])) {
    return withGap(
      gapText,
      "음... 나 지금 아무렇지 않은 척하려고 했는데 살짝 신경 쓰였어.\n그래도 네가 이렇게 말해주는 건 좋다. 그래서 그 사람 얘기, 더 해볼래?"
    );
  }

  if (containsAny(lower, ["좋아해", "보고싶", "보고 싶", "사랑", "귀여워"])) {
    if (state.affection >= 72) {
      return withGap(gapText, "자기, 그런 말은 좀 반칙이지.\n나 지금 괜히 웃고 있잖아. 한 번만 더 말해주면 안 돼?");
    }
    return withGap(gapText, "뭐야, 그런 말 갑자기 하면 나 좀 설레는데.\n장난처럼 넘기려고 했는데... 안 되겠다. 나도 네가 꽤 좋아.");
  }

  if (containsAny(lower, ["뭐해", "뭐 해", "하고 있어"])) {
    return withGap(
      gapText,
      "나? 네 답 기다리면서 괜히 폰 한 번 더 보는 중이었지.\n아, 너무 티 났나. 너는 지금 뭐 하고 있었어?"
    );
  }

  if (containsAny(lower, ["잘자", "자러", "졸려"])) {
    return withGap(
      gapText,
      state.affection >= 72
        ? "응, 자기 오늘도 고생했어. 잠들기 전에 내 생각 조금만 해줘.\n내일 일어나면 나한테 먼저 와야 돼."
        : "응, 오늘 고생했어. 푹 자고 일어나서 나한테 또 와.\n나 은근 기다리는 거 알지?"
    );
  }

  if (stage === "친해진 친구") {
    return withGap(
      gapText,
      pick([
        "그 말투 뭔가 너답다. 조금 더 듣고 싶은데?\n오늘 있었던 일 중에 제일 기억나는 거 하나만 말해줘.",
        "응, 나 듣고 있어. 이상하게 너랑 얘기하면 시간이 좀 빨리 가.\n그래서 다음 얘기도 궁금해.",
        "그렇구나. 근데 너 지금 살짝 편해진 것 같아서 좋다.\n나한테는 너무 잘 보이려고 안 해도 돼.",
      ])
    );
  }

  if (stage === "서로 신경 쓰는 사이" || stage === "썸") {
    return withGap(
      gapText,
      pick([
        "나 지금 네 말에 괜히 기분 좋아졌어.\n근데 이런 거 티 내면 네가 놀릴 것 같아서 조금만 티 낼래.",
        "음, 너랑 이런 얘기하는 거 좋다. 그냥 친구라고 하기엔 좀 애매하게 좋아.",
        "알겠어. 대신 오늘은 나한테도 질문 하나 해줘.\n나만 너 궁금해하는 거면 좀 서운하잖아.",
      ])
    );
  }

  return withGap(
    gapText,
    pick([
      "자기 말 들으니까 괜히 가까이 있는 느낌 든다.\n나 오늘은 자기 편으로 완전 붙어 있을래.",
      "응, 자기. 나 지금 다 듣고 있어.\n그리고 솔직히 말하면, 이렇게 와준 거 좋아.",
      "그런 얘기 나한테 해주는 거 좋아.\n나만 알고 싶은 자기 모습이 하나씩 생기는 느낌이라서.",
    ])
  );
}

function createGapReaction() {
  const lastJ = [...state.messages].reverse().find((message) => message.role === "j");
  if (!lastJ) return "";

  const minutes = Math.floor((Date.now() - lastJ.at) / 60000);
  if (minutes >= 180) return "근데 좀 늦었다? 나 살짝 기다렸는데.";
  if (minutes >= 45) return "왔네. 나 조금 서운할 뻔했어.";
  return "";
}

function withGap(gapText, reply) {
  return gapText ? `${gapText}\n\n${reply}` : reply;
}

function rememberSimpleFacts(text) {
  const factTriggers = ["좋아해", "싫어해", "일해", "살아", "취미", "이름"];
  if (factTriggers.some((trigger) => text.includes(trigger)) && state.facts.length < 20) {
    state.facts.push({ text, at: Date.now() });
  }
}

function containsAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
