const styleGuide = {
  summary: "긴 호흡과 감정선의 균형, 따뜻한 위로형 문체",
  priorities: [
    "문장 의미 손상 없이 오타/띄어쓰기/문법 교정",
    "문단 흐름을 해치지 않는 자연스러운 연결",
    "독자가 편안하게 읽는 따뜻한 온도 유지",
  ],
};

const el = {
  draftInput: document.getElementById("draftInput"),
  model: document.getElementById("model"),
  proofreadBtn: document.getElementById("proofreadBtn"),
  revisedView: document.getElementById("revisedView"),
  changeLogBody: document.getElementById("changeLogBody"),
  editorOpinion: document.getElementById("editorOpinion"),
  makePromptsBtn: document.getElementById("makePromptsBtn"),
  generateImageBtn: document.getElementById("generateImageBtn"),
  imageModel: document.getElementById("imageModel"),
  imageSize: document.getElementById("imageSize"),
  promptChatgpt: document.getElementById("promptChatgpt"),
  promptCanva: document.getElementById("promptCanva"),
  promptGemini: document.getElementById("promptGemini"),
  copyChatgptBtn: document.getElementById("copyChatgptBtn"),
  copyCanvaBtn: document.getElementById("copyCanvaBtn"),
  copyGeminiBtn: document.getElementById("copyGeminiBtn"),
  imageStatus: document.getElementById("imageStatus"),
  generatedImage: document.getElementById("generatedImage"),
};

el.proofreadBtn.addEventListener("click", async () => {
  const original = el.draftInput.value.trim();
  if (!original) {
    alert("교정할 원문을 입력해 주세요.");
    return;
  }

  const model = el.model.value.trim() || "gpt-4.1-mini";

  let revised;
  let changeLog;
  let opinion;

  try {
    const ai = await runAiProofread({ original, model, styleGuide });
    revised = ai.revisedText;
    changeLog = ai.changeLog;
    opinion = ai.editorOpinion;
  } catch (error) {
    console.error(error);
    alert("AI 교정에 실패했습니다. 로컬 교정으로 진행합니다.");
    const local = runLocalProofread(original);
    revised = local.revisedText;
    changeLog = local.changeLog;
    opinion = buildEditorOpinion(revised, styleGuide, true);
  }

  const marked = markChangesAsBold(original, revised);
  el.revisedView.innerHTML = markdownToHtml(marked);
  renderChangeLog(changeLog);
  el.editorOpinion.textContent = opinion;
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
  el.imageStatus.textContent = "서비스별 이미지 프롬프트를 생성했습니다.";
});

el.generateImageBtn.addEventListener("click", async () => {
  const original = el.draftInput.value.trim();
  if (!original) {
    alert("먼저 원문을 입력해 주세요.");
    return;
  }

  if (!el.promptChatgpt.value.trim()) {
    const prompts = buildImagePrompts(original);
    el.promptChatgpt.value = prompts.chatgpt;
    el.promptCanva.value = prompts.canva;
    el.promptGemini.value = prompts.gemini;
  }

  try {
    el.imageStatus.textContent = "이미지 생성 중입니다...";
    const imageUrl = await generateOpenAiImage({
      model: el.imageModel.value.trim() || "gpt-image-1",
      size: el.imageSize.value.trim() || "1024x1024",
      prompt: el.promptChatgpt.value,
    });

    el.generatedImage.src = imageUrl;
    el.generatedImage.style.display = "block";
    el.imageStatus.textContent = "ChatGPT 이미지 생성이 완료되었습니다.";
  } catch (error) {
    console.error(error);
    el.imageStatus.textContent = "이미지 생성에 실패했습니다. API 키/모델/크기를 확인해 주세요.";
  }
});

el.copyChatgptBtn.addEventListener("click", () => copyPrompt(el.promptChatgpt.value));
el.copyCanvaBtn.addEventListener("click", () => copyPrompt(el.promptCanva.value));
el.copyGeminiBtn.addEventListener("click", () => copyPrompt(el.promptGemini.value));

function runLocalProofread(original) {
  const changes = [];
  let revised = original;

  const ruleSet = [
    { from: /할수/g, to: "할 수", reason: "띄어쓰기 교정" },
    { from: /될수/g, to: "될 수", reason: "띄어쓰기 교정" },
    { from: /없을수/g, to: "없을 수", reason: "띄어쓰기 교정" },
    { from: /같아요\./g, to: "같아요.", reason: "문장부호 정리" },
    { from: /\s{2,}/g, to: " ", reason: "중복 공백 정리" },
    { from: /([,.!?])([^\s\n])/g, to: "$1 $2", reason: "문장부호 뒤 띄어쓰기" },
    { from: /\b진짜\b/g, to: "정말", reason: "표현 톤 정돈" },
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
    changes.push({
      change: "구조/표현 유지",
      reason: "로컬 규칙 기준에서 수정 필요 항목이 크지 않음",
    });
  }

  return {
    revisedText: revised,
    changeLog: changes,
  };
}

async function runAiProofread({ original, model, styleGuide }) {
  const prompt = [
    "너는 한국어 문장 교정 편집자다.",
    "요구사항:",
    "1) 오타, 띄어쓰기, 문법 교정",
    "2) 어색한 표현을 전체 흐름에 맞게 다듬기",
    "3) 사람들의 관심을 끌 수 있는 따뜻한 톤으로 개선",
    "4) 결과는 JSON으로만 응답",
    "JSON 스키마:",
    '{"revisedText":"...", "changeLog":[{"change":"...","reason":"..."}], "editorOpinion":"..."}',
    `참고 문체 가이드: ${JSON.stringify(styleGuide)}`,
    `원문:\n${original}`,
  ].join("\n");

  const response = await fetch("/api/proofread", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const text = extractResponseText(data);
  const parsed = parseJsonSafely(text);

  if (!parsed?.revisedText) {
    throw new Error("AI 응답 JSON 파싱 실패");
  }

  return {
    revisedText: parsed.revisedText,
    changeLog: Array.isArray(parsed.changeLog) ? parsed.changeLog : [],
    editorOpinion: parsed.editorOpinion || "편집자 의견이 생성되지 않았습니다.",
  };
}

function parseJsonSafely(text) {
  try {
    return JSON.parse(text);
  } catch (_) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch (_) {
      return null;
    }
  }
}

function extractResponseText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }

  const output = Array.isArray(data?.output) ? data.output : [];
  const chunks = [];

  output.forEach((item) => {
    const content = Array.isArray(item?.content) ? item.content : [];
    content.forEach((part) => {
      if (part?.type === "output_text" && typeof part?.text === "string") {
        chunks.push(part.text);
      }
    });
  });

  return chunks.join("\n");
}

function markChangesAsBold(original, revised) {
  const a = tokenize(original);
  const b = tokenize(revised);
  const table = lcsTable(a, b);
  const operations = backtrackDiff(a, b, table);

  let out = "";
  for (const op of operations) {
    if (op.type === "equal") {
      out += op.value;
    } else if (op.type === "insert") {
      out += `**${op.value}**`;
    }
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
      if (a[i - 1] === b[j - 1]) {
        table[i][j] = table[i - 1][j - 1] + 1;
      } else {
        table[i][j] = Math.max(table[i - 1][j], table[i][j - 1]);
      }
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
  return escapeHtml(markdown)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
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
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${escapeHtml(item.change || "-")}</td>
      <td>${escapeHtml(item.reason || "-")}</td>
    `;
    el.changeLogBody.appendChild(tr);
  });
}

function buildEditorOpinion(revisedText, styleGuide, localMode = false) {
  const len = revisedText.length;
  const opening = localMode ? "로컬 교정 기준" : "AI 교정 기준";
  const styleHint = styleGuide ? `참고 문체: ${styleGuide.summary}` : "문체 기준 미적용";

  return `${opening}에서 문장 안정감과 가독성이 개선되었습니다. ${styleHint}. 전체 분량은 ${len}자이며, 감정선이 급격히 흔들리는 부분은 줄이고 독자가 따라가기 쉬운 온도로 정돈했습니다.`;
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
  };
}

function summarizeForImage(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  const keywords = pickKeywords(clean);
  const mood = inferMood(clean);
  const theme = inferTheme(clean, keywords);

  return {
    keywords,
    mood,
    theme,
  };
}

function pickKeywords(text) {
  const candidates = [
    "이혼",
    "기억",
    "가족",
    "위로",
    "회복",
    "관계",
    "일상",
    "혼자",
    "다시 시작",
    "마음",
    "저녁",
    "산책",
    "집",
  ];

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

async function generateOpenAiImage({ model, size, prompt }) {
  const response = await fetch("/api/image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
    }),
  });

  if (!response.ok) {
    throw new Error(`Image API error: ${response.status}`);
  }

  const data = await response.json();
  const item = Array.isArray(data?.data) ? data.data[0] : null;

  if (item?.b64_json) {
    return `data:image/png;base64,${item.b64_json}`;
  }

  if (item?.url) {
    return item.url;
  }

  throw new Error("No image payload");
}

async function copyPrompt(text) {
  if (!text.trim()) {
    alert("복사할 프롬프트가 없습니다.");
    return;
  }
  await navigator.clipboard.writeText(text);
}
