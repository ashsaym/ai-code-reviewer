const TASK_LIBRARY = {
  review: {
    label: "Code Review",
    focus: "Identify correctness issues, risky assumptions, missing tests, and architectural concerns. Provide concise, actionable findings with diffs when necessary.",
    format: "Use markdown headings with bullet lists grouped by severity (High, Medium, Low)."
  },
  summary: {
    label: "PR Summary",
    focus: "Explain the intent, scope, impacted areas, and release risks for product and engineering stakeholders.",
    format: "Respond with short paragraphs and bullet lists. Avoid code blocks unless quoting critical snippets."
  },
  suggestions: {
    label: "Improvement Suggestions",
    focus: "Offer practical refactors, testing ideas, and developer experience enhancements that can be quickly adopted.",
    format: "Respond with numbered suggestions. For each one include rationale and proposed code adjustments in fenced diff blocks when appropriate."
  }
};

function renderTemplate(template, context) {
  if (!template) {
    return "";
  }

  return template.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
    const value = context[key];
    if (value === undefined || value === null) {
      return "";
    }
    return String(value);
  });
}

function normalizeTask(rawValue = "") {
  const value = rawValue.trim().toLowerCase();
  if (["summary", "summarize", "sum"].includes(value)) {
    return "summary";
  }
  if (["suggestions", "suggest", "improve", "improvements"].includes(value)) {
    return "suggestions";
  }
  return "review";
}

function sanitizeMultiline(value = "", limit = 4000) {
  const normalized = value.replace(/\r/g, "").trim();
  if (!normalized) {
    return "(empty)";
  }
  if (normalized.length <= limit) {
    return normalized;
  }
  return `${normalized.slice(0, limit)}...`; // truncated text indicator
}

function formatFile(file, index, maxDiffChars) {
  const summaryParts = [
    `${index + 1}. ${file.filename} (${file.status}${file.changes ? `, ±${file.changes}` : ""})`
  ];

  if (file.patch) {
    const diff = file.patch.length > maxDiffChars ? `${file.patch.slice(0, maxDiffChars)}\n... (diff truncated)` : file.patch;
    summaryParts.push("```diff", diff, "```");
  }

  return summaryParts.join("\n");
}

function buildPrompt({ task, prMetadata, files, maxDiffChars = 12000, additionalContext = "", guidance = {} }) {
  const normalizedTask = normalizeTask(task);
  const libraryEntry = TASK_LIBRARY[normalizedTask];

  const prHeader = `Title: ${prMetadata.title}\nAuthor: ${prMetadata.user?.login || "unknown"}\nBase: ${prMetadata.base?.ref} -> ${prMetadata.head?.ref}`;
  const bodySection = sanitizeMultiline(prMetadata.body || "No description provided.");
  const fileSummaries = files.length
    ? files.map((file, index) => formatFile(file, index, maxDiffChars)).join("\n\n")
    : "No file changes detected (likely metadata-only update).";

  const instructions = guidance.instructions ? sanitizeMultiline(guidance.instructions, 8000) : "";
  const rulesets = guidance.rulesets ? sanitizeMultiline(guidance.rulesets, 8000) : "";
  const ignorePatterns = guidance.ignorePatterns || [];
  const ignoredFiles = guidance.ignoredFiles || [];
  const template = guidance.prompts?.[normalizedTask];

  const contextBlock = additionalContext.trim() ? `\n\nTeam Notes:\n${additionalContext.trim()}` : "";

  const guidanceSections = [];
  if (instructions) {
    guidanceSections.push(`Review Instructions:\n${instructions}`);
  }
  if (rulesets) {
    guidanceSections.push(`Rulesets:\n${rulesets}`);
  }
  if (ignorePatterns.length) {
    guidanceSections.push(
      `Ignore Patterns (${ignorePatterns.length}):\n- ${ignorePatterns.join("\n- ")}`
    );
  }
  if (ignoredFiles.length) {
    guidanceSections.push(
      `Ignored Files (${ignoredFiles.length}):\n- ${ignoredFiles.join("\n- ")}`
    );
  }

  const repoGuidanceBlock = guidanceSections.length ? `\n\nRepository Guidance:\n${guidanceSections.join("\n\n")}` : "";

  const templateContext = {
    task: normalizedTask,
    taskLabel: libraryEntry.label,
    taskFocus: libraryEntry.focus,
    taskFormat: libraryEntry.format,
    prHeader,
    prDescription: bodySection,
    fileSummaries,
    fileCount: files.length,
    instructions,
    rulesets,
    ignorePatterns: ignorePatterns.join(", "),
    ignoredFiles: ignoredFiles.join(", "),
    teamNotes: additionalContext.trim(),
    repositoryGuidance: guidanceSections.join("\n\n"),
    additionalContext: additionalContext.trim()
  };

  if (template) {
    return renderTemplate(template, templateContext);
  }

  return `You are an elite software reviewer who produces reliable, reproducible output.\nTask: ${libraryEntry.label}\nPrimary focus: ${libraryEntry.focus}\nPreferred format: ${libraryEntry.format}${contextBlock}${repoGuidanceBlock}\n\nPull Request Overview:\n${prHeader}\n\nPR Description:\n${bodySection}\n\nChanged Files (${files.length}):\n${fileSummaries}\n\nPlease respond with ${libraryEntry.label.toLowerCase()} content only. Avoid pleasantries and make every sentence actionable.`;
}

module.exports = {
  buildPrompt,
  normalizeTask
};
