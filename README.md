# AI Code Reviewer

[![Test Status](https://github.com/ashsaym/ai-code-reviewer/actions/workflows/test.yml/badge.svg)](https://github.com/ashsaym/ai-code-reviewer/actions/workflows/test.yml)
[![CodeQL](https://github.com/ashsaym/ai-code-reviewer/actions/workflows/codeql.yml/badge.svg)](https://github.com/ashsaym/ai-code-reviewer/actions/workflows/codeql.yml)
[![Security Scan](https://github.com/ashsaym/ai-code-reviewer/actions/workflows/security-scan.yml/badge.svg)](https://github.com/ashsaym/ai-code-reviewer/actions/workflows/security-scan.yml)
[![codecov](https://codecov.io/gh/ashsaym/ai-code-reviewer/branch/main/graph/badge.svg)](https://codecov.io/gh/ashsaym/ai-code-reviewer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Transform your GitHub pull requests with intelligent, AI-powered code reviews**

A production-ready GitHub Action that leverages advanced AI models to provide comprehensive code reviews, summaries, and improvement suggestions for your pull requests. Built with flexibility in mind, it supports multiple AI providers and offers extensive customization options.

## 🌟 Why AI Code Reviewer?

**Intelligent Reviews**: Get detailed, context-aware code reviews that understand your codebase, not just syntax.

**Multi-Provider Flexibility**: Choose from OpenAI's ChatGPT, Anthropic's Claude, or your own self-hosted models. Switch providers seamlessly or use automatic fallback.

**Enterprise-Ready**: Built with security first—minimal permissions, comprehensive scanning, and production-grade reliability with 78%+ test coverage.

**Developer-Friendly**: Simple setup, powerful customization. Works out of the box or configure it exactly how you need.

## 🚀 Quick Start

Get up and running in 60 seconds:

```yaml
name: AI Code Review

on:
  pull_request:
    types: [opened, reopened, synchronize]

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - name: AI Code Review
        uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.1.0
        with:
          pr-number: ${{ github.event.pull_request.number }}
          task: review
          ai-provider: chatgpt
          chatgpt-model: gpt-4o-mini
          reviewer-name: "AI Reviewer"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}
```

**That's it!** Now your PRs will automatically receive AI-powered code reviews.

## ✨ Key Features

### 🤖 Multi-Provider AI Support
- **OpenAI ChatGPT**: GPT-4o, GPT-4o-mini, GPT-4 Turbo, and more
- **Anthropic Claude**: Claude 3.5 Sonnet, Claude 3 Opus, and other models
- **Self-Hosted Models**: Open WebUI, LocalAI, Ollama, LM Studio, or any OpenAI-compatible API
- **Automatic Fallback**: Configure multiple providers—automatically falls back if one fails

### 📝 Multiple Analysis Modes
- **Code Review**: Comprehensive line-by-line review with inline comments
- **Summary**: Executive summary of changes, intent, and impact
- **Suggestions**: Actionable improvement recommendations
- **PR Description**: Auto-generate and update PR descriptions

### 💡 Smart & Flexible
- **GitHub-Style Inline Comments**: Reviews appear as native PR comments on specific lines
- **Custom Instructions**: Load team-specific guidelines from `.github/` files
- **Customizable Prompts**: Override default prompts with your own templates
- **File Filtering**: Exclude specific files or patterns from analysis
- **Slash Commands**: Trigger reviews interactively with `/review`, `/summary`, `/suggestion` commands

### 🔒 Enterprise-Grade Security
- **Minimal Permissions**: Only requires `contents: read` and `pull-requests: write`
- **Secret Protection**: API keys never logged or exposed
- **Comprehensive Scanning**: CodeQL, Trivy, Gitleaks, and dependency review
- **Well-Tested**: 78%+ code coverage with extensive test suite

### ⚡ Developer Experience
- **Zero Repository Checkout**: Action works without checking out your code
- **Fast & Efficient**: Optimized diff processing and token usage
- **Rich Documentation**: Complete examples and troubleshooting guides
- **Active Maintenance**: Regular updates and security patches

## 📦 Provider Setup

### OpenAI ChatGPT

Use OpenAI's powerful language models for code review:

```yaml
- uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.1.0
  with:
    pr-number: ${{ github.event.pull_request.number }}
    task: review
    ai-provider: chatgpt
    chatgpt-model: gpt-4o-mini
    max-completion-tokens-mode: auto
    reviewer-name: "AI Reviewer"
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}
```

**Required Secrets:**
- `CHATGPT_API_KEY` or `OPENAI_API_KEY` - Get yours at https://platform.openai.com/api-keys

**Configuration Options:**
- `chatgpt-model` (default: `gpt-4o-mini`) - Available models:
  - `gpt-4o` - Most capable, multimodal flagship model
  - `gpt-4o-mini` - Fast and affordable, great for most use cases (recommended)
  - `gpt-4-turbo` - Previous generation, still very capable
  - `gpt-3.5-turbo` - Fast and economical for simple reviews
- `max-completion-tokens-mode` (default: `auto`)
  - `auto` - Automatically detects which parameter to use based on model
  - `true` - Use `max_completion_tokens` parameter (for gpt-4o, gpt-4o-mini, o1, o3)
  - `false` - Use `max_tokens` parameter (for gpt-4-turbo, gpt-3.5-turbo)

### Anthropic Claude

Use Anthropic's Claude models for nuanced, thoughtful code analysis:

```yaml
- uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.1.0
  with:
    pr-number: ${{ github.event.pull_request.number }}
    task: review
    ai-provider: claude
    claude-model: claude-3-5-sonnet-20241022
    reviewer-name: "AI Reviewer"
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
```

**Required Secrets:**
- `CLAUDE_API_KEY` or `ANTHROPIC_API_KEY` - Get yours at https://console.anthropic.com/

**Configuration Options:**
- `claude-model` (default: `claude-3-5-sonnet-20241022`) - Available models:
  - `claude-3-5-sonnet-20241022` - Most intelligent model, best for complex code analysis (recommended)
  - `claude-3-5-haiku-20241022` - Fastest model, great for quick reviews
  - `claude-3-opus-20240229` - Previous flagship, excellent reasoning
  - `claude-3-sonnet-20240229` - Balanced performance and cost

### Self-Hosted Models

Use your own infrastructure with any OpenAI-compatible API:

```yaml
- uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.1.0
  with:
    pr-number: ${{ github.event.pull_request.number }}
    task: review
    ai-provider: self-hosted
    self-hosted-endpoint: ${{ secrets.OPENWEBUI_URL }}/api/v1/chat/completions
    self-hosted-model: llama3:70b
    self-hosted-token: ${{ secrets.OPENWEBUI_API_KEY }}
    self-hosted-token-header: Authorization
    max-output-tokens: 8000
    reviewer-name: "AI Reviewer"
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Required Configuration:**
- `self-hosted-endpoint` - Full URL to your OpenAI-compatible API endpoint
- `self-hosted-model` - Model identifier that your endpoint recognizes

**Optional Configuration:**
- `self-hosted-token` - Authentication token (use GitHub Secrets)
- `self-hosted-token-header` (default: `Authorization`) - Header name for the token
  - Uses `Bearer` prefix automatically for `Authorization` header
  - For custom headers (e.g., `X-API-Key`), specify the header name
- `max-output-tokens` - Adjust based on your model's capacity (default: 16000)

**Compatible Platforms:**
- ✅ **Open WebUI** - Full-featured web interface for LLMs
- ✅ **Ollama** - Local LLM runtime (with OpenAI compatibility layer)
- ✅ **LocalAI** - OpenAI-compatible local inference
- ✅ **LM Studio** - Desktop app for running LLMs locally
- ✅ **text-generation-webui** - Popular web UI for LLMs
- ✅ **vLLM** - High-throughput inference server
- ✅ **Any OpenAI-compatible API** - If it speaks OpenAI's protocol, it works!

**Popular Model Examples:**
- Llama 3 models: `llama3:8b`, `llama3:70b`
- Mistral models: `mistral:7b`, `mistral-small`, `mistral-large`
- Code-focused: `codellama:13b`, `deepseek-coder:33b`
- Quantized models: `llama3:8b-q4`, `mistral:7b-q6`

### Multi-Provider Fallback

Configure multiple providers for high availability—automatically falls back if one fails:

```yaml
- uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.1.0
  with:
    pr-number: ${{ github.event.pull_request.number }}
    task: review
    # Try providers in order: ChatGPT → Claude → Self-hosted
    ai-provider: chatgpt,claude,self-hosted
    reviewer-name: "AI Reviewer"
    
    # Configure each provider
    chatgpt-model: gpt-4o-mini
    claude-model: claude-3-5-sonnet-20241022
    self-hosted-endpoint: ${{ secrets.OPENWEBUI_URL }}/api/v1/chat/completions
    self-hosted-model: llama3:70b
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    # Provide all available API keys
    CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}
    CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
    OPENWEBUI_API_KEY: ${{ secrets.OPENWEBUI_API_KEY }}
```

**How it works:**
1. Tries ChatGPT first (if `CHATGPT_API_KEY` is available)
2. Falls back to Claude on failure (if `CLAUDE_API_KEY` is available)
3. Falls back to self-hosted as last resort (if configured)
4. Posts error comment if all providers fail

## 🎯 Analysis Modes

Choose the type of AI analysis you want for your pull requests:

### 📋 Code Review (`review`)

Comprehensive line-by-line code review with inline comments on specific files and lines.

**What you get:**
- Security vulnerabilities and potential bugs
- Performance issues and optimization opportunities
- Best practices and design pattern suggestions
- Code quality and maintainability feedback
- Testing recommendations

```yaml
with:
  task: review
  inline-review: "true"  # Enable GitHub-style inline comments
```

**Example output:** Comments appear directly on the PR, pointing to specific lines with detailed feedback.

---

### 📊 Summary (`summary`)

Executive summary of the pull request perfect for stakeholders and team leads.

**What you get:**
- High-level overview of changes
- Intent and purpose of the PR
- Potential impacts and risks
- Areas requiring attention

```yaml
with:
  task: summary
```

**Example output:** A single well-structured comment summarizing the entire PR.

---

### 💡 Suggestions (`suggestions`)

Actionable improvement ideas and enhancement opportunities.

**What you get:**
- Refactoring opportunities
- Code simplification suggestions
- Library and tool recommendations
- Architecture improvements
- Developer experience enhancements

```yaml
with:
  task: suggestions
  # Alias: task: suggest
```

**Example output:** Numbered list of practical suggestions with effort estimates.

---

### 📝 PR Description (`description`)

Auto-generate comprehensive PR descriptions from code changes.

**What you get:**
- Clear description of what changed
- Type of change classification (feature, bugfix, etc.)
- Detailed list of modifications
- Testing considerations
- **Automatically updates the PR description**

```yaml
with:
  task: description
```

**Interactive trigger:** Comment `/description` on any PR to generate and update the description on-demand.

## 💬 Interactive Slash Commands

Trigger AI analysis on-demand by commenting on any pull request:

| Command | Description | Output |
|---------|-------------|--------|
| `/review` | Comprehensive code review | Detailed inline comments and findings |
| `/summary` | Executive summary | High-level overview of changes |
| `/suggestion` | Improvement ideas | Actionable enhancement suggestions |
| `/description` | Generate PR description | Auto-updates PR description with summary |

**How to use:**
1. Open any pull request
2. Add a comment with the command (e.g., `/review`)
3. Watch the action run and post results
4. React emojis show status: 👀 (processing), 👍 (success), 👎 (failed)

**Setup:**

Add `.github/workflows/ai-review-on-command.yml` to your repository:

```yaml
name: AI Review Commands

on:
  issue_comment:
    types: [created]

permissions:
  contents: read
  pull-requests: write
  issues: write

jobs:
  handle-command:
    if: |
      github.event.issue.pull_request &&
      (
        startsWith(github.event.comment.body, '/review') ||
        startsWith(github.event.comment.body, '/suggestion') ||
        startsWith(github.event.comment.body, '/summary') ||
        startsWith(github.event.comment.body, '/description')
      )
    runs-on: ubuntu-latest
    steps:
      - name: Parse command
        id: parse
        run: |
          if [[ "${{ github.event.comment.body }}" =~ ^/review ]]; then
            echo "task=review" >> "$GITHUB_OUTPUT"
          elif [[ "${{ github.event.comment.body }}" =~ ^/suggestion ]]; then
            echo "task=suggestions" >> "$GITHUB_OUTPUT"
          elif [[ "${{ github.event.comment.body }}" =~ ^/summary ]]; then
            echo "task=summary" >> "$GITHUB_OUTPUT"
          elif [[ "${{ github.event.comment.body }}" =~ ^/description ]]; then
            echo "task=description" >> "$GITHUB_OUTPUT"
          fi

      - name: React with eyes
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.reactions.createForIssueComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              comment_id: context.payload.comment.id,
              content: 'eyes'
            });

      - name: Run AI Review
        uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.1.0
        with:
          pr-number: ${{ github.event.issue.number }}
          task: ${{ steps.parse.outputs.task }}
          ai-provider: chatgpt,claude,self-hosted
          reviewer-name: "AI Reviewer"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}
          CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}

      - name: React with thumbs up
        if: success()
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.reactions.createForIssueComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              comment_id: context.payload.comment.id,
              content: '+1'
            });

      - name: React with thumbs down
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.reactions.createForIssueComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              comment_id: context.payload.comment.id,
              content: '-1'
            });
```

See [complete example workflows](#-complete-workflow-examples) below for more details.

## ⚙️ Configuration Reference

### Action Inputs

Complete list of configuration options:

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `pr-number` | No | Auto-detected | Pull request number to analyze |
| `repository` | No | `github.repository` | Repository in format `owner/repo` |
| `task` | No | `review` | Analysis mode: `review`, `summary`, `suggestions`, or `description` |
| `ai-provider` | No | `chatgpt,claude,self-hosted` | Comma-separated provider priority list |
| `reviewer-name` | No | `next-gen-ai-reviewer` | Display name for the AI reviewer |
| `inline-review` | No | `true` | Enable GitHub-style inline comments (review/suggestions tasks) |
| `max-files` | No | `40` | Maximum number of changed files to analyze |
| `max-diff-chars` | No | `12000` | Maximum diff characters per file |
| `max-output-tokens` | No | `16000` | Maximum tokens in AI response |
| `additional-context` | No | - | Custom instructions appended to prompts |

### ChatGPT/OpenAI Configuration

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `chatgpt-model` | No | `gpt-4o-mini` | Model to use (gpt-4o, gpt-4o-mini, gpt-4-turbo, etc.) |
| `max-completion-tokens-mode` | No | `auto` | Token parameter mode: `auto`, `true`, or `false` |

### Claude/Anthropic Configuration

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `claude-model` | No | `claude-3-5-sonnet-20241022` | Model to use (see Claude models above) |

### Self-Hosted Configuration

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `self-hosted-endpoint` | Yes* | - | Full URL to OpenAI-compatible API endpoint |
| `self-hosted-model` | No | `local-model` | Model identifier recognized by your endpoint |
| `self-hosted-token` | No | - | Authentication token |
| `self-hosted-token-header` | No | `Authorization` | HTTP header name for token |

*Required only when using `self-hosted` provider

### Environment Variables & Secrets

Configure these in your repository settings under **Settings → Secrets and variables → Actions**:

**Required:**
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions, no setup needed

**AI Provider Keys** (at least one required):
- `CHATGPT_API_KEY` or `OPENAI_API_KEY` - For OpenAI ChatGPT
- `CLAUDE_API_KEY` or `ANTHROPIC_API_KEY` - For Anthropic Claude
- `SELF_HOSTED_API_KEY`, `OPENWEBUI_API_KEY`, or `SELF_HOSTED_TOKEN` - For self-hosted endpoints

**Optional Environment Variable Overrides:**

These environment variables can override action inputs:
- `AI_PROVIDER` - Override provider priority list
- `PR_NUMBER` - Override PR number
- `MAX_FILES` - Override maximum files limit
- `MAX_DIFF_CHARS` - Override maximum diff characters
- `MAX_OUTPUT_TOKENS` - Override maximum output tokens
- `ADDITIONAL_CONTEXT` - Override additional context
- `REVIEWER_NAME` - Override reviewer display name

## 📂 Repository Customization

Customize AI behavior by adding guidance files to your `.github/` directory. The action automatically loads these files—no checkout required!

### Guidance Files

| File | Purpose | Example |
|------|---------|---------|
| `.github/review-instructions.md` | Team-specific review guidelines and preferences | "Focus on security and performance over style" |
| `.github/review-rulesets.md` | Strict policies, compliance rules, blockers | "Never commit secrets", "All APIs must have timeouts" |
| `.github/review-ignorelist.txt` | File patterns to exclude from analysis | `docs/**`, `*.lock`, `generated/**` |

### Custom Prompt Templates

Override default prompts with your own templates:

| File | Task | Template Variables |
|------|------|-------------------|
| `.github/prompts/review.md` | Code review | `{{taskLabel}}`, `{{prHeader}}`, `{{fileCount}}`, `{{instructions}}`, `{{rulesets}}` |
| `.github/prompts/summary.md` | Summary | `{{prHeader}}`, `{{prDescription}}`, `{{fileSummaries}}`, `{{instructions}}` |
| `.github/prompts/suggestions.md` | Suggestions | `{{instructions}}`, `{{rulesets}}`, `{{fileSummaries}}` |

**Example custom review prompt** (`.github/prompts/review.md`):
```markdown
## Code Review: {{taskLabel}}

Analyze the following pull request:
- {{prHeader}}
- Files changed: {{fileCount}}

Team Guidelines:
{{instructions}}

Compliance Rules:
{{rulesets}}

Provide findings in this format:
1. **Critical Issues** - Security, bugs, blockers
2. **Important Issues** - Performance, maintainability
3. **Suggestions** - Improvements, best practices
```

### File Ignore Patterns

Create `.github/review-ignorelist.txt` to exclude files from analysis:

```
# Documentation
docs/**
*.md

# Generated files
dist/**
build/**
*.min.js

# Lock files
package-lock.json
yarn.lock

# Vendor code
vendor/**
node_modules/**
```

One glob pattern per line. Comments (lines starting with `#`) are ignored.

## 🔑 Setting Up API Keys

### Step 1: Get Your API Key

**For OpenAI ChatGPT:**
1. Visit https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-proj-` or `sk-`)

**For Anthropic Claude:**
1. Visit https://console.anthropic.com/
2. Sign in or create an account
3. Go to API Keys section
4. Click "Create Key"
5. Copy the key (starts with `sk-ant-`)

**For Self-Hosted:**
- Contact your infrastructure team for the endpoint URL and API key
- For Open WebUI: Find it in Settings → Account → API Keys

### Step 2: Add to GitHub Secrets

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add your secret:

**For ChatGPT:**
```
Name: CHATGPT_API_KEY
Value: sk-proj-xxxxxxxxxxxxxxxxxxxx
```

**For Claude:**
```
Name: CLAUDE_API_KEY
Value: sk-ant-xxxxxxxxxxxxxxxxxxxx
```

**For Self-Hosted:**
```
Name: OPENWEBUI_URL
Value: https://your-server.com

Name: OPENWEBUI_API_KEY
Value: your-api-key-here
```

### Step 3: Verify Setup

Create a test PR and check if the action runs successfully. Check the workflow logs for any authentication errors.

## 📊 Coverage & Security Reports

### Test Coverage

[![codecov](https://codecov.io/gh/ashsaym/ai-code-reviewer/branch/main/graph/badge.svg)](https://codecov.io/gh/ashsaym/ai-code-reviewer)

View detailed coverage reports at [Codecov](https://codecov.io/gh/ashsaym/ai-code-reviewer)

Current coverage: **78%+** across:
- Lines: 78%
- Functions: 79%
- Branches: 67%
- Statements: 78%

### Security Scanning

This project uses multiple security tools:

**🔍 CodeQL Analysis**
- Runs on every push and PR
- Detects security vulnerabilities and code quality issues
- View results: [Security tab](https://github.com/ashsaym/ai-code-reviewer/security/code-scanning)

**🛡️ Trivy Scanning**
- Scans for vulnerabilities in dependencies
- Checks Docker configurations
- Runs daily and on pull requests

**🔐 Gitleaks**
- Prevents secret leakage in commits
- Scans for API keys, passwords, tokens
- Blocks commits containing secrets

**📦 Dependency Review**
- Reviews new dependencies in PRs
- Identifies known vulnerabilities
- Checks license compatibility

View all security findings in the [Security tab](https://github.com/ashsaym/ai-code-reviewer/security).

## 🧪 Development

### Running Tests

```bash
cd next-gen-ai-reviewer
npm install
npm test                 # Run all tests with coverage
npm run test:unit        # Run only unit tests
npm run test:integration # Run only integration tests
npm run test:watch       # Watch mode
```

### Linting

```bash
npm run lint            # Check code quality
npm run lint:fix        # Auto-fix issues
```

## 📝 Complete Workflow Examples

### Example 1: Automatic Review with ChatGPT (OpenAI)

Create `.github/workflows/ai-review-chatgpt.yml`:

```yaml
name: AI Review (ChatGPT)

on:
  pull_request:
    types: [opened, reopened, synchronize]

permissions:
  contents: read
  pull-requests: write

jobs:
  ai-review:
    runs-on: ubuntu-latest
    
    steps:
      - name: AI Code Review with ChatGPT
        uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.0.0
        with:
          # Required
          pr-number: ${{ github.event.pull_request.number }}
          
          # Provider configuration
          ai-provider: chatgpt
          chatgpt-model: gpt-5-mini
          
          # Task configuration
          task: review
          
          # Optional: Control what gets analyzed
          max-files: 60
          max-diff-chars: 18000
          max-output-tokens: 16000
          
          # Optional: ChatGPT-specific settings
          max-completion-tokens-mode: auto  # or 'true' for gpt-4o/o1, 'false' for older models
          
          # Optional: Enable inline comments
          inline-review: "true"
          
          # Optional: Custom reviewer name
          reviewer-name: "AI Code Reviewer Bot"
          
          # Optional: Add custom instructions
          additional-context: |
            Focus on:
            - Security vulnerabilities
            - Performance issues
            - Best practices violations
            - Proper error handling
        
        env:
          # Required secrets
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}  # or OPENAI_API_KEY
```

**Required GitHub Secrets:**
- `CHATGPT_API_KEY` (or `OPENAI_API_KEY`) - Get from https://platform.openai.com/api-keys

### Example 2: Automatic Review with Claude (Anthropic)

Create `.github/workflows/ai-review-claude.yml`:

```yaml
name: AI Review (Claude)

on:
  pull_request:
    types: [opened, reopened, synchronize]

permissions:
  contents: read
  pull-requests: write

jobs:
  ai-review:
    runs-on: ubuntu-latest
    
    steps:
      - name: AI Code Review with Claude
        uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.0.0
        with:
          # Required
          pr-number: ${{ github.event.pull_request.number }}
          
          # Provider configuration
          ai-provider: claude
          claude-model: claude-3-5-sonnet-20241022
          
          # Task configuration
          task: review
          
          # Optional: Control what gets analyzed
          max-files: 60
          max-diff-chars: 18000
          max-output-tokens: 16000
          
          # Optional: Enable inline comments
          inline-review: "true"
          
          # Optional: Custom reviewer name
          reviewer-name: "AI Code Reviewer Bot"
          
          # Optional: Add custom instructions
          additional-context: |
            Prioritize:
            - Code maintainability
            - Testing coverage
            - Documentation quality
            - API design patterns
        
        env:
          # Required secrets
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}  # or ANTHROPIC_API_KEY
```

**Required GitHub Secrets:**
- `CLAUDE_API_KEY` (or `ANTHROPIC_API_KEY`) - Get from https://console.anthropic.com/

### Example 3: Automatic Review with Self-Hosted / Open WebUI

Create `.github/workflows/ai-review-selfhosted.yml`:

```yaml
name: AI Review (Self-Hosted)

on:
  pull_request:
    types: [opened, reopened, synchronize]

permissions:
  contents: read
  pull-requests: write

jobs:
  ai-review:
    runs-on: ubuntu-latest
    
    steps:
      - name: AI Code Review with Self-Hosted Model
        uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.0.0
        with:
          # Required
          pr-number: ${{ github.event.pull_request.number }}
          
          # Provider configuration
          ai-provider: self-hosted
          self-hosted-endpoint: ${{ secrets.OPENWEBUI_URL }}/api/v1/chat/completions
          self-hosted-model: mistral-small  # or llama3, codellama, etc.
          
          # Optional: Authentication
          self-hosted-token: ${{ secrets.OPENWEBUI_API_KEY }}
          self-hosted-token-header: Authorization  # Default, uses Bearer token
          
          # Task configuration
          task: review
          
          # Optional: Control what gets analyzed
          max-files: 60
          max-diff-chars: 18000
          max-output-tokens: 8000  # Adjust based on your model's capacity
          
          # Optional: Enable inline comments
          inline-review: "true"
          
          # Optional: Custom reviewer name
          reviewer-name: "AI Code Reviewer Bot"
          
          # Optional: Add custom instructions
          additional-context: |
            Review focus areas:
            - Code style consistency
            - Potential bugs
            - Logic errors
            - Resource leaks
        
        env:
          # Required secrets
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          
          # Optional: Alternative ways to pass self-hosted credentials
          # OPENWEBUI_API_KEY: ${{ secrets.OPENWEBUI_API_KEY }}
          # SELF_HOSTED_API_KEY: ${{ secrets.SELF_HOSTED_API_KEY }}
```

**Required GitHub Secrets:**
- `OPENWEBUI_URL` - Your Open WebUI or OpenAI-compatible endpoint (e.g., `https://your-server.com`)
- `OPENWEBUI_API_KEY` - Your API key (optional, if authentication is required)

**Supported Self-Hosted Platforms:**
- Open WebUI
- LocalAI
- Ollama with OpenAI compatibility
- LM Studio
- text-generation-webui
- Any OpenAI-compatible API

### Example 4: Manual Review via PR Comments

Create `.github/workflows/ai-review-on-command.yml`:

```yaml
name: AI Review on Command

on:
  issue_comment:
    types: [created]

permissions:
  contents: read
  pull-requests: write
  issues: write

jobs:
  handle-command:
    # Only run on PR comments with commands
    if: |
      github.event.issue.pull_request &&
      (
        startsWith(github.event.comment.body, '/review') ||
        startsWith(github.event.comment.body, '/suggestion') ||
        startsWith(github.event.comment.body, '/summary')
      )
    
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout PR code
        uses: actions/checkout@v4
        with:
          ref: refs/pull/${{ github.event.issue.number }}/head

      - name: Parse command
        id: parse
        env:
          COMMENT_BODY: ${{ github.event.comment.body }}
        run: |
          if [[ "$COMMENT_BODY" =~ ^/review ]]; then
            echo "task=review" >> "$GITHUB_OUTPUT"
          elif [[ "$COMMENT_BODY" =~ ^/suggestion ]]; then
            echo "task=suggestions" >> "$GITHUB_OUTPUT"
          elif [[ "$COMMENT_BODY" =~ ^/summary ]]; then
            echo "task=summary" >> "$GITHUB_OUTPUT"
          fi

      - name: React to command (eyes emoji)
        uses: actions/github-script@v8
        with:
          script: |
            await github.rest.reactions.createForIssueComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              comment_id: context.payload.comment.id,
              content: 'eyes'
            });

      - name: Run AI Review
        uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.0.0
        with:
          # Required
          pr-number: ${{ github.event.issue.number }}
          task: ${{ steps.parse.outputs.task }}
          
          # Optional: Custom reviewer name
          reviewer-name: "AI Code Reviewer Bot"
          
          # Provider configuration - tries in order
          ai-provider: chatgpt,claude,self-hosted
          
          # ChatGPT configuration
          chatgpt-model: gpt-5-mini
          max-completion-tokens-mode: auto
          
          # Claude configuration
          claude-model: claude-3-5-sonnet-20241022
          
          # Self-hosted configuration (optional)
          self-hosted-endpoint: ${{ secrets.OPENWEBUI_URL }}/api/v1/chat/completions
          self-hosted-model: mistral-small
          self-hosted-token: ${{ secrets.OPENWEBUI_API_KEY }}
          
          # Review settings
          max-files: 60
          max-diff-chars: 18000
          max-output-tokens: 16000
          inline-review: "true"
          
          # Track who requested it
          additional-context: "Requested by @${{ github.event.comment.user.login }} via command"
        
        env:
          # Required
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          
          # Provide all available API keys - action uses first available
          CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          OPENWEBUI_API_KEY: ${{ secrets.OPENWEBUI_API_KEY }}
          SELF_HOSTED_API_KEY: ${{ secrets.SELF_HOSTED_API_KEY }}

      - name: Mark success (thumbs up)
        if: success()
        uses: actions/github-script@v8
        with:
          script: |
            await github.rest.reactions.createForIssueComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              comment_id: context.payload.comment.id,
              content: '+1'
            });

      - name: Mark failure (thumbs down)
        if: failure()
        uses: actions/github-script@v8
        with:
          script: |
            await github.rest.reactions.createForIssueComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              comment_id: context.payload.comment.id,
              content: '-1'
            });
            
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: '❌ AI review failed. Please check the workflow logs for details.'
            });
```

**How to use:**
1. Comment `/review` on any PR to trigger a full code review
2. Comment `/suggestion` to get improvement suggestions
3. Comment `/summary` to get an executive summary

**Required GitHub Secrets:**
- `GITHUB_TOKEN` (automatically provided)
- At least one of: `CHATGPT_API_KEY`, `CLAUDE_API_KEY`, or `OPENWEBUI_API_KEY`

### Multi-Provider Fallback Example

```yaml
name: AI Review (Multi-Provider)

on:
  pull_request:
    types: [opened, reopened, synchronize]

permissions:
  contents: read
  pull-requests: write

jobs:
  ai-review:
    runs-on: ubuntu-latest
    
    steps:
      - name: AI Code Review with Fallback
        uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.0.0
        with:
          pr-number: ${{ github.event.pull_request.number }}
          task: review
          
          # Try providers in order: ChatGPT → Claude → Self-hosted
          ai-provider: chatgpt,claude,self-hosted
          
          chatgpt-model: gpt-5-mini
          claude-model: claude-3-5-sonnet-20241022
          self-hosted-endpoint: ${{ secrets.OPENWEBUI_URL }}/api/v1/chat/completions
          self-hosted-model: mistral-small
          
          max-output-tokens: 16000
          inline-review: "true"
          reviewer-name: "AI Code Reviewer Bot"
        
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # Action will try each provider until one succeeds
          CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}
          CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
          OPENWEBUI_API_KEY: ${{ secrets.OPENWEBUI_API_KEY }}
```

### Matrix Strategy for All Tasks

```yaml
name: AI Review Matrix

on:
  pull_request:
    types: [opened, reopened, synchronize]

permissions:
  contents: read
  pull-requests: write

jobs:
  ai-review:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        task: [review, summary, suggestions]
    
    steps:
      - name: Run AI ${{ matrix.task }}
        uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.0.0
        with:
          pr-number: ${{ github.event.pull_request.number }}
          task: ${{ matrix.task }}
          ai-provider: chatgpt
          chatgpt-model: gpt-5-mini
          reviewer-name: "AI Code Reviewer Bot"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}
```

## 🔑 Setting Up GitHub Secrets

1. Go to your repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add the following secrets based on your provider:

**For ChatGPT:**
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
Value: your-api-key
```

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Project Structure

```
ai-code-reviewer/
├── next-gen-ai-reviewer/       # Main action
│   ├── src/
│   │   ├── main.js            # Entry point
│   │   ├── github.js          # GitHub API interactions
│   │   ├── promptBuilder.js   # Prompt generation
│   │   ├── reviewFormatter.js # Comment formatting
│   │   ├── guidanceLoader.js  # Load .github/ files
│   │   └── providers/         # AI provider implementations
│   │       ├── chatgpt.js
│   │       ├── claude.js
│   │       └── selfHosted.js
│   ├── tests/                 # Test suite
│   ├── examples/              # Example configurations
│   ├── action.yml             # Action metadata
│   └── package.json
├── .github/workflows/         # CI/CD pipelines
└── README.md                  # This file
```

## 🔐 Security

- Minimal required permissions
- Secrets never logged or exposed
- Comprehensive vulnerability scanning
- Regular dependency updates

Report security issues to: [Security Policy](SECURITY.md)

## 📄 License

[MIT License](LICENSE)

## 🙏 Acknowledgments

Built with:
- [OpenAI API](https://platform.openai.com/)
- [Anthropic Claude API](https://www.anthropic.com/)
- [GitHub Actions](https://github.com/features/actions)
- [Jest](https://jestjs.io/)

## 📞 Support

- 🐛 [Report Issues](https://github.com/ashsaym/ai-code-reviewer/issues)
- 💡 [Request Features](https://github.com/ashsaym/ai-code-reviewer/issues/new)
- 📖 [View Documentation](https://github.com/ashsaym/ai-code-reviewer/tree/main/next-gen-ai-reviewer)
- ⭐ [Star on GitHub](https://github.com/ashsaym/ai-code-reviewer)

---

**Made with ❤️ by the community**
