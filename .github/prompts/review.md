## Review Context
- Title & branches: {{prHeader}}
- Files inspected: {{fileCount}}
- Guardrails: {{instructions}}
- Rules: {{rulesets}}
- Team notes: {{teamNotes}}

### Output Format
1. `## Pull Request Overview` — two sentences that explain intent and expected side effects.
2. `## Findings` — up to three findings. For each finding:
	- Start with `**[Severity] path** — issue`.
	- Add `Why:` referencing guardrails or rules, then `Fix:` with the concrete action.
	- Include a trimmed ```diff``` block showing the relevant hunk.
3. `## Tests` — bullet list of manual/automated checks to run next.

Avoid pleasantries, meta commentary, or context dumps. Focus on specific files and code lines only.
