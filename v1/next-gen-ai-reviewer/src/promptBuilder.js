const TASK_LIBRARY = {
  review: {
    label: "Code Review",
    focus: "Identify correctness issues, risky assumptions, missing tests, and architectural concerns. Provide concise, actionable findings with diffs when necessary. IMPORTANT: Always include improvement suggestions in your review.",
    format: "Use markdown headings with bullet lists grouped by severity (High, Medium, Low). Include a '## Suggestions' section with actionable improvements.",
    inline: true // Support inline comments
  },
  summary: {
    label: "PR Summary",
    focus: "Explain the intent, scope, impacted areas, and release risks for product and engineering stakeholders.",
    format: "Respond with short paragraphs and bullet lists. Avoid code blocks unless quoting critical snippets.",
    inline: false
  },
  suggestions: {
    label: "Improvement Suggestions",
    focus: "Offer practical refactors, testing ideas, and developer experience enhancements that can be quickly adopted.",
    format: "Respond with numbered suggestions. For each one include rationale and proposed code adjustments in fenced diff blocks when appropriate.",
    inline: true // Support inline comments
  },
  description: {
    label: "PR Description",
    focus: "Generate a comprehensive pull request description that clearly explains what changes were made, why they were made, what was tested, and any relevant context. Include a summary of changes, type of change, related issues if evident from commits, and testing notes.",
    format: "Use markdown with clear sections: ## Description, ## Type of Change (with checkboxes), ## Changes Made (bullet list), ## Testing, ## Additional Notes (if needed). Be concise but thorough.",
    inline: false
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
  if (["description", "desc", "pr-description", "generate-description"].includes(value)) {
    return "description";
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

function buildInlineReviewPrompt({ task, prMetadata, files, maxDiffChars = 12000, additionalContext = "", guidance = {} }) {
  const normalizedTask = normalizeTask(task);
  const libraryEntry = TASK_LIBRARY[normalizedTask];

  if (!libraryEntry.inline) {
    return null; // Task doesn't support inline reviews
  }

  const author = prMetadata.user?.login || "unknown";
  const prHeader = `Title: ${prMetadata.title}\nAuthor: ${author}\nBase: ${prMetadata.base?.ref} -> ${prMetadata.head?.ref}`;
  const bodySection = sanitizeMultiline(prMetadata.body || "No description provided.");

  const instructions = guidance.instructions ? sanitizeMultiline(guidance.instructions, 8000) : "";
  const rulesets = guidance.rulesets ? sanitizeMultiline(guidance.rulesets, 8000) : "";

  const contextBlock = additionalContext.trim() ? `\n\nTeam Notes:\n${additionalContext.trim()}` : "";

  const guidanceSections = [];
  if (instructions) {
    guidanceSections.push(`Review Instructions:\n${instructions}`);
  }
  if (rulesets) {
    guidanceSections.push(`Rulesets:\n${rulesets}`);
  }

  const repoGuidanceBlock = guidanceSections.length ? `\n\nRepository Guidance:\n${guidanceSections.join("\n\n")}` : "";

  // Format files with line numbers for precise commenting
  const fileSummaries = files.length
    ? files.map((file, index) => {
        const parts = [`${index + 1}. ${file.filename} (${file.status}${file.changes ? `, ±${file.changes}` : ""})`];

        if (file.patch) {
          const diff = file.patch.length > maxDiffChars ? `${file.patch.slice(0, maxDiffChars)}\n... (diff truncated)` : file.patch;
          parts.push("```diff", diff, "```");
        }

        return parts.join("\n");
      }).join("\n\n")
    : "No file changes detected.";

  const jsonSchema = `{
  "reviews": [
    {
      "path": "string (exact file path from the diff)",
      "line": number (line number in the new file where issue exists),
      "comment": "string (clear explanation of the issue)",
      "suggestion": "string (optional: exact code to replace the problematic line(s))",
      "severity": "string (high, medium, or low)"
    }
  ],
  "summary": "string (optional: brief overall assessment)"
}`;

  return `You are an elite software reviewer performing a GitHub-style inline code review.

Task: ${libraryEntry.label}
Focus: ${libraryEntry.focus}${contextBlock}${repoGuidanceBlock}

Pull Request Overview:
${prHeader}

PR Description:
${bodySection}

Changed Files (${files.length}):
${fileSummaries}

CRITICAL INSTRUCTIONS:
1. Analyze each changed file and identify specific issues on specific lines
2. For each issue, note the EXACT file path and line number from the diff
3. Provide clear, actionable comments explaining what's wrong
4. When possible, provide a "suggestion" with the exact corrected code
5. Assign severity: "high" (bugs, security), "medium" (code quality), "low" (style, minor improvements)
6. Return ONLY valid JSON matching this schema:

${jsonSchema}

EXAMPLE OUTPUT:
{
  "reviews": [
    {
      "path": "src/utils/helper.js",
      "line": 42,
      "comment": "Syntax error: Extraneous comma after the closing parenthesis. This will cause a compilation error.",
      "suggestion": "export const helper = () => {\\n  return true;\\n};",
      "severity": "high"
    },
    {
      "path": "src/components/Button.tsx",
      "line": 15,
      "comment": "Missing null check for props.onClick. This could cause runtime errors if onClick is not provided.",
      "suggestion": "onClick={props.onClick ?? (() => {})}",
      "severity": "medium"
    }
  ],
  "summary": "Found 2 issues: 1 syntax error and 1 potential runtime error."
}

Return ONLY the JSON object. No markdown formatting, no code fences, no additional text.`;
}

function buildPrompt({ task, prMetadata, files, maxDiffChars = 12000, additionalContext = "", guidance = {} }) {
  const normalizedTask = normalizeTask(task);
  const libraryEntry = TASK_LIBRARY[normalizedTask];

  const author = prMetadata.user?.login || "unknown";
  const prHeader = `Title: ${prMetadata.title}\nAuthor: ${author}\nBase: ${prMetadata.base?.ref} -> ${prMetadata.head?.ref}`;
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
    additionalContext: additionalContext.trim(),
    author
  };

  if (template) {
    return renderTemplate(template, templateContext);
  }

  return `You are an elite software reviewer who produces reliable, reproducible output.\nTask: ${libraryEntry.label}\nPrimary focus: ${libraryEntry.focus}\nPreferred format: ${libraryEntry.format}${contextBlock}${repoGuidanceBlock}\n\nPull Request Overview:\n${prHeader}\n\nPR Description:\n${bodySection}\n\nChanged Files (${files.length}):\n${fileSummaries}\n\nPlease respond with ${libraryEntry.label.toLowerCase()} content only. Avoid pleasantries and make every sentence actionable.`;
}

module.exports = {
  buildPrompt,
  buildInlineReviewPrompt,
  normalizeTask,
  TASK_LIBRARY
};
