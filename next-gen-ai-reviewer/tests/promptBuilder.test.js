const test = require("node:test");
const assert = require("node:assert");

const { buildPrompt, normalizeTask } = require("../src/promptBuilder");

const samplePr = {
  title: "Add authentication middleware",
  body: "Implements JWT auth and updates docs.",
  user: { login: "octocat" },
  base: { ref: "main" },
  head: { ref: "feature/auth" }
};

const sampleFiles = [
  {
    filename: "src/auth.js",
    status: "modified",
    changes: 42,
    patch: "@@ -1,3 +1,9 @@\n+const jwt = require('jsonwebtoken');\n function auth() {}"
  }
];

test("normalizeTask maps synonyms", () => {
  assert.strictEqual(normalizeTask("summarize"), "summary");
  assert.strictEqual(normalizeTask("Suggest"), "suggestions");
  assert.strictEqual(normalizeTask(""), "review");
});

test("buildPrompt includes PR metadata and files", () => {
  const prompt = buildPrompt({
    task: "review",
    prMetadata: samplePr,
    files: sampleFiles,
    maxDiffChars: 1000,
    additionalContext: "Flag security issues first."
  });

  assert.match(prompt, /authentication middleware/);
  assert.match(prompt, /src\/auth\.js/);
  assert.match(prompt, /Flag security issues first/);
});

test("buildPrompt injects repository guidance sections", () => {
  const prompt = buildPrompt({
    task: "review",
    prMetadata: samplePr,
    files: sampleFiles,
    guidance: {
      instructions: "Follow OWASP top 10.",
      rulesets: "Never approve failing tests.",
      ignorePatterns: ["docs/**"],
      ignoredFiles: ["docs/README.md"],
      prompts: {}
    }
  });

  assert.match(prompt, /Review Instructions/);
  assert.match(prompt, /OWASP top 10/);
  assert.match(prompt, /Rulesets/);
  assert.match(prompt, /Ignored Files/);
});

test("buildPrompt honors repository templates", () => {
  const prompt = buildPrompt({
    task: "summary",
    prMetadata: samplePr,
    files: sampleFiles,
    guidance: {
      prompts: {
        summary: "{{taskLabel}} -> {{prHeader}} -> {{instructions}}"
      },
      instructions: "Custom instructions",
      rulesets: "",
      ignorePatterns: [],
      ignoredFiles: []
    }
  });

  assert.strictEqual(
    prompt,
    "PR Summary -> Title: Add authentication middleware\nAuthor: octocat\nBase: main -> feature/auth -> Custom instructions"
  );
});
