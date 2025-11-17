## Improvement Suggestions

Return a numbered list of 2-4 actionable suggestions. Each entry must include:
- `**Title — path/to/file.ext:lineNumber**` to anchor the suggestion with specific file and line.
- `Why:` Explain the benefit, referencing {{instructions}} or {{rulesets}} when applicable.
- `How:` Concrete implementation steps. If the change is simple, include a code block showing the fix (use plain code blocks, not diff syntax).
- `Effort:` S (Small) / M (Medium) / L (Large).

Example format:
```
1. **Extract reusable validation — src/utils/validator.js:45**
   Why: Reduces code duplication and improves maintainability.
   How: Create a shared validation function and import it in both components.
   Effort: M
```

Finish with a `## Next Steps` section suggesting 2-3 validation actions.
