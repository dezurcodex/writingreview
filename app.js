const styleGuide = {
  summary: "출간 원고(PDF) 기반의 담백하고 따뜻한 1인칭 에세이 문체",
  source: "사용자가 제공한 출간본 PDF 문체",
  editingPolicy: {
    default: "최소 수정",
    exception: "글의 흐름이 깨지거나 의미 전달이 불명확할 때만 과감 수정",
  },
  priorities: [
    "문장 의미 손상 없이 오타/띄어쓰기/문법 교정",
    "원문 문장 호흡과 어조를 최대한 보존",
    "문단 흐름을 해치지 않는 자연스러운 연결",
    "독자가 편안하게 읽는 따뜻한 온도 유지",
  ],
};

const quotes = [
  { text: "글을 쓴다는 것은 침묵 속에서 목소리를 만드는 일이다.", by: "어슐러 K. 르 귄" },
  { text: "완벽한 첫 문장은 없다. 좋은 퇴고만 있을 뿐이다.", by: "어니스트 헤밍웨이" },
  { text: "명료함은 친절이다.", by: "윌리엄 진서" },
  { text: "좋은 문장은 독자에게 길을 잃지 않게 한다.", by: "조지 오웰" },
  { text: "진실한 경험은 가장 강한 문체를 만든다.", by: "조앤 디디온" },
  { text: "짧게 쓰는 일은 길게 생각하는 일이다.", by: "블레즈 파스칼" },
  { text: "문장은 리듬이다. 의미는 그 리듬을 타고 온다.", by: "버지니아 울프" },
];

const el = {
  dailyQuote: document.getElementById("dailyQuote"),
  draftInput: document.getElementById("draftInput"),
  proofreadBtn: document.getElementById("proofreadBtn"),
  copyRevisedBtn: document.getElementById("copyRevisedBtn"),
  copyStatus: document.getElementById("copyStatus"),
  revisedView: document.getElementById("revisedView"),
  changeLogBody: document.getElementById("changeLogBody"),
  editorOpinion: document.getElementById("editorOpinion"),
  makePromptsBtn: document.getElementById("makePromptsBtn"),
  promptChatgpt: document.getElementById("promptChatgpt"),
  promptCanva: document.getElementById("promptCanva"),
  promptGemini: document.getElementById("promptGemini"),
  promptGrok: document.getElementById("promptGrok"),
  copyChatgptBtn: document.getElementById("copyChatgptBtn"),
  copyCanvaBtn: document.getElementById("copyCanvaBtn"),
  copyGeminiBtn: document.getElementById("copyGeminiBtn"),
  copyGrokBtn: document.getElementById("copyGrokBtn"),
  imageStatus: document.getElementById("imageStatus"),
};

let latestRevisedPlain = "";

renderDailyQuote();

el.proofreadBtn.addEventListener("click", async () => {
  const original = el.draftInput.value.trim();
  if (!original) {
    alert("교정할 원문을 입력해 주세요.");
    return;
  }
  const local = runLocalProofread(original);
  const revised = local.revisedText;
  const changeLog = local.changeLog;
  const opinion = buildEditorOpinionLocal(revised, styleGuide);

  latestRevisedPlain = revised;
  const marked = markChangesAsBold(original, revised);
  el.revisedView.innerHTML = markdownToHtml(marked);
  renderChangeLog(changeLog);
  renderEditorOpinion(opinion);
});

el.copyRevisedBtn.addEventListener("click", async () => {
  if (!latestRevisedPlain.trim()) {
    alert("복사할 교정 결과가 없습니다. 먼저 교정을 실행해 주세요.");
    return;
  }
  await navigator.clipboard.writeText(latestRevisedPlain);
  el.copyStatus.textContent = "교정결과를 복사했습니다.";
});

el.makePromptsBtn.addEventListener("click", () => {
  const original = el.draftInput.value.trim();
  if (!original) {
    alert("먼저 원문을 입력해 주세요.");
    return;
  }

  const prompts = buildImagePrompts(original);
  el.promptChatgpt.value = prompts.chatgpt;
  el.promptCanva.value = prompts.canva;
  el.promptGemini.value = prompts.gemini;
  el.promptGrok.value = prompts.grok;
  el.imageStatus.textContent = "서비스별 이미지 프롬프트를 생성했습니다.";
});

el.copyChatgptBtn.addEventListener("click", () => copyPrompt(el.promptChatgpt.value));
el.copyCanvaBtn.addEventListener("click", () => copyPrompt(el.promptCanva.value));
el.copyGeminiBtn.addEventListener("click", () => copyPrompt(el.promptGemini.value));
el.copyGrokBtn.addEventListener("click", () => copyPrompt(el.promptGrok.value));

function renderDailyQuote() {
  const today = new Date();
  const dayKey = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const idx = Math.floor(dayKey / 86400000) % quotes.length;
  const q = quotes[idx];
  el.dailyQuote.textContent = `“${q.text}” — ${q.by}`;
}

function runLocalProofread(original) {
  const changes = [];
  let revised = original;

  const ruleSet = [
    { from: /할수/g, to: "할 수", reason: "띄어쓰기 교정" },
    { from: /될수/g, to: "될 수", reason: "띄어쓰기 교정" },
    { from: /없을수/g, to: "없을 수", reason: "띄어쓰기 교정" },
    { from: /\s{2,}/g, to: " ", reason: "중복 공백 정리" },
    { from: /([,.!?])([^\s\n])/g, to: "$1 $2", reason: "문장부호 뒤 띄어쓰기" },
  ];

  for (const rule of ruleSet) {
    const before = revised;
    revised = revised.replace(rule.from, rule.to);
    if (before !== revised) {
      changes.push({
        change: `${String(rule.from)} -> ${rule.to}`,
        reason: rule.reason,
      });
    }
  }

  if (!changes.length) {
    changes.push({ change: "구조/표현 유지", reason: "로컬 규칙 기준에서 수정 필요 항목이 크지 않음" });
  }

  return {
    revisedText: revised,
    changeLog: changes,
  };
}


function markChangesAsBold(original, revised) {
  const a = tokenize(original);
  const b = tokenize(revised);
  const table = lcsTable(a, b);
  const operations = backtrackDiff(a, b, table);

  let out = "";
  for (const op of operations) {
    if (op.type === "equal") out += op.value;
    else if (op.type === "insert") out += `**${op.value}**`;
  }
  return out;
}

function tokenize(text) {
  return text.split(/(\s+|[,.!?"'“”‘’()\[\]{}<>:;\n])/).filter((t) => t !== "");
}

function lcsTable(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const table = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      if (a[i - 1] === b[j - 1]) table[i][j] = table[i - 1][j - 1] + 1;
      else table[i][j] = Math.max(table[i - 1][j], table[i][j - 1]);
    }
  }
  return table;
}

function backtrackDiff(a, b, table) {
  let i = a.length;
  let j = b.length;
  const ops = [];

  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      ops.push({ type: "equal", value: b[j - 1] });
      i -= 1;
      j -= 1;
    } else if (table[i][j - 1] >= table[i - 1][j]) {
      ops.push({ type: "insert", value: b[j - 1] });
      j -= 1;
    } else {
      ops.push({ type: "delete", value: a[i - 1] });
      i -= 1;
    }
  }

  while (j > 0) {
    ops.push({ type: "insert", value: b[j - 1] });
    j -= 1;
  }

  while (i > 0) {
    ops.push({ type: "delete", value: a[i - 1] });
    i -= 1;
  }

  return ops.reverse();
}

function markdownToHtml(markdown) {
  return escapeHtml(markdown).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderChangeLog(changeLog) {
  el.changeLogBody.innerHTML = "";
  changeLog.forEach((item, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${idx + 1}</td><td>${escapeHtml(item.change || "-")}</td><td>${escapeHtml(item.reason || "-")}</td>`;
    el.changeLogBody.appendChild(tr);
  });
}

function buildEditorOpinionLocal(revisedText, styleGuide) {
  const len = revisedText.length;
  return {
    debate: [
      { role: "출판사 편집자", stance: "문법/띄어쓰기 오류만 우선 수정하고 어휘 치환은 최소화하자." },
      { role: "베스트셀러 작가", stance: "원문의 고유 문장 리듬은 유지하고 흐름이 끊기는 대목만 손보자." },
      { role: "에세이 작가", stance: "출간본의 담백한 온도를 지키면서 감정선만 선명히 정돈하자." },
      { role: "출판사 대표", stance: "독자 접근성은 올리되 작가 고유 문체 보존을 최우선으로 하자." },
    ],
    consensus: `네 전문가가 논쟁한 결과, 최소 수정 원칙을 기본으로 하고 흐름이 무너진 구간에서만 적극 수정하기로 합의했습니다. 전체 분량 ${len}자 기준으로 ${styleGuide.summary}를 유지하도록 확정했습니다.`,
    actionItems: ["맞춤법/띄어쓰기 우선 교정", "문체 보존 후 흐름 문제 구간만 재작성", "출간본 문체의 어조와 리듬 유지"],
  };
}

function renderEditorOpinion(opinion) {
  const normalized = normalizeOpinion(opinion);
  const debateHtml = normalized.debate
    .map((d) => `<div class="debate-item"><div class="role">${escapeHtml(d.role)}</div><div>${escapeHtml(d.stance)}</div></div>`)
    .join("");
  const actionHtml = normalized.actionItems.map((a) => `<li>${escapeHtml(a)}</li>`).join("");

  el.editorOpinion.innerHTML = `
    ${debateHtml}
    <div class="consensus">
      <strong>최종 합의안</strong><br>
      ${escapeHtml(normalized.consensus)}
      <ul>${actionHtml}</ul>
    </div>
  `;
}

function normalizeOpinion(opinion) {
  if (typeof opinion === "string") {
    return {
      debate: [{ role: "편집팀", stance: opinion }],
      consensus: opinion,
      actionItems: ["핵심 문장 우선 배치", "불필요 반복 제거"],
    };
  }

  return {
    debate: Array.isArray(opinion?.debate) ? opinion.debate : [],
    consensus: opinion?.consensus || "합의안이 생성되지 않았습니다.",
    actionItems: Array.isArray(opinion?.actionItems) ? opinion.actionItems : [],
  };
}

function buildImagePrompts(text) {
  const summary = summarizeForImage(text);

  return {
    chatgpt: [
      "Create a warm, emotionally gentle editorial illustration based on this Korean essay.",
      `Core theme: ${summary.theme}`,
      `Mood: ${summary.mood}`,
      `Key elements: ${summary.keywords.join(", ")}`,
      "Style: cinematic natural light, soft grain, human-centered storytelling, no text overlay.",
      "Composition: one clear subject, balanced negative space for blog cover use.",
      "Aspect ratio: 1:1, high detail.",
    ].join(" "),
    canva: [
      "브런치 에세이 커버 이미지.",
      `주제: ${summary.theme}.`,
      `분위기: ${summary.mood}.`,
      `핵심 키워드: ${summary.keywords.join(", ")}.`,
      "따뜻한 색감, 감정이 담긴 인물 중심, 여백 있는 구도, 텍스트 없이 제작.",
    ].join(" "),
    gemini: [
      "한국어 에세이용 감성 커버 이미지 생성.",
      `주제는 '${summary.theme}'이며 톤은 '${summary.mood}'.`,
      `반영 요소: ${summary.keywords.join(", ")}.`,
      "사진과 일러스트 중간 질감, 부드러운 조명, 과장되지 않은 현실감, 텍스트 삽입 금지.",
    ].join(" "),
    grok: [
      "에세이 커버 이미지를 위한 프롬프트.",
      `핵심 주제: ${summary.theme}.`,
      `감정 톤: ${summary.mood}.`,
      `키워드: ${summary.keywords.join(", ")}.`,
      "밝고 세련된 미니멀 무드, 여백을 살린 구도, 인물 중심 서정 이미지, 텍스트 없음.",
    ].join(" "),
  };
}

function summarizeForImage(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  const keywords = pickKeywords(clean);
  const mood = inferMood(clean);
  const theme = inferTheme(clean, keywords);

  return { keywords, mood, theme };
}

function pickKeywords(text) {
  const candidates = ["이혼", "기억", "가족", "위로", "회복", "관계", "일상", "혼자", "다시 시작", "마음", "저녁", "산책", "집"];
  const hits = candidates.filter((word) => text.includes(word));
  if (hits.length >= 4) return hits.slice(0, 4);
  return [...hits, "따뜻한 빛", "고요한 장면", "감정의 여운"].slice(0, 4);
}

function inferMood(text) {
  const warm = ["위로", "따뜻", "고맙", "다정", "괜찮", "회복"];
  const heavy = ["불안", "슬픔", "외로", "이혼", "상처"];
  const warmCount = warm.reduce((a, k) => a + ((text.match(new RegExp(k, "g")) || []).length), 0);
  const heavyCount = heavy.reduce((a, k) => a + ((text.match(new RegExp(k, "g")) || []).length), 0);
  if (warmCount >= heavyCount) return "잔잔하고 따뜻한 희망";
  return "차분하지만 회복으로 향하는 정서";
}

function inferTheme(text, keywords) {
  if (text.includes("이혼")) return "이혼 이후의 삶을 다시 정리해 가는 여정";
  if (keywords.includes("가족")) return "가족과 관계의 결을 이해해 가는 기록";
  return "상처 이후 일상을 회복해 가는 개인적 서사";
}

async function copyPrompt(text) {
  if (!text.trim()) {
    alert("복사할 프롬프트가 없습니다.");
    return;
  }
  await navigator.clipboard.writeText(text);
}
