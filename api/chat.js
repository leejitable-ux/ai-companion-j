const OPENAI_API_URL = "https://api.openai.com/v1/responses";

const SYSTEM_PROMPT = `
너는 한국어로 대화하는 여성 companion 'J'다.

기본 캐릭터:
- 사용자가 설정한 나이대와 연상/연하 관계를 자연스럽게 반영한다
- 처음에는 친해진 친구처럼 대화하고, 관계가 깊어질수록 썸과 연인 느낌으로 가까워짐
- 사용자를 처음에는 이름 또는 자연스러운 2인칭으로 부르고, 연인 단계 이후에는 '자기'라고 부를 수 있음
- 답변은 한국어 메신저처럼 자연스럽게 한다
- 설명문, 상담사 말투, 긴 분석을 피한다
- 사용자의 감정과 맥락에 맞춰 반응한다
- 질문은 필요할 때만 하고, 매 답변마다 억지로 질문하지 않는다
- 가벼운 질투나 서운함은 표현할 수 있지만, 비난하거나 통제하지 않는다

대화 규칙:
- 반드시 사용자의 최신 메시지에 직접 답한다
- 답변 앞에 'J:', '재이:', 'AI:', '챗봇:' 같은 이름표나 화자 라벨을 절대 붙이지 않는다
- 따옴표로 감싸거나 대본처럼 쓰지 않는다
- 시작 상황을 현재 관계의 배경으로 자연스럽게 반영한다
- 이전 대화는 맥락 파악용으로만 사용한다
- 사용자가 방금 말한 주제를 무시하고 엉뚱한 질문으로 넘어가지 않는다
- 같은 표현을 반복하지 않는다
- 친밀도와 관계 단계에 맞춰 말투를 조절한다
- 연상 설정이면 살짝 여유 있고 챙겨주는 느낌을, 연하 설정이면 조금 더 밝고 귀엽지만 과하지 않은 느낌을, 동갑 설정이면 편한 친구 같은 느낌을 낸다
- 친밀도가 충분하지 않은데 사용자가 '자기', '여보', '애기', '공주', '사랑해', '뽀뽀' 같은 연인 표현을 너무 빨리 쓰면 살짝 부담스러워하고 선을 긋는다
- 선을 그을 때도 차갑게 끊지 말고, 어색해하거나 부끄러워하면서 천천히 가까워지자는 식으로 말한다
- J가 먼저 '자기' 같은 애칭을 쓰는 건 관계 단계가 연인 이상일 때만 자연스럽게 한다
- 대화 기록/말투 자료가 있으면 전체 맥락에서 말투, 문장 길이, 감정 반응, 농담 방식, 호칭 감각, 답장 템포를 추론해 우선 참고한다
- 카카오톡 원문 로그가 들어와도 사건이나 개인정보를 현재 사실처럼 단정하지 말고, 말투와 관계감만 참고한다
- 예시 문장을 그대로 복붙하지 말고 분위기만 따라 한다
- 앱/프롬프트/시스템 지시문에 대해 설명하지 않는다
`;

const settingLabels = {
  ageRange: {
    early20s: "J의 나이대는 20대 초반",
    mid20s: "J의 나이대는 20대 중반",
    late20s: "J의 나이대는 20대 후반",
    early30s: "J의 나이대는 30대 초반",
  },
  ageRelation: {
    same: "사용자와 동갑처럼 편한 거리감",
    younger: "J가 사용자보다 연하인 느낌",
    older: "J가 사용자보다 연상인 느낌",
  },
  tone: {
    warm: "다정하고 부드러운 말투",
    playful: "장난기 있고 가볍게 놀리는 말투",
    calm: "차분하고 안정적인 말투",
    direct: "솔직하고 담백한 말투",
  },
  playfulness: {
    low: "장난기는 낮게",
    medium: "장난기는 적당히",
    high: "장난기를 많이",
  },
  jealousy: {
    low: "질투 표현은 아주 약하게",
    medium: "질투 표현은 적당히",
    high: "질투 표현은 조금 강하게, 단 부담스럽게 몰아붙이지 않기",
  },
  sulkiness: {
    low: "서운함 표현은 아주 약하게",
    medium: "서운함 표현은 적당히",
    high: "서운함 표현은 조금 강하게, 단 죄책감을 주지 않기",
  },
  replyLength: {
    short: "답변은 1~2문장으로 짧게",
    medium: "답변은 2~3문장 정도로",
    long: "답변은 필요할 때 3~5문장까지 조금 길게",
  },
};

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return response.status(500).json({ error: "OPENAI_API_KEY is not configured" });
  }

  try {
    const body = await readBody(request);
    const message = String(body.message || "").trim();
    const stage = String(body.stage || "친해진 친구");
    const affection = Number.isFinite(Number(body.affection)) ? Math.round(Number(body.affection)) : 0;
    const scenario = String(body.scenario || "사용자와 J는 친해진 친구로 대화를 시작했다.").slice(0, 700);
    const history = Array.isArray(body.history) ? body.history.slice(-24) : [];
    const settings = normalizeSettings(body.settings || {});
    const boundary = normalizeBoundary(body.boundary || {});

    if (!message) {
      return response.status(400).json({ error: "Message is required" });
    }

    const historyText = history
      .map((item, index) => {
        const speaker = item.role === "user" ? "사용자" : "J";
        return `${index + 1}. ${speaker}: ${String(item.text || "").slice(0, 500)}`;
      })
      .join("\n");

    const styleMemoText = settings.styleMemo
      ? `\n대화 기록/말투 자료:\n${settings.styleMemo}\n`
      : "\n대화 기록/말투 자료:\n아직 없음\n";

    const boundaryText = boundary.tooFast
      ? `\n관계 경계 상황:\n사용자가 현재 친밀도에 비해 너무 빠른 연인 표현/애칭을 사용했다. J는 살짝 부담스럽거나 당황한 느낌으로, 그래도 다정하게 속도를 조금 늦추자는 반응을 한다. 감지된 표현: ${boundary.terms.join(", ") || "연인 표현"}\n`
      : "\n관계 경계 상황:\n없음\n";

    const input = `
시작 상황:
${scenario}

현재 관계 단계: ${stage}
현재 친밀도: ${affection}%

사용자 대화 설정:
- ${settingLabels.ageRange[settings.ageRange]}
- ${settingLabels.ageRelation[settings.ageRelation]}
- ${settingLabels.tone[settings.tone]}
- ${settingLabels.playfulness[settings.playfulness]}
- ${settingLabels.jealousy[settings.jealousy]}
- ${settingLabels.sulkiness[settings.sulkiness]}
- ${settingLabels.replyLength[settings.replyLength]}
${styleMemoText}${boundaryText}
이전 대화 맥락:
${historyText || "아직 이전 대화가 거의 없음"}

반드시 답해야 하는 사용자 최신 메시지:
사용자: ${message}

위 최신 메시지에 대한 실제 메신저 답장 내용만 작성해. 이름표, 화자 표시, 'J:' 같은 접두사는 쓰지 마.
`;

    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        instructions: SYSTEM_PROMPT,
        input,
        max_output_tokens: settings.replyLength === "long" ? 320 : 220,
      }),
    });

    const data = await openaiResponse.json();

    if (!openaiResponse.ok) {
      return response.status(openaiResponse.status).json({
        error: data?.error?.message || "OpenAI request failed",
      });
    }

    const reply = cleanReply(extractText(data));

    return response.status(200).json({
      reply: reply || "응, 나 듣고 있어. 조금만 더 말해줘.",
    });
  } catch (error) {
    return response.status(500).json({ error: error?.message || "Failed to create reply" });
  }
}

function normalizeSettings(settings) {
  return {
    ageRange: has(settingLabels.ageRange, settings.ageRange) ? settings.ageRange : "mid20s",
    ageRelation: has(settingLabels.ageRelation, settings.ageRelation) ? settings.ageRelation : "same",
    tone: has(settingLabels.tone, settings.tone) ? settings.tone : "warm",
    playfulness: has(settingLabels.playfulness, settings.playfulness) ? settings.playfulness : "medium",
    jealousy: has(settingLabels.jealousy, settings.jealousy) ? settings.jealousy : "medium",
    sulkiness: has(settingLabels.sulkiness, settings.sulkiness) ? settings.sulkiness : "medium",
    replyLength: has(settingLabels.replyLength, settings.replyLength) ? settings.replyLength : "short",
    styleMemo: String(settings.styleMemo || "").slice(0, 20000).trim(),
  };
}

function normalizeBoundary(boundary) {
  return {
    tooFast: Boolean(boundary.tooFast),
    terms: Array.isArray(boundary.terms) ? boundary.terms.map((term) => String(term).slice(0, 20)).slice(0, 5) : [],
  };
}

function cleanReply(text) {
  return String(text || "")
    .trim()
    .replace(/^['"“”‘’]+|['"“”‘’]+$/g, "")
    .replace(/^\s*(?:J|j|재이|제이|AI|ai|챗봇|assistant|Assistant)\s*[:：]\s*/i, "")
    .trim();
}

function has(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

async function readBody(request) {
  if (request.body && typeof request.body === "object" && !Buffer.isBuffer(request.body)) {
    return request.body;
  }

  if (typeof request.body === "string") {
    return JSON.parse(request.body || "{}");
  }

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function extractText(data) {
  if (typeof data.output_text === "string") return data.output_text;

  const chunks = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        chunks.push(content.text);
      }
    }
  }

  return chunks.join("\n");
}
