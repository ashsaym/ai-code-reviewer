## Review Context
- Title & branches: {{prHeader}}
- Files inspected: {{fileCount}}
- Guardrails: {{instructions}}
- Rules: {{rulesets}}
- Team notes: {{teamNotes}}

### Output Format
1. `## Pull Request Overview` — 2-3 sentences explaining the intent, key changes, and expected side effects of this PR.

2. `## Findings` — List 3-5 critical findings. For each finding:
   - Format: `**[Severity] path/to/file.ext:lineNumber** — Brief issue description.`
   - Add explanation with `Why:` referencing guardrails/rules and `Fix:` with concrete action.
   - If helpful, include a small code block showing the problematic code (use plain code blocks, not diff syntax).
   - Example: `**[High] src/components/Button.tsx:42** — Missing null check. Why: Could cause runtime error. Fix: Add null guard before accessing property.`

3. `## Recommendations` — 2-3 bullet points suggesting tests or verification steps.

**Important**: Use exact file paths and line numbers. Keep findings actionable and specific. No meta commentary or pleasantries.
