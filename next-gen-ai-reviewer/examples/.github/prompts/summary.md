# Executive Summary: {{taskLabel}}

## Pull Request Overview

**PR Information:**
- {{prHeader}}
- **Repository:** {{repository}}

**Description:**
{{prDescription}}

---

## Your Task

Create an executive summary of this pull request suitable for stakeholders, team leads, and reviewers who need a high-level understanding without diving into code details.

Your summary should cover:

### 1. Intent & Purpose (What & Why)
- What is the primary goal of this PR?
- What problem does it solve or what feature does it add?
- Why is this change necessary or valuable?
- What is the business or technical motivation?

### 2. Scope & Changes (What Changed)
- What are the main components or areas affected?
- What is the size and complexity of the change?
- Are there any breaking changes or API modifications?
- What files or modules were changed?

### 3. Impact & Benefits (Effects)
- Who will benefit from this change?
- What improvements or capabilities does it enable?
- Are there performance improvements or optimizations?
- Does it improve security, reliability, or maintainability?

### 4. Risks & Considerations (Cautions)
- What are the potential risks or concerns?
- Are there areas that need extra attention during review?
- Does this require database migrations, config changes, or deployments?
- Are there dependencies on other changes or systems?
- What could go wrong?

### 5. Testing & Validation (Quality Assurance)
- How has this been tested?
- What test coverage exists?
- Are there integration or e2e tests?
- What testing should reviewers or QA focus on?

### 6. Deployment Considerations (Rollout)
- Can this be deployed independently?
- Are there feature flags or gradual rollout considerations?
- Does this require coordination with other teams?
- Are there rollback procedures if issues arise?

---

## Context

**Team Guidelines:**
{{instructions}}

**Repository Rules:**
{{rulesets}}

**Key Changes:**
{{fileSummaries}}

{{#if additionalContext}}
**Additional Context:**
{{additionalContext}}
{{/if}}

---

## Response Format

Write your summary in clear, concise Markdown. Use:
- **Headers** for each major section
- **Bullet points** for lists
- **Bold text** for emphasis on key points
- **Code references** sparingly, only when necessary for clarity

Keep the summary:
- **Executive-level**: Understandable by non-technical stakeholders
- **Comprehensive**: Covers all important aspects
- **Concise**: 200-400 words typical
- **Actionable**: Clear on what needs to happen next

Think of this as a summary you'd present in a standup meeting or include in release notes.
