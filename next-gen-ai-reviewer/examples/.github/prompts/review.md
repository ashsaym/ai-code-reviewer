# Code Review: {{taskLabel}}

## Pull Request Context

**PR Information:**
- {{prHeader}}
- **Files Analyzed:** {{fileCount}} files
- **Repository:** {{repository}}

**PR Description:**
{{prDescription}}

---

## Review Instructions

{{instructions}}

---

## Repository Rules & Compliance

{{rulesets}}

---

## Your Task

Perform a comprehensive code review of this pull request with the following structure:

### 1. Critical Issues (🔴 Blocking)
Identify any issues that **must** be fixed before merge:
- Security vulnerabilities
- Data corruption risks
- Breaking changes
- Critical bugs

For each critical issue:
- **File & Location**: Specify the exact file and line numbers
- **Description**: Clearly explain what is wrong and why it's critical
- **Impact**: Describe the potential consequences
- **Recommendation**: Provide specific fix suggestions with code examples if possible

### 2. High Priority Issues (🟠 Important)
Issues that should be addressed before merge:
- Significant bugs
- Missing error handling
- Performance problems
- Important test coverage gaps

### 3. Medium Priority Issues (🟡 Should Fix)
Issues that can be addressed now or in follow-up:
- Code quality concerns
- Maintainability issues
- Minor bugs with workarounds
- Documentation gaps

### 4. Low Priority Suggestions (🟢 Nice to Have)
Optional improvements:
- Refactoring opportunities
- Code style improvements
- Minor optimizations

### 5. Test Coverage Analysis
Analyze testing needs:
- **Missing Tests**: What tests should be added?
- **Edge Cases**: What scenarios aren't covered?
- **Test Quality**: Are existing tests sufficient?
- **Regression Risk**: Where could bugs reappear?

### 6. Positive Observations (Optional)
Acknowledge well-written code:
- Clever solutions
- Good architectural decisions
- Excellent test coverage
- Clear documentation

---

## Formatting Guidelines

**For inline code review comments:**
When you identify issues in specific files, format them as JSON for inline comments:

```json
{
  "reviews": [
    {
      "path": "src/example.js",
      "line": 42,
      "body": "**Security Issue**: User input is not validated before use...",
      "severity": "high"
    }
  ]
}
```

**For general review:**
Use clear Markdown formatting with:
- File references: `src/utils/helper.js:45-50`
- Code blocks: Use ` ```language ` for code examples
- Severity labels: 🔴 Critical, 🟠 High, 🟡 Medium, 🟢 Low
- Action items: Clear, specific recommendations

---

## Special Considerations

{{#if ignoredFiles}}
**Note:** The following file patterns were excluded from this review:
{{ignoredFiles}}

If any ignored files contain critical changes, mention this in your "Release Impact" section.
{{/if}}

{{#if additionalContext}}
**Additional Context:**
{{additionalContext}}
{{/if}}

---

## File Summaries

{{fileSummaries}}

---

## Response Format

Structure your review using the sections above (Critical Issues, High Priority, etc.). 

Be **specific**, **actionable**, and **constructive**. Reference exact files and line numbers. Provide code examples for your suggestions when helpful.

Focus on issues that matter for **correctness**, **security**, **performance**, and **maintainability**—in that order.
