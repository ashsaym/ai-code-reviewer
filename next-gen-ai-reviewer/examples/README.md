# AI Code Reviewer Examples

This directory contains comprehensive examples and templates to help you configure and customize the AI Code Reviewer action for your repository.

## 📁 Directory Structure

```
examples/
├── .github/                    # Example repository configuration files
│   ├── prompts/                # Custom AI prompt templates
│   │   ├── review.md           # Code review prompt template
│   │   ├── summary.md          # Summary prompt template
│   │   └── suggestions.md      # Suggestions prompt template
│   ├── review-instructions.md  # AI reviewer behavior guidelines
│   ├── review-rulesets.md      # Mandatory code review rules
│   └── review-ignorelist.txt   # Files/patterns to exclude from review
├── workflows/                  # Example GitHub Actions workflows
│   ├── ai-review-openai.yml    # OpenAI ChatGPT configuration
│   ├── ai-review-claude.yml    # Anthropic Claude configuration
│   └── ai-review-selfhosted.yml # Self-hosted models configuration
└── README.md                   # This file
```

## 🚀 Quick Start

### Step 1: Choose Your AI Provider

Select one of the example workflow files based on your preferred AI provider:

**OpenAI ChatGPT** (`ai-review-openai.yml`)
- Best for: General-purpose code review
- Strengths: Fast, cost-effective with gpt-4o-mini
- Setup time: 5 minutes
- [Get API Key](https://platform.openai.com/api-keys)

**Anthropic Claude** (`ai-review-claude.yml`)
- Best for: Complex code analysis, nuanced reasoning
- Strengths: Thoughtful analysis, catches subtle bugs
- Setup time: 5 minutes
- [Get API Key](https://console.anthropic.com/)

**Self-Hosted Models** (`ai-review-selfhosted.yml`)
- Best for: Data privacy, custom models, cost optimization
- Strengths: Complete control, no data leaves your infrastructure
- Setup time: 30-60 minutes (including model setup)
- Supported: Open WebUI, Ollama, LocalAI, LM Studio

### Step 2: Copy Workflow File

```bash
# Create workflows directory if it doesn't exist
mkdir -p .github/workflows

# Copy your chosen workflow file
cp examples/workflows/ai-review-openai.yml .github/workflows/ai-review.yml

# Or for Claude
cp examples/workflows/ai-review-claude.yml .github/workflows/ai-review.yml

# Or for self-hosted
cp examples/workflows/ai-review-selfhosted.yml .github/workflows/ai-review.yml
```

### Step 3: Configure Secrets

Add your API key to GitHub Secrets:

1. Go to your repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add the appropriate secret:

**For OpenAI:**
```
Name: CHATGPT_API_KEY
Value: sk-proj-xxxxxxxxxxxxx
```

**For Claude:**
```
Name: CLAUDE_API_KEY
Value: sk-ant-xxxxxxxxxxxxx
```

**For Self-Hosted:**
```
Name: OPENWEBUI_URL
Value: https://your-server.com

Name: OPENWEBUI_API_KEY
Value: your-api-key-here
```

### Step 4: (Optional) Customize Behavior

Copy the guidance files to customize AI reviewer behavior:

```bash
# Create .github directory if it doesn't exist
mkdir -p .github/prompts

# Copy guidance files
cp examples/.github/review-instructions.md .github/
cp examples/.github/review-rulesets.md .github/
cp examples/.github/review-ignorelist.txt .github/

# Copy custom prompts (optional)
cp examples/.github/prompts/*.md .github/prompts/
```

### Step 5: Test It

1. Create a test PR
2. Watch the action run
3. Review the AI feedback
4. Adjust configuration as needed

## 📚 Customization Guide

### Guidance Files Explained

#### `review-instructions.md`

Guides the AI reviewer's overall behavior and priorities.

**Use this to:**
- Set review priorities (security first, then performance, then style)
- Define your team's coding standards
- Specify the tone and style of feedback
- Set severity classification rules

**Example customizations:**
```markdown
# Focus Areas
1. Security vulnerabilities (highest priority)
2. Performance issues
3. Test coverage
4. Code maintainability

# Style
- Be direct and concise
- Provide code examples
- Reference file paths with line numbers
```

#### `review-rulesets.md`

Defines **mandatory** rules that block PR approval if violated.

**Use this for:**
- Security requirements (no hardcoded secrets)
- Performance rules (no blocking I/O)
- Compliance policies (must document env vars)
- Quality gates (test coverage thresholds)

**Example rules:**
```markdown
## Security Rule S1: No Hardcoded Secrets
**Status**: 🔴 BLOCKING

All API keys must use environment variables:
- ❌ const apiKey = "sk-abc123"
- ✅ const apiKey = process.env.API_KEY
```

#### `review-ignorelist.txt`

Lists files and patterns to exclude from AI review.

**Common exclusions:**
```
# Build outputs
dist/**
build/**

# Dependencies
node_modules/**
package-lock.json

# Test fixtures
**/__fixtures__/**
**/__mocks__/**

# Generated files
**/*.min.js
**/*.bundle.js
```

### Custom Prompt Templates

Override default prompts with your own templates in `.github/prompts/`:

#### `review.md` - Code Review Prompt

Customize the code review format and structure.

**Available placeholders:**
- `{{taskLabel}}` - Task description
- `{{prHeader}}` - PR title and branch info
- `{{prDescription}}` - PR description
- `{{fileCount}}` - Number of files changed
- `{{fileSummaries}}` - Summary of changed files
- `{{instructions}}` - Content from review-instructions.md
- `{{rulesets}}` - Content from review-rulesets.md
- `{{repository}}` - Repository name
- `{{additionalContext}}` - Custom context from workflow

**Example template:**
```markdown
# Code Review: {{taskLabel}}

Analyze this PR with {{fileCount}} files changed.

{{instructions}}

Provide findings grouped by severity:
1. Critical Issues (🔴)
2. High Priority (🟠)
3. Suggestions (🟢)
```

#### `summary.md` - Executive Summary Prompt

Customize the PR summary format for stakeholders.

**Use this to:**
- Create consistent executive summaries
- Focus on business impact
- Highlight risks and dependencies
- Structure information for non-technical readers

#### `suggestions.md` - Improvement Suggestions Prompt

Customize the format for improvement suggestions.

**Use this to:**
- Prioritize certain types of improvements
- Format suggestions consistently
- Add effort estimates
- Focus on high-impact changes

## 🎯 Common Customization Scenarios

### Scenario 1: Security-First Review

**Goal:** Prioritize security above all else.

**Changes:**
1. Edit `review-instructions.md`:
   ```markdown
   Priority 1: Security vulnerabilities (blocking)
   Priority 2: Everything else
   ```

2. Add strict security rules to `review-rulesets.md`:
   ```markdown
   ## S1: No SQL Injection (BLOCKING)
   ## S2: No XSS Vulnerabilities (BLOCKING)
   ## S3: Validate All Inputs (BLOCKING)
   ```

3. Customize `review.md` prompt:
   ```markdown
   Focus exclusively on security issues first.
   Only mention other issues if critical.
   ```

### Scenario 2: Performance-Critical Application

**Goal:** Catch performance issues early.

**Changes:**
1. Add performance rules to `review-rulesets.md`:
   ```markdown
   ## P1: No N+1 Queries (BLOCKING)
   ## P2: Async I/O Required (WARNING)
   ## P3: Cache When Possible (ADVISORY)
   ```

2. Update `review-instructions.md`:
   ```markdown
   Always check:
   - Database query efficiency
   - Algorithm complexity
   - Memory usage patterns
   - API call optimization
   ```

3. Set additional context in workflow:
   ```yaml
   additional-context: |
     This is a high-performance API.
     Flag any blocking operations or inefficient algorithms.
   ```

### Scenario 3: Open Source Project

**Goal:** Ensure contributor code meets project standards.

**Changes:**
1. Add comprehensive guidelines to `review-instructions.md`:
   ```markdown
   ## For External Contributors
   - Code must follow style guide
   - All public APIs must be documented
   - Tests required for all features
   - Breaking changes need migration guide
   ```

2. Set clear quality bars in `review-rulesets.md`:
   ```markdown
   ## Q1: Test Coverage >80% (BLOCKING)
   ## Q2: Public API Documentation (BLOCKING)
   ## Q3: Changelog Updated (WARNING)
   ```

### Scenario 4: Team Learning & Growth

**Goal:** Use AI reviews as teaching moments.

**Changes:**
1. Adjust review style in `review-instructions.md`:
   ```markdown
   ## Review Style
   - Explain the "why" behind every suggestion
   - Provide links to documentation
   - Share best practice resources
   - Highlight learning opportunities
   ```

2. Customize `suggestions.md`:
   ```markdown
   For each suggestion:
   1. Explain why it matters
   2. Link to relevant documentation
   3. Provide before/after examples
   4. Note learning resources
   ```

## 💡 Tips & Best Practices

### Workflow Configuration

**Start Conservative:**
```yaml
# Begin with these settings
max-files: 20
max-diff-chars: 8000
max-output-tokens: 8000
```

**Scale Up Gradually:**
```yaml
# Increase as needed
max-files: 40
max-diff-chars: 12000
max-output-tokens: 16000
```

### Provider Selection

**Cost-Effective Setup:**
```yaml
# Use fast, cheap models for most PRs
chatgpt-model: gpt-4o-mini

# Reserve expensive models for complex reviews
# claude-model: claude-3-5-sonnet-20241022
```

**High-Quality Setup:**
```yaml
# Use best models for critical code
ai-provider: claude,chatgpt
claude-model: claude-3-5-sonnet-20241022
chatgpt-model: gpt-4o
```

**Privacy-First Setup:**
```yaml
# Use only self-hosted models
ai-provider: self-hosted
self-hosted-model: llama3:70b
```

### Exclude Patterns

**Common patterns to ignore:**
- Generated code: `dist/**`, `build/**`
- Dependencies: `node_modules/**`, `vendor/**`
- Lock files: `**/*.lock`
- Test fixtures: `**/__fixtures__/**`
- Large data files: `**/*.json` (if data files)
- Media: `**/*.{png,jpg,svg}`

### Prompt Optimization

**Keep prompts:**
- Clear and specific
- Well-structured
- Focused on priorities
- Not too long (< 2000 words)

**Use placeholders:**
- `{{instructions}}` for team guidelines
- `{{rulesets}}` for mandatory rules
- `{{fileSummaries}}` for changed files
- `{{additionalContext}}` for PR-specific notes

## 🔧 Troubleshooting

### Issue: AI reviews are too verbose

**Solution:** Reduce `max-output-tokens` and update prompts:
```yaml
max-output-tokens: 8000  # Down from 16000
```

```markdown
# In prompts
Keep responses concise. Focus on critical issues only.
```

### Issue: Too many style comments

**Solution:** Update `review-instructions.md`:
```markdown
Do NOT comment on:
- Formatting (we have prettier for that)
- Variable naming (unless truly confusing)
- Code style (linter handles this)
```

### Issue: Missing important issues

**Solution:** Add to `review-rulesets.md`:
```markdown
## Always Check:
- Input validation
- Error handling
- Security vulnerabilities
- Test coverage
```

### Issue: Reviews are too slow

**Solution:** Use faster models or reduce scope:
```yaml
chatgpt-model: gpt-4o-mini  # Faster
max-files: 20  # Fewer files
max-diff-chars: 8000  # Smaller diffs
```

## 📖 Further Reading

- [Main README](../../README.md) - Complete documentation
- [Action README](../README.md) - Action-specific details
- [Contributing Guide](../../CONTRIBUTING.md) - How to contribute
- [Security Policy](../../SECURITY.md) - Security best practices

## 💬 Get Help

- **Questions:** [Start a discussion](https://github.com/ashsaym/ai-code-reviewer/discussions)
- **Issues:** [Report a bug](https://github.com/ashsaym/ai-code-reviewer/issues)
- **Examples:** Check workflow files in this directory

---

**Ready to get started?** Copy a workflow file and add your API key! 🚀
