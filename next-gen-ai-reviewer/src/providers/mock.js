function truncate(text = "", limit = 500) {
  if (!text) {
    return "";
  }
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

function summarizeBody(prMetadata = {}) {
  const body = prMetadata.body || "No description provided.";
  const firstParagraph = body.trim().split(/\n{2,}/)[0] || body.trim();
  return truncate(firstParagraph.replace(/\s+/g, " "), 240);
}

function formatBranches(prMetadata = {}) {
  const base = prMetadata.base?.ref || "base";
  const head = prMetadata.head?.ref || "head";
  return `${head} → ${base}`;
}

function collectFileSnippets(files = [], limit = 3) {
  return files
    .filter((file) => Boolean(file.patch))
    .slice(0, limit)
    .map((file) => ({
      filename: file.filename,
      status: file.status,
      snippet: formatDiff(file.patch)
    }));
}

function formatDiff(patch = "") {
  if (!patch) {
    return null;
  }
  const excerpt = patch.split("\n").slice(0, 20).join("\n");
  return `\`\`\`diff\n${excerpt}\n\`\`\``;
}

function classifyFile(filename = "") {
  if (/\.ya?ml$/i.test(filename)) {
    return "workflow";
  }
  if (filename.endsWith(".md") || filename.includes("prompts/")) {
    return "docs";
  }
  return "code";
}

function issueMessage(category) {
  if (category === "workflow") {
    return "Workflow logic changed; confirm job conditions and secrets still behave on forks.";
  }
  if (category === "docs") {
    return "Guidance updates must mirror the reviewer checklist so humans and automation stay aligned.";
  }
  return "Core logic changed; add regression coverage and verify edge cases.";
}

function fixMessage(category) {
  if (category === "workflow") {
    return "Run the workflow in dry-run/matrix mode and document any required secrets.";
  }
  if (category === "docs") {
    return "Sync the prompts with the latest guardrails and trim redundant text.";
  }
  return "Add unit/integration tests plus a short doc note describing the new path.";
}

function buildReview({ prMetadata, files }) {
  const snippets = collectFileSnippets(files, 3);
  const findings = snippets.length
    ? snippets.map((file, index) => {
        const severity = ["High", "Medium", "Low"][index] || "Info";
        const category = classifyFile(file.filename);
        return [
          `**[${severity}] ${file.filename}** — ${issueMessage(category)}`,
          `Why: Keeps reviewer output aligned with repository guardrails.`,
          `Fix: ${fixMessage(category)}`,
          file.snippet || ""
        ].filter(Boolean).join("\n");
      })
    : ["No file diffs available; confirm the PR still contains code changes."];

  return [
    "## Pull Request Overview",
    `- Title: ${prMetadata?.title || "Unknown"}`,
    `- Branches: ${formatBranches(prMetadata)}`,
    `- Summary: ${summarizeBody(prMetadata)}`,
    "",
    "## Findings",
    findings.join("\n\n"),
    "",
    "## Tests",
    "- npm test",
    "- Re-run the self-test workflow to ensure deterministic output"
  ].join("\n");
}

function buildSummary({ prMetadata, files }) {
  const fileCount = files?.length || 0;
  return [
    "## Pull Request Overview",
    `- Title & branches: ${prMetadata?.title || "Unknown"} (${formatBranches(prMetadata)})`,
    `- Author: ${prMetadata?.user?.login || "unknown"}`,
    `- Files inspected: ${fileCount}`,
    "",
    "### Intent",
    summarizeBody(prMetadata),
    "",
    "### Impact",
    "- Reviewer action, workflow, and documentation files were touched.",
    "- Expect updated prompts plus CI harness tweaks.",
    "",
    "### Risk",
    "- Missing regression tests could allow prompt drift or PR detection regressions.",
    "",
    "### Next Steps",
    "Ask a human reviewer to skim the findings and run the self-test workflow with real provider credentials."
  ].join("\n");
}

function buildSuggestions({ files }) {
  const snippets = collectFileSnippets(files, 3);
  const items = snippets.length ? snippets : [{ filename: "next-gen-ai-reviewer/src/main.js", snippet: null }];

  const suggestions = items.map((file, index) => {
    const category = classifyFile(file.filename);
    const effort = ["M", "S", "S"][index] || "M";
    return [
      `${index + 1}. **${file.filename}**`,
      `   - Why: ${issueMessage(category)}`,
      `   - How: ${fixMessage(category)}`,
      `   - Effort: ${effort}`,
      file.snippet ? `   - Context:\n${file.snippet}` : null
    ].filter(Boolean).join("\n");
  });

  return [
    "## Improvement Ideas",
    suggestions.join("\n\n"),
    "",
    "## Tests",
    "- npm test",
    "- gh workflow run ai-review-selftest.yml --ref <branch>"
  ].join("\n");
}

function buildMockContent({ task, prMetadata, files, prompt }) {
  if (task === "summary") {
    return buildSummary({ prMetadata, files });
  }

  if (task === "suggestions") {
    return buildSuggestions({ files });
  }

  if (prMetadata) {
    return buildReview({ prMetadata, files });
  }

  return truncate(prompt, 500);
}

async function runMock({ task, prompt, prMetadata, files }) {
  return {
    provider: "Mock",
    model: "mock-provider",
    content: buildMockContent({ task, prMetadata, files, prompt })
  };
}

module.exports = {
  runMock
};
