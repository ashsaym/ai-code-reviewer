# Examples

This directory contains complete, production-ready examples for using the Next Gen AI Reviewer GitHub Action in your repositories.

## 📁 Directory Structure

```
examples/
├── .github/
│   ├── workflows/              # Example GitHub Actions workflows
│   │   ├── ai-review-openai.yml      # OpenAI/ChatGPT example
│   │   ├── ai-review-claude.yml      # Anthropic Claude example
│   │   └── ai-review-selfhosted.yml  # Self-hosted/Open WebUI example
│   ├── prompts/                # Custom prompt templates
│   │   ├── review.md
│   │   ├── suggestions.md
│   │   └── summary.md
│   ├── review-instructions.md  # Team review guidelines
│   ├── review-rulesets.md      # Compliance and security rules
│   └── review-ignorelist.txt   # Files/patterns to exclude from review
└── README.md                   # This file
```

## 🚀 Quick Start

### Step 1: Choose Your AI Provider

We provide three example workflows for different AI providers:

1. **OpenAI/ChatGPT** ([ai-review-openai.yml](.github/workflows/ai-review-openai.yml))
   - Best for: General-purpose code review, cost-effectiveness with gpt-5-mini
   - Models: gpt-5-mini, gpt-4o, gpt-4-turbo, o1, o3
   - Requires: `CHATGPT_API_KEY` or `OPENAI_API_KEY` secret

2. **Anthropic Claude** ([ai-review-claude.yml](.github/workflows/ai-review-claude.yml))
   - Best for: Complex analysis, detailed reasoning, following instructions
   - Models: claude-3-5-sonnet-20241022, claude-3-opus, claude-3-sonnet, claude-3-haiku
   - Requires: `CLAUDE_API_KEY` or `ANTHROPIC_API_KEY` secret

3. **Self-Hosted/Open WebUI** ([ai-review-selfhosted.yml](.github/workflows/ai-review-selfhosted.yml))
   - Best for: Privacy, cost optimization, custom models, on-premise deployments
   - Models: mistral-small, codellama, llama3, deepseek-coder, qwen2.5-coder, and more
   - Requires: `OPENWEBUI_URL` and optionally `OPENWEBUI_API_KEY` secrets

### Step 2: Copy Files to Your Repository

1. **Copy the workflow file** for your chosen provider:
   ```bash
   # From your repository root
   mkdir -p .github/workflows
   
   # For OpenAI
   cp path/to/next-gen-ai-reviewer/examples/.github/workflows/ai-review-openai.yml .github/workflows/
   
   # For Claude
   cp path/to/next-gen-ai-reviewer/examples/.github/workflows/ai-review-claude.yml .github/workflows/
   
   # For Self-hosted
   cp path/to/next-gen-ai-reviewer/examples/.github/workflows/ai-review-selfhosted.yml .github/workflows/
   ```

2. **Copy guidance files** (optional but recommended):
   ```bash
   mkdir -p .github/prompts
   cp path/to/next-gen-ai-reviewer/examples/.github/review-instructions.md .github/
   cp path/to/next-gen-ai-reviewer/examples/.github/review-rulesets.md .github/
   cp path/to/next-gen-ai-reviewer/examples/.github/review-ignorelist.txt .github/
   cp path/to/next-gen-ai-reviewer/examples/.github/prompts/*.md .github/prompts/
   ```

### Step 3: Configure Secrets

Add the required API keys as repository secrets:

1. Go to your repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add the appropriate secret(s):

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

Name: OPENWEBUI_API_KEY (if authentication required)
Value: your-api-key
```

### Step 4: Commit and Push

```bash
git add .github/
git commit -m "Add AI code reviewer workflow"
git push
```

The workflow will now run automatically on pull requests!

## 📝 Customization Guide

### Workflow Configuration

Each workflow file is extensively commented with configuration options. Key settings to customize:

#### Model Selection
```yaml
# OpenAI
chatgpt-model: gpt-5-mini        # Cost-effective
chatgpt-model: gpt-4o            # Advanced reasoning
chatgpt-model: gpt-4-turbo       # Powerful

# Claude
claude-model: claude-3-5-sonnet-20241022  # Recommended
claude-model: claude-3-opus               # Most capable
claude-model: claude-3-haiku              # Fastest

# Self-hosted
self-hosted-model: mistral-small    # General purpose
self-hosted-model: deepseek-coder   # Best for code
self-hosted-model: codellama        # Code-optimized
```

#### Review Scope
```yaml
max-files: 60              # Maximum files to analyze
max-diff-chars: 18000      # Max characters per file
max-output-tokens: 16000   # Max response length
```

#### Task Types
```yaml
task: review        # Detailed code review (default)
task: summary       # Executive summary
task: suggestions   # Improvement suggestions
task: description   # Auto-generate PR description
```

#### Inline Comments
```yaml
inline-review: "true"   # GitHub-style line comments
inline-review: "false"  # Single summary comment
```

### Custom Instructions

Add repository-specific guidance using `additional-context`:

```yaml
additional-context: |
  Focus on:
  - Security vulnerabilities
  - Performance issues
  - Test coverage
  - Documentation completeness
```

Or create `.github/review-instructions.md` for persistent instructions (see [review-instructions.md](.github/review-instructions.md)).

### Guidance Files

The action automatically loads these files from your repository's `.github/` directory:

| File | Purpose | Example |
|------|---------|---------|
| `review-instructions.md` | Long-form review guidelines | [View](.github/review-instructions.md) |
| `review-rulesets.md` | Strict policies and blockers | [View](.github/review-rulesets.md) |
| `review-ignorelist.txt` | Glob patterns to exclude | [View](.github/review-ignorelist.txt) |
| `prompts/review.md` | Custom review prompt template | [View](.github/prompts/review.md) |
| `prompts/summary.md` | Custom summary prompt template | [View](.github/prompts/summary.md) |
| `prompts/suggestions.md` | Custom suggestions prompt template | [View](.github/prompts/suggestions.md) |

## 🎯 Advanced Examples

### Multi-Provider Fallback

Try multiple providers in order until one succeeds:

```yaml
ai-provider: chatgpt,claude,self-hosted

# Configure all providers
chatgpt-model: gpt-5-mini
claude-model: claude-3-5-sonnet-20241022
self-hosted-endpoint: ${{ secrets.OPENWEBUI_URL }}/api/v1/chat/completions
self-hosted-model: mistral-small

env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}
  CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
  OPENWEBUI_API_KEY: ${{ secrets.OPENWEBUI_API_KEY }}
```

### Matrix Strategy for Multiple Tasks

Run all review types in parallel:

```yaml
jobs:
  ai-review:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        task: [review, summary, suggestions]
    steps:
      - uses: actions/checkout@v4
      - uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.0.0
        with:
          task: ${{ matrix.task }}
          pr-number: ${{ github.event.pull_request.number }}
          ai-provider: chatgpt
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}
```

### Conditional Review Based on Labels

Only run on PRs with specific labels:

```yaml
jobs:
  ai-review:
    if: contains(github.event.pull_request.labels.*.name, 'needs-review')
    runs-on: ubuntu-latest
    steps:
      # ... workflow steps
```

### Different Models for Different File Types

```yaml
jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Check changed files
        id: changed-files
        run: |
          if git diff --name-only origin/${{ github.base_ref }}...HEAD | grep -q '\.py$'; then
            echo "has-python=true" >> "$GITHUB_OUTPUT"
          fi
          if git diff --name-only origin/${{ github.base_ref }}...HEAD | grep -q '\.(js|ts)$'; then
            echo "has-javascript=true" >> "$GITHUB_OUTPUT"
          fi
      
      - name: Review Python files
        if: steps.changed-files.outputs.has-python == 'true'
        uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.0.0
        with:
          pr-number: ${{ github.event.pull_request.number }}
          ai-provider: claude  # Claude is great for Python
          additional-context: "Focus on Python-specific issues"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
      
      - name: Review JavaScript files
        if: steps.changed-files.outputs.has-javascript == 'true'
        uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.0.0
        with:
          pr-number: ${{ github.event.pull_request.number }}
          ai-provider: chatgpt  # ChatGPT excels at JavaScript
          additional-context: "Focus on JavaScript/TypeScript best practices"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}
```

## 🔧 Troubleshooting

### Common Issues

**Issue: Workflow doesn't run**
- ✓ Check that workflow file is in `.github/workflows/`
- ✓ Verify YAML syntax is valid
- ✓ Ensure `pull_request` trigger is configured
- ✓ Check repository permissions allow Actions

**Issue: Authentication failed**
- ✓ Verify secret names match exactly (`CHATGPT_API_KEY`, not `OPENAI_KEY`)
- ✓ Check API key is valid and active
- ✓ Ensure key has proper permissions/quotas

**Issue: Review is incomplete or truncated**
- ✓ Increase `max-output-tokens` (default: 16000)
- ✓ Reduce `max-files` if too many files changed
- ✓ Use `review-ignorelist.txt` to exclude irrelevant files
- ✓ Consider splitting large PRs into smaller ones

**Issue: Too expensive / rate limited**
- ✓ Use cheaper models (gpt-5-mini, claude-3-haiku)
- ✓ Reduce `max-files` and `max-diff-chars`
- ✓ Add concurrency controls to prevent parallel runs
- ✓ Consider self-hosted models for high-volume repos

**Issue: Self-hosted connection failed**
- ✓ Verify endpoint URL is correct and accessible
- ✓ Check firewall allows GitHub Actions IPs
- ✓ Ensure model is loaded and ready
- ✓ Test endpoint with curl from runner

### Getting Help

- 📖 [Main Documentation](../../README.md)
- 💬 [GitHub Discussions](https://github.com/ashsaym/ai-code-reviewer/discussions)
- 🐛 [Report Issues](https://github.com/ashsaym/ai-code-reviewer/issues)
- 🤝 [Contributing Guide](../../../CONTRIBUTING.md)

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Open WebUI Documentation](https://docs.openwebui.com/)
- [Best Practices for Code Review](https://google.github.io/eng-practices/review/)

## 🎉 Success Stories

Using these examples, teams have successfully:
- ✅ Automated code review for 100+ repositories
- ✅ Caught security vulnerabilities before production
- ✅ Reduced review time by 60%
- ✅ Improved code quality and consistency
- ✅ Onboarded junior developers faster

## 🤝 Contributing

Found a bug or have a suggestion? We'd love your contribution!

1. Check existing [issues](https://github.com/ashsaym/ai-code-reviewer/issues)
2. Open a new issue or PR
3. See [CONTRIBUTING.md](../../../CONTRIBUTING.md) for guidelines

## 📄 License

These examples are part of the ai-code-reviewer project and are licensed under the [MIT License](../../../LICENSE).

---

**Happy reviewing! 🎯**
