# AI Code Reviewer

[![Test Status](https://github.com/ashsaym/ai-code-reviewer/actions/workflows/test.yml/badge.svg)](https://github.com/ashsaym/ai-code-reviewer/actions/workflows/test.yml)
[![CodeQL](https://github.com/ashsaym/ai-code-reviewer/actions/workflows/codeql.yml/badge.svg)](https://github.com/ashsaym/ai-code-reviewer/actions/workflows/codeql.yml)
[![Security Scan](https://github.com/ashsaym/ai-code-reviewer/actions/workflows/security-scan.yml/badge.svg)](https://github.com/ashsaym/ai-code-reviewer/actions/workflows/security-scan.yml)
[![codecov](https://codecov.io/gh/ashsaym/ai-code-reviewer/branch/main/graph/badge.svg)](https://codecov.io/gh/ashsaym/ai-code-reviewer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful multi-provider GitHub Action that brings AI-powered code reviews to your pull requests. Supports ChatGPT (OpenAI), Claude (Anthropic), and self-hosted models (Open WebUI compatible).

## 🚀 Quick Start

```yaml
name: AI Code Review

on:
  pull_request:
    types: [opened, reopened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - name: AI Code Review
        uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.0.0
        with:
          pr-number: ${{ github.event.pull_request.number }}
          task: review
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}
```

## ✨ Features

- **🤖 Multi-Provider Support**: Use ChatGPT, Claude, or self-hosted models
- **📝 Three Analysis Modes**: Code review, summary, or suggestions
- **💬 Inline Comments**: GitHub-style line-by-line review comments
- **🔄 Smart Fallbacks**: Automatically tries next provider if one fails
- **📊 Repository Guidance**: Load custom instructions from `.github/` files
- **🔒 Security First**: Minimal permissions, comprehensive scanning
- **✅ Well Tested**: 71%+ code coverage with Jest

## 📦 Installation & Usage

### Using ChatGPT (OpenAI)

```yaml
- uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.0.0
  with:
    pr-number: ${{ github.event.pull_request.number }}
    task: review
    ai-provider: chatgpt
    chatgpt-model: gpt-4o-mini
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}
```

**Environment Variables:**
- `CHATGPT_API_KEY` or `OPENAI_API_KEY` (required) - Your OpenAI API key

**Configuration:**
- `chatgpt-model` (default: `gpt-4o-mini`) - Model to use (gpt-4o, gpt-4o-mini, gpt-4-turbo, etc.)
- `max-completion-tokens-mode` (default: `auto`) - Set to `true` for newer models (gpt-4o, o1), `false` for older ones, or `auto` to detect automatically

### Using Claude (Anthropic)

```yaml
- uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.0.0
  with:
    pr-number: ${{ github.event.pull_request.number }}
    task: review
    ai-provider: claude
    claude-model: claude-3-5-sonnet-20241022
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
```

**Environment Variables:**
- `CLAUDE_API_KEY` or `ANTHROPIC_API_KEY` (required) - Your Anthropic API key

**Configuration:**
- `claude-model` (default: `claude-3-5-sonnet-20241022`) - Model to use (claude-3-5-sonnet, claude-3-opus, etc.)

### Using Self-Hosted / Open WebUI

```yaml
- uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.0.0
  with:
    pr-number: ${{ github.event.pull_request.number }}
    task: review
    ai-provider: self-hosted
    self-hosted-endpoint: ${{ secrets.OPENWEBUI_URL }}/api/v1/chat/completions
    self-hosted-model: mistral-small
    self-hosted-token: ${{ secrets.OPENWEBUI_API_KEY }}
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Environment Variables:**
- `SELF_HOSTED_API_KEY`, `OPENWEBUI_API_KEY`, or `SELF_HOSTED_TOKEN` (optional) - API key for authentication

**Configuration:**
- `self-hosted-endpoint` (required) - Full URL to OpenAI-compatible endpoint
- `self-hosted-model` (default: `local-model`) - Model identifier
- `self-hosted-token` (optional) - Authentication token
- `self-hosted-token-header` (default: `Authorization`) - Header name for token

### Multi-Provider with Fallback

```yaml
- uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.0.0
  with:
    pr-number: ${{ github.event.pull_request.number }}
    task: review
    ai-provider: chatgpt,claude,self-hosted  # Try in order
    chatgpt-model: gpt-4o-mini
    claude-model: claude-3-5-sonnet-20241022
    self-hosted-endpoint: ${{ secrets.OPENWEBUI_URL }}/api/v1/chat/completions
    self-hosted-model: mistral-small
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}
    CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
    OPENWEBUI_API_KEY: ${{ secrets.OPENWEBUI_API_KEY }}
```

## 🎯 Task Modes

### Code Review (`review`)
Provides detailed code review with inline comments, best practices, and potential issues.

```yaml
with:
  task: review
```

### Summary (`summary`)
Generates an executive summary of the PR including intent, impact, and risks.

```yaml
with:
  task: summary
```

### Suggestions (`suggestions`)
Offers actionable improvement suggestions for the codebase.

```yaml
with:
  task: suggestions
  # Alias: task: suggest
```

## ⚙️ Configuration Options

### All Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `pr-number` | Auto-detected | Pull request number to review |
| `repository` | `github.repository` | Repository in format `owner/repo` |
| `task` | `review` | Analysis type: `review`, `summary`, or `suggestions` |
| `ai-provider` | `chatgpt,claude,self-hosted` | Provider priority list |
| `chatgpt-model` | `gpt-4o-mini` | OpenAI model to use |
| `claude-model` | `claude-3-5-sonnet-20241022` | Anthropic model to use |
| `self-hosted-endpoint` | - | Self-hosted API endpoint URL |
| `self-hosted-model` | `local-model` | Self-hosted model identifier |
| `self-hosted-token` | - | Self-hosted API token |
| `self-hosted-token-header` | `Authorization` | Token header name |
| `max-files` | `40` | Maximum files to include |
| `max-diff-chars` | `12000` | Max diff characters per file |
| `max-output-tokens` | `16000` | Max response tokens |
| `additional-context` | - | Extra instructions for AI |
| `inline-review` | `true` | Enable inline review comments |
| `max-completion-tokens-mode` | `auto` | ChatGPT token parameter mode |

### Environment Variables (All Optional)

You can set these as repository secrets or environment variables:

**GitHub:**
- `GITHUB_TOKEN` (required) - Automatically provided by Actions

**ChatGPT/OpenAI:**
- `CHATGPT_API_KEY` or `OPENAI_API_KEY`

**Claude/Anthropic:**
- `CLAUDE_API_KEY` or `ANTHROPIC_API_KEY`

**Self-Hosted/Open WebUI:**
- `SELF_HOSTED_API_KEY`
- `OPENWEBUI_API_KEY`
- `SELF_HOSTED_TOKEN`

**Configuration Overrides:**
- `AI_PROVIDER` - Override default provider list
- `MAX_FILES` - Override max files
- `MAX_DIFF_CHARS` - Override max diff chars
- `MAX_OUTPUT_TOKENS` - Override max tokens
- `ADDITIONAL_CONTEXT` - Override additional context
- `PR_NUMBER` - Override PR number

## 📂 Repository Guidance Files

Drop these files in `.github/` to customize AI behavior:

| File | Purpose |
|------|---------|
| `.github/review-instructions.md` | Team-specific review guidelines |
| `.github/review-rulesets.md` | Strict policies and compliance rules |
| `.github/review-ignorelist.txt` | File patterns to exclude (one per line) |
| `.github/prompts/review.md` | Custom prompt template for reviews |
| `.github/prompts/summary.md` | Custom prompt template for summaries |
| `.github/prompts/suggestions.md` | Custom prompt template for suggestions |

The action automatically loads these files without requiring repository checkout.

## 💬 PR Comment Commands

Trigger reviews on-demand by commenting on any PR:

- `/review` - Full code review
- `/summary` - Executive summary  
- `/suggestion` - Improvement suggestions

**Setup:** Add `.github/workflows/ai-review-on-command.yml` from the examples folder.

## 📊 Coverage & Security Reports

### Test Coverage

[![codecov](https://codecov.io/gh/ashsaym/ai-code-reviewer/branch/main/graph/badge.svg)](https://codecov.io/gh/ashsaym/ai-code-reviewer)

View detailed coverage reports at [Codecov](https://codecov.io/gh/ashsaym/ai-code-reviewer)

Current coverage: **71%+** across:
- Lines: 71%
- Functions: 75%
- Branches: 63%
- Statements: 71%

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

## 📝 Examples

### Complete Workflow Example

```yaml
name: AI Code Review

on:
  pull_request:
    types: [opened, reopened, synchronize]

jobs:
  ai-review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    
    steps:
      - name: AI Code Review
        uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.0.0
        with:
          pr-number: ${{ github.event.pull_request.number }}
          task: review
          ai-provider: chatgpt,claude
          chatgpt-model: gpt-4o-mini
          max-files: 60
          max-diff-chars: 18000
          additional-context: |
            Focus on security issues and performance problems.
            Check for proper error handling.
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}
          CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
```

### Matrix Strategy for All Tasks

```yaml
jobs:
  ai-review:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        task: [review, summary, suggestions]
    
    steps:
      - uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.0.0
        with:
          pr-number: ${{ github.event.pull_request.number }}
          task: ${{ matrix.task }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}
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
