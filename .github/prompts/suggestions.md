# Improvement Suggestions: {{taskLabel}}

## Pull Request Context

**PR Information:**
- {{prHeader}}
- **Repository:** {{repository}}

**Description:**
{{prDescription}}

---

## Your Task

Analyze this pull request and provide actionable improvement suggestions that go beyond identifying bugs. Focus on opportunities to make the code better, more maintainable, more performant, or more aligned with best practices.

For each suggestion, use this structure:

### Suggestion Template

**#N. [Category] Suggestion Title**

**Why:** Explain the benefit or problem this addresses
- Reference team guidelines when applicable: {{instructions}}
- Reference repository rules when applicable: {{rulesets}}
- Explain the impact and value

**Current State:** Brief description of how it works now (if applicable)

**Proposed Improvement:**
Provide specific, actionable recommendation with:
- Clear explanation of the change
- Code examples or diffs when helpful
- Pseudocode for complex changes

**Effort Estimate:**
- 🟢 **Small** (< 1 hour): Simple changes, low risk
- 🟡 **Medium** (1-4 hours): Moderate complexity, some testing needed
- 🔴 **Large** (> 4 hours): Significant refactoring, extensive testing

**Priority:**
- ⭐⭐⭐ **High**: Significant impact, should do soon
- ⭐⭐ **Medium**: Good to have, noticeable benefit
- ⭐ **Low**: Nice to have, minor improvement

---

## Suggestion Categories

Focus your suggestions on these areas:

### 🏗️ Architecture & Design
- Better separation of concerns
- Improved modularity
- More appropriate design patterns
- Clearer abstractions
- Reduced coupling

### 🚀 Performance & Optimization
- Algorithm improvements
- Caching opportunities
- Reduced I/O operations
- Better resource usage
- Scalability enhancements

### 🛡️ Security & Safety
- Additional input validation
- Better error handling
- Improved data protection
- Security hardening
- Defensive programming

### 🧹 Code Quality & Maintainability
- Improved readability
- Better naming
- Reduced complexity
- Elimination of duplication
- Simplified logic

### 🧪 Testing & Reliability
- Additional test scenarios
- Better test organization
- Improved assertions
- Edge case coverage
- Test maintainability

### 📚 Documentation & Developer Experience
- Clearer comments
- Better API documentation
- Improved error messages
- More helpful logging
- Better tooling

---

## Guidelines

**DO Focus On:**
- ✅ Quality-of-life improvements that make code easier to work with
- ✅ Risk-reduction opportunities that prevent future bugs
- ✅ Performance wins with measurable impact
- ✅ Maintainability improvements for long-term health
- ✅ DRY principles - eliminating duplication
- ✅ Best practices from the tech stack
- ✅ Alignment with team standards

**DON'T Focus On:**
- ❌ Minor style nitpicks without functional benefit
- ❌ Premature optimizations that complicate code
- ❌ Subjective preferences without clear reasoning
- ❌ Changes that would require massive refactoring
- ❌ Rewriting working code just to use newer syntax

**When Providing Code Examples:**

```diff
- // Current approach (if showing what to change)
- const data = items.map(i => processItem(i));
- const filtered = data.filter(d => d.isValid);
+ // Improved approach
+ const filtered = items
+   .map(processItem)
+   .filter(item => item.isValid);
```

---

## Context

**Team Guidelines:**
{{instructions}}

**Repository Rules:**
{{rulesets}}

**Changes Summary:**
{{fileSummaries}}

{{#if additionalContext}}
**Additional Context:**
{{additionalContext}}
{{/if}}

---

## Response Format

Number your suggestions (1, 2, 3, ...) and use the template above for each one.

Prioritize suggestions by:
1. **High-impact, low-effort** wins first (quick wins)
2. **High-impact, medium-effort** improvements next
3. **Lower-impact or higher-effort** suggestions last

Aim for **5-10 suggestions** focusing on the most valuable improvements. Quality over quantity—each suggestion should be thoughtful and actionable.

If the code is already excellent, acknowledge that! Say "This PR is well-implemented. Here are some optional enhancements to consider..." and provide 2-3 nice-to-have suggestions.
