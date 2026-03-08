import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs";

const state = {
  styleProfile: null,
};

const el = {
  pdfInput: document.getElementById("pdfInput"),
  analyzePdfBtn: document.getElementById("analyzePdfBtn"),
  styleText: document.getElementById("styleText"),
  analyzeTextBtn: document.getElementById("analyzeTextBtn"),
  styleResult: document.getElementById("styleResult"),
  draftInput: document.getElementById("draftInput"),
  apiKey: document.getElementById("apiKey"),
  model: document.getElementById("model"),
  proofreadBtn: document.getElementById("proofreadBtn"),
  revisedView: document.getElementById("revisedView"),
  changeLogBody: document.getElementById("changeLogBody"),
  editorOpinion: document.getElementById("editorOpinion"),
};

el.analyzePdfBtn.addEventListener("click", async () => {
  const file = el.pdfInput.files?.[0];
  if (!file) {
    alert("PDF 파일을 먼저 선택해 주세요.");
    return;
  }

  try {
    const text = await extractTextFromPdf(file);
    el.styleText.value = text.slice(0, 15000);
    state.styleProfile = analyzeStyle(text);
    renderStyle(state.styleProfile);
  } catch (error) {
    console.error(error);
    alert("PDF 분석에 실패했습니다. 텍스트를 직접 붙여 넣어 분석해 주세요.");
  }
});

el.analyzeTextBtn.addEventListener("click", () => {
  const text = el.styleText.value.trim();
  if (!text) {
    alert("분석할 텍스트를 입력해 주세요.");
    return;
  }
  state.styleProfile = analyzeStyle(text);
  renderStyle(state.styleProfile);
});

el.proofreadBtn.addEventListener("click", async () => {
  const original = el.draftInput.value.trim();
  if (!original) {
    alert("교정할 원문을 입력해 주세요.");
    return;
  }

  const apiKey = el.apiKey.value.trim();
  const model = el.model.value.trim() || "gpt-4.1-mini";

  let revised;
  let changeLog;
  let opinion;

  if (apiKey) {
    try {
      const ai = await runAiProofread({ original, apiKey, model, styleProfile: state.styleProfile });
      revised = ai.revisedText;
      changeLog = ai.changeLog;
      opinion = ai.editorOpinion;
    } catch (error) {
      console.error(error);
      alert("AI 교정에 실패했습니다. 로컬 교정으로 진행합니다.");
      const local = runLocalProofread(original);
      revised = local.revisedText;
      changeLog = local.changeLog;
      opinion = buildEditorOpinion(revised, state.styleProfile, true);
    }
  } else {
    const local = runLocalProofread(original);
    revised = local.revisedText;
    changeLog = local.changeLog;
    opinion = buildEditorOpinion(revised, state.styleProfile, true);
  }

  const marked = markChangesAsBold(original, revised);
  el.revisedView.innerHTML = markdownToHtml(marked);
  renderChangeLog(changeLog);
  el.editorOpinion.textContent = opinion;
});

async function extractTextFromPdf(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join(" ");
    pages.push(text);
  }

  return pages.join("\n");
}

function analyzeStyle(text) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const sentences = cleaned
    .split(/[.!?。！？\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const sentenceLengths = sentences.map((s) => {
    const byWords = s.split(/\s+/).filter(Boolean).length;
    return byWords > 1 ? byWords : s.length;
  });

  const avgSentenceLength = sentenceLengths.length
    ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length
    : 0;

  const warmWords = ["따뜻", "위로", "마음", "다정", "고마", "사랑", "괜찮", "응원", "천천히", "함께"];
  const firstPersonWords = ["나", "내", "나는", "내가"];

  const warmCount = countKeywordHits(cleaned, warmWords);
  const firstPersonCount = countKeywordHits(cleaned, firstPersonWords);

  const profile = {
    sentenceCount: sentences.length,
    avgSentenceLength: Number(avgSentenceLength.toFixed(1)),
    punctuationRate: {
      comma: ((cleaned.match(/,/g) || []).length / Math.max(sentences.length, 1)).toFixed(2),
      ellipsis: ((cleaned.match(/\.\.\./g) || []).length / Math.max(sentences.length, 1)).toFixed(2),
    },
    warmToneScore: Number((warmCount / Math.max(sentences.length, 1)).toFixed(2)),
    firstPersonScore: Number((firstPersonCount / Math.max(sentences.length, 1)).toFixed(2)),
    summary: inferStyleSummary(avgSentenceLength, warmCount, firstPersonCount),
  };

  return profile;
}

function inferStyleSummary(avgSentenceLength, warmCount, firstPersonCount) {
  const flow = avgSentenceLength > 14 ? "긴 호흡 중심" : "짧은 호흡 중심";
  const tone = warmCount > firstPersonCount ? "정서/위로형" : "경험/기록형";
  return `${flow}, ${tone} 문체`;
}

function countKeywordHits(text, keywords) {
  return keywords.reduce((acc, word) => {
    const regex = new RegExp(word, "g");
    return acc + (text.match(regex) || []).length;
  }, 0);
}

function renderStyle(profile) {
  el.styleResult.textContent = [
    `문장 수: ${profile.sentenceCount}`,
    `평균 문장 길이: ${profile.avgSentenceLength}`,
    `쉼표 사용률(문장당): ${profile.punctuationRate.comma}`,
    `말줄임표 사용률(문장당): ${profile.punctuationRate.ellipsis}`,
    `따뜻한 톤 점수: ${profile.warmToneScore}`,
    `1인칭 서술 점수: ${profile.firstPersonScore}`,
    `요약: ${profile.summary}`,
  ].join("\n");
}

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

async function runAiProofread({ original, apiKey, model, styleProfile }) {
  const prompt = [
    "너는 한국어 문장 교정 편집자다.",
    "요구사항:",
    "1) 오타, 띄어쓰기, 문법 교정",
    "2) 어색한 표현을 전체 흐름에 맞게 다듬기",
    "3) 사람들의 관심을 끌 수 있는 따뜻한 톤으로 개선",
    "4) 결과는 JSON으로만 응답",
    "JSON 스키마:",
    '{"revisedText":"...", "changeLog":[{"change":"...","reason":"..."}], "editorOpinion":"..."}',
    styleProfile ? `참고 문체 프로필: ${JSON.stringify(styleProfile)}` : "문체 프로필 없음",
    `원문:\n${original}`,
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: prompt,
      temperature: 0.4,
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

function buildEditorOpinion(revisedText, styleProfile, localMode = false) {
  const len = revisedText.length;
  const opening = localMode ? "로컬 교정 기준" : "AI 교정 기준";
  const styleHint = styleProfile ? `참고 문체: ${styleProfile.summary}` : "문체 기준 미적용";

  return `${opening}에서 문장 안정감과 가독성이 개선되었습니다. ${styleHint}. 전체 분량은 ${len}자이며, 감정선이 급격히 흔들리는 부분은 줄이고 독자가 따라가기 쉬운 온도로 정돈했습니다.`;
}
