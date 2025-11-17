function buildMockContent(task, prompt) {
  if (task === "summary") {
    return [
      "**Intent**: Highlighted the main goals of the PR based on repository instructions.",
      "**Impact**: Confirms touched files and expected side effects.",
      "**Risk**: Notes any gaps the reviewer should keep in mind.",
      "**Next steps**: Encourage a human follow-up if anything looks risky.",
      "\n> Mock context snippet:\n",
      "```",
      `${prompt.slice(0, 500)}`,
      "```"
    ].join("\n");
  }

  if (task === "suggestions") {
    return [
      "1. **Improve tests** (Effort: M)\n   - Why: Increase coverage for newly touched modules.\n   - How: Add regression tests mirroring the described behavior.",
      "2. **Refine prompts** (Effort: S)\n   - Why: Aligns with repo instructions and rulesets.\n   - How: Update `.github/prompts/*` to reflect latest checklist.",
      "\n> Mock context snippet:\n",
      "```",
      `${prompt.slice(0, 500)}`,
      "```"
    ].join("\n");
  }

  return [
    "### High",
    "- Placeholder finding demonstrating the review flow. Replace with provider outputs in production.",
    "\n### Medium",
    "- Ensure new guidance files remain synced with team expectations.",
    "\n### Low",
    "- Minor formatting suggestions to keep prompts tidy.",
    "\n### Tests",
    "- Mock provider cannot infer tests; please confirm manually.",
    "\n### Release impact",
    "- Low risk (mock provider).",
    "\n> Mock context snippet:\n",
    "```",
    `${prompt.slice(0, 500)}`,
    "```"
  ].join("\n");
}

async function runMock({ task, prompt }) {
  return {
    provider: "Mock",
    model: "mock-provider",
    content: buildMockContent(task, prompt)
  };
}

module.exports = {
  runMock
};
