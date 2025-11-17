# AI Code Reviewer

[![Test Status](https://github.com/ashsaym/ai-code-reviewer/actions/workflows/test.yml/badge.svg)](https://github.com/ashsaym/ai-code-reviewer/actions/workflows/test.yml)
[![CodeQL](https://github.com/ashsaym/ai-code-reviewer/actions/workflows/codeql.yml/badge.svg)](https://github.com/ashsaym/ai-code-reviewer/actions/workflows/codeql.yml)
[![Security Scan](https://github.com/ashsaym/ai-code-reviewer/actions/workflows/security-scan.yml/badge.svg)](https://github.com/ashsaym/ai-code-reviewer/actions/workflows/security-scan.yml)
[![codecov](https://codecov.io/gh/ashsaym/ai-code-reviewer/branch/main/graph/badge.svg)](https://codecov.io/gh/ashsaym/ai-code-reviewer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Discussions](https://img.shields.io/github/discussions/ashsaym/ai-code-reviewer)](https://github.com/ashsaym/ai-code-reviewer/discussions)
[![GitHub contributors](https://img.shields.io/github/contributors/ashsaym/ai-code-reviewer)](https://github.com/ashsaym/ai-code-reviewer/graphs/contributors)

A powerful, production-ready GitHub Action that brings AI-powered code reviews to your pull requests. Supports multiple AI providers with intelligent fallback, inline comments, and comprehensive analysis modes.

> 💬 [Join our discussions](https://github.com/ashsaym/ai-code-reviewer/discussions) | 🗺️ [View roadmap](ROADMAP.md) | 🤝 [Contribute](CONTRIBUTING.md) | 🔒 [Security](SECURITY.md)

## 🚀 Quick Start

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
          reviewer-name: "AI Code Reviewer Bot"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}
```

## ✨ Features

### 🤖 Multi-Provider Support
- **ChatGPT (OpenAI)**: gpt-5-mini, gpt-4o, gpt-4-turbo, o1, o3
- **Claude (Anthropic)**: claude-3-5-sonnet, claude-3-opus, claude-3-sonnet, claude-3-haiku
- **Self-Hosted**: Open WebUI, LocalAI, Ollama, LM Studio, vLLM, and any OpenAI-compatible API
- **Smart Fallback**: Automatically tries next provider if one fails

### 📝 Analysis Modes
- **Code Review** (`review`): Detailed line-by-line review with inline comments
- **Summary** (`summary`): Executive summary of changes, impact, and risks
- **Suggestions** (`suggestions`): Actionable improvement recommendations
- **PR Description** (`description`): Auto-generate/update PR descriptions

### 💬 Interactive Features
- **Slash Commands**: `/review`, `/summary`, `/suggestion`, `/description`
- **Inline Comments**: GitHub-style line-by-line feedback
- **Position-Based**: Accurate comment placement on changed lines
- **Threaded Discussions**: Comments appear in correct file context

### 📊 Customization & Control
- **Repository Guidance**: Load custom instructions from `.github/` files
- **Custom Prompts**: Override default prompts with your templates
- **Ignore Patterns**: Exclude files with glob patterns
- **Token Limits**: Configurable limits for cost control
- **Custom Reviewer Name**: Personalize the AI reviewer identity

### 🔒 Security & Quality
- **Minimal Permissions**: Only requests necessary GitHub access
- **78%+ Test Coverage**: 168 comprehensive tests
- **Security Scanning**: CodeQL, Trivy, Gitleaks, Dependency Review
- **Input Validation**: All inputs sanitized and validated
- **No Data Storage**: Action doesn't persist any PR data

## 📦 Installation

### Option 1: Direct GitHub Action (Recommended)

Add a workflow file to `.github/workflows/ai-review.yml`:

```yaml
name: AI Code Review

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
      - name: AI Code Review
        uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.1.0
        with:
          pr-number: ${{ github.event.pull_request.number }}
          task: review
          ai-provider: chatgpt,claude,self-hosted  # Try in order
          chatgpt-model: gpt-5-mini
          max-output-tokens: 16000
          inline-review: "true"
          reviewer-name: "AI Code Reviewer Bot"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}
          CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
```

### Option 2: Using Example Templates

We provide production-ready examples for each provider:

```bash
# Copy example workflow for your preferred provider
cp next-gen-ai-reviewer/examples/.github/workflows/ai-review-openai.yml .github/workflows/
# or
cp next-gen-ai-reviewer/examples/.github/workflows/ai-review-claude.yml .github/workflows/
# or
cp next-gen-ai-reviewer/examples/.github/workflows/ai-review-selfhosted.yml .github/workflows/

# Copy guidance files (optional but recommended)
mkdir -p .github/prompts
cp next-gen-ai-reviewer/examples/.github/review-*.* .github/
cp next-gen-ai-reviewer/examples/.github/prompts/*.md .github/prompts/
```

See detailed setup instructions in [next-gen-ai-reviewer/examples/README.md](next-gen-ai-reviewer/examples/README.md)

## 🎯 AI Provider Setup

### ChatGPT (OpenAI)

```yaml
- uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.1.0
  with:
    pr-number: ${{ github.event.pull_request.number }}
    task: review
    ai-provider: chatgpt
    chatgpt-model: gpt-5-mini  # or gpt-4o, gpt-4-turbo
    max-completion-tokens-mode: auto  # auto-detect token parameter
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}
```

**Setup:**
1. Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add as repository secret: `CHATGPT_API_KEY` or `OPENAI_API_KEY`
3. Choose model based on needs (gpt-5-mini is cost-effective)

**Models:**
- `gpt-5-mini`: Cost-effective, excellent quality (recommended)
- `gpt-4o`: Advanced reasoning, multimodal
- `gpt-4-turbo`: Powerful, higher cost
- `o1`, `o3`: Reasoning models for complex analysis

### Claude (Anthropic)

```yaml
- uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.1.0
  with:
    pr-number: ${{ github.event.pull_request.number }}
    task: review
    ai-provider: claude
    claude-model: claude-3-5-sonnet-20241022
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
```

**Setup:**
1. Get API key from [Anthropic Console](https://console.anthropic.com/)
2. Add as repository secret: `CLAUDE_API_KEY` or `ANTHROPIC_API_KEY`
3. Choose model based on requirements

**Models:**
- `claude-3-5-sonnet-20241022`: Best balance (recommended)
- `claude-3-opus`: Most capable, highest cost
- `claude-3-sonnet`: Good balance
- `claude-3-haiku`: Fastest, most cost-effective

### Self-Hosted / Open WebUI

```yaml
- uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.1.0
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

**Setup:**
1. Deploy your OpenAI-compatible endpoint
2. Add endpoint URL as secret: `OPENWEBUI_URL` or `SELF_HOSTED_ENDPOINT`
3. (Optional) Add API key as secret: `OPENWEBUI_API_KEY`

**Supported Platforms:**
- Open WebUI
- LocalAI
- Ollama (with OpenAI compatibility)
- LM Studio
- vLLM
- text-generation-webui
- Any OpenAI-compatible API

**Recommended Models:**
- `mistral-small`, `mistral-medium`: General purpose
- `deepseek-coder`, `qwen2.5-coder`: Excellent for code
- `codellama`: Code-optimized
- `llama3`, `llama3.1`: Versatile, good quality

## 🎮 Task Modes

### Code Review (`review`)
Provides comprehensive code review with inline comments on specific lines.

```yaml
with:
  task: review
  inline-review: "true"  # Enable GitHub-style line comments
```

**Output:**
- ✅ Inline comments on specific code lines
- ✅ Issues categorized by severity
- ✅ Best practices and improvement suggestions
- ✅ Potential bugs and security concerns

### Summary (`summary`)
Generates executive summary of PR changes, impact, and risks.

```yaml
with:
  task: summary
```

**Output:**
- 📋 What changed and why
- 📋 Potential impacts and risks
- 📋 Key areas requiring attention
- 📋 Overall assessment

### Suggestions (`suggestions`)
Offers actionable improvement recommendations.

```yaml
with:
  task: suggestions
```

**Output:**
- 💡 Specific improvement ideas
- 💡 Code quality enhancements
- 💡 Performance optimizations
- 💡 Best practice implementations

### PR Description (`description`)
Auto-generates or updates PR description with comprehensive summary.

```yaml
with:
  task: description
```

**Output:**
- 📝 Clear description of changes
- 📝 Type of change (feature, bugfix, etc.)
- 📝 List of specific modifications
- 📝 Testing considerations
- 📝 Related issues

**Slash Command:** Comment `/description` on any PR to trigger

## 💬 Slash Commands

Enable interactive AI analysis by commenting on your PRs.

### Setup

Add `.github/workflows/ai-review-on-command.yml`:

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
    if: |
      github.event.issue.pull_request &&
      (startsWith(github.event.comment.body, '/review') ||
       startsWith(github.event.comment.body, '/suggestion') ||
       startsWith(github.event.comment.body, '/summary') ||
       startsWith(github.event.comment.body, '/description'))
    
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: refs/pull/${{ github.event.issue.number }}/head
      
      - name: Parse command
        id: parse
        run: |
          COMMENT="${{ github.event.comment.body }}"
          if [[ "$COMMENT" =~ ^/review ]]; then
            echo "task=review" >> "$GITHUB_OUTPUT"
          elif [[ "$COMMENT" =~ ^/suggestion ]]; then
            echo "task=suggestions" >> "$GITHUB_OUTPUT"
          elif [[ "$COMMENT" =~ ^/summary ]]; then
            echo "task=summary" >> "$GITHUB_OUTPUT"
          elif [[ "$COMMENT" =~ ^/description ]]; then
            echo "task=description" >> "$GITHUB_OUTPUT"
          fi
      
      - uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.1.0
        with:
          pr-number: ${{ github.event.issue.number }}
          task: ${{ steps.parse.outputs.task }}
          reviewer-name: "AI Code Reviewer Bot"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}
```

### Available Commands

| Command | Description | Output |
|---------|-------------|--------|
| `/review` | Full code review with inline comments | Detailed review with findings |
| `/summary` | Executive summary | High-level overview |
| `/suggestion` | Improvement suggestions | Actionable recommendations |
| `/description` | Generate/update PR description | Updated PR description |

## ⚙️ Configuration

### All Input Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `pr-number` | Auto-detected | Pull request number to review |
| `repository` | `github.repository` | Repository in format `owner/repo` |
| `task` | `review` | Analysis type: `review`, `summary`, `suggestions`, `description` |
| `ai-provider` | `chatgpt,claude,self-hosted` | Provider priority list (comma-separated) |
| `chatgpt-model` | `gpt-5-mini` | OpenAI model to use |
| `claude-model` | `claude-3-5-sonnet-20241022` | Anthropic model to use |
| `self-hosted-endpoint` | - | Self-hosted API endpoint URL |
| `self-hosted-model` | `local-model` | Self-hosted model identifier |
| `self-hosted-token` | - | Self-hosted API token |
| `self-hosted-token-header` | `Authorization` | Token header name |
| `max-files` | `40` | Maximum files to analyze |
| `max-diff-chars` | `12000` | Max diff characters per file |
| `max-output-tokens` | `16000` | Max response tokens |
| `additional-context` | - | Extra instructions for AI |
| `inline-review` | `true` | Enable inline review comments |
| `reviewer-name` | `next-gen-ai-reviewer` | Custom name for AI reviewer |
| `max-completion-tokens-mode` | `auto` | ChatGPT token parameter mode (`auto`, `true`, `false`) |

### Environment Variables

**Required:**
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions

**Provider API Keys (at least one required):**
- `CHATGPT_API_KEY` or `OPENAI_API_KEY`
- `CLAUDE_API_KEY` or `ANTHROPIC_API_KEY`
- `SELF_HOSTED_API_KEY`, `OPENWEBUI_API_KEY`, or `SELF_HOSTED_TOKEN`

**Optional Overrides:**
- `AI_PROVIDER` - Override provider list
- `MAX_FILES` - Override max files
- `MAX_DIFF_CHARS` - Override max diff chars
- `MAX_OUTPUT_TOKENS` - Override max tokens
- `ADDITIONAL_CONTEXT` - Override additional context
- `REVIEWER_NAME` - Override reviewer name
- `PR_NUMBER` - Override PR number

## 📂 Repository Guidance Files

Customize AI behavior by adding these files to your repository's `.github/` directory:

| File | Purpose | Example |
|------|---------|---------|
| `.github/review-instructions.md` | Team-specific review guidelines | [View example](next-gen-ai-reviewer/examples/.github/review-instructions.md) |
| `.github/review-rulesets.md` | Strict policies and compliance rules | [View example](next-gen-ai-reviewer/examples/.github/review-rulesets.md) |
| `.github/review-ignorelist.txt` | File patterns to exclude (one per line) | [View example](next-gen-ai-reviewer/examples/.github/review-ignorelist.txt) |
| `.github/prompts/review.md` | Custom prompt template for reviews | [View example](next-gen-ai-reviewer/examples/.github/prompts/review.md) |
| `.github/prompts/summary.md` | Custom prompt template for summaries | [View example](next-gen-ai-reviewer/examples/.github/prompts/summary.md) |
| `.github/prompts/suggestions.md` | Custom prompt template for suggestions | [View example](next-gen-ai-reviewer/examples/.github/prompts/suggestions.md) |

The action automatically loads these files without requiring repository checkout.

**Template Placeholders:**
- `{{taskLabel}}`, `{{prHeader}}`, `{{prDescription}}`
- `{{fileSummaries}}`, `{{fileCount}}`
- `{{instructions}}`, `{{rulesets}}`, `{{teamNotes}}`
- `{{ignorePatterns}}`, `{{ignoredFiles}}`

## 📊 Test Coverage & Quality

[![codecov](https://codecov.io/gh/ashsaym/ai-code-reviewer/branch/main/graph/badge.svg)](https://codecov.io/gh/ashsaym/ai-code-reviewer)

**Current Coverage: 78%+**
- Lines: 78%
- Functions: 79%
- Branches: 67%
- Statements: 78%

**Test Suite:**
- 168 comprehensive tests
- Unit tests for all core modules
- Integration test structure
- Edge case coverage
- Error path validation

View detailed coverage at [Codecov](https://codecov.io/gh/ashsaym/ai-code-reviewer)

## 🔒 Security

This project takes security seriously:

- **CodeQL Analysis**: Continuous security scanning
- **Trivy Scanning**: Dependency vulnerability detection
- **Gitleaks**: Secret leakage prevention
- **Dependency Review**: PR dependency analysis
- **Minimal Permissions**: Only necessary access requested
- **No Data Storage**: Action doesn't persist any data

**Security Status:** ✅ No known vulnerabilities (v1.1.0)

View our [Security Policy](SECURITY.md) | Report issues via [GitHub Security Advisories](https://github.com/ashsaym/ai-code-reviewer/security/advisories)

## 🧪 Development

### Setup

```bash
cd next-gen-ai-reviewer
npm install
```

### Running Tests

```bash
npm test                 # Run all tests with coverage
npm run test:unit        # Run only unit tests
npm run test:integration # Run only integration tests
npm run test:watch       # Watch mode for development
```

### Linting

```bash
npm run lint            # Check code quality
npm run lint:fix        # Auto-fix issues
```

### Local Testing

Use [act](https://github.com/nektos/act) to test workflows locally:

```bash
# Install act
brew install act  # macOS
# or download from https://github.com/nektos/act/releases

# Test workflow locally
act pull_request -e .github/test-event.json
```

## 📝 Advanced Examples

### Multi-Provider Fallback

```yaml
- uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.1.0
  with:
    pr-number: ${{ github.event.pull_request.number }}
    task: review
    ai-provider: chatgpt,claude,self-hosted  # Try in order
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

### Matrix Strategy (Multiple Tasks)

```yaml
jobs:
  ai-review:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        task: [review, summary, suggestions]
    steps:
      - uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.1.0
        with:
          pr-number: ${{ github.event.pull_request.number }}
          task: ${{ matrix.task }}
          ai-provider: chatgpt
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}
```

### Conditional Review Based on Labels

```yaml
jobs:
  ai-review:
    if: contains(github.event.pull_request.labels.*.name, 'needs-review')
    runs-on: ubuntu-latest
    steps:
      - uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.1.0
        with:
          pr-number: ${{ github.event.pull_request.number }}
          task: review
          chatgpt-model: gpt-4o  # Use more powerful model for labeled PRs
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}
```

### Custom Instructions

```yaml
- uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.1.0
  with:
    pr-number: ${{ github.event.pull_request.number }}
    task: review
    additional-context: |
      Focus on:
      - Security vulnerabilities (OWASP Top 10)
      - Performance bottlenecks
      - Test coverage for new code
      - Documentation completeness
      - Breaking changes that affect APIs
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}
```

More examples in [next-gen-ai-reviewer/examples/](next-gen-ai-reviewer/examples/)

## 🎓 Best Practices

### 1. Start with Review Mode
Begin with `task: review` to get comprehensive feedback on your PRs.

### 2. Use Ignore Patterns
Exclude generated files, documentation, and test fixtures:
```txt
# .github/review-ignorelist.txt
dist/**
build/**
*.min.js
**/__snapshots__/**
docs/**
```

### 3. Set Appropriate Token Limits
Balance cost and coverage:
- Small PRs: `max-output-tokens: 8000`
- Medium PRs: `max-output-tokens: 16000`
- Large PRs: `max-output-tokens: 32000` (ChatGPT only)

### 4. Leverage Multi-Provider Fallback
Ensure reliability with provider fallback:
```yaml
ai-provider: chatgpt,claude,self-hosted
```

### 5. Customize for Your Team
Add team-specific guidelines in `.github/review-instructions.md`

### 6. Use Slash Commands for Interactive Reviews
Enable on-demand reviews with `/review`, `/summary`, etc.

### 7. Monitor Costs
- Use cost-effective models (gpt-5-mini, claude-3-haiku)
- Set max-files and max-diff-chars appropriately
- Consider self-hosted for high-volume repositories

## 🔧 Troubleshooting

### Issue: Workflow doesn't run
**Solutions:**
- Check workflow file is in `.github/workflows/`
- Verify YAML syntax is valid
- Ensure `pull_request` trigger is configured
- Check repository Actions are enabled

### Issue: Authentication failed
**Solutions:**
- Verify secret names match exactly (`CHATGPT_API_KEY`)
- Check API key is valid and active
- Ensure key has proper permissions/quotas
- Test API key with curl

### Issue: Review is incomplete
**Solutions:**
- Increase `max-output-tokens`
- Reduce `max-files` if too many files changed
- Use `review-ignorelist.txt` to exclude files
- Split large PRs into smaller ones

### Issue: Rate limits
**Solutions:**
- Use cheaper models or self-hosted
- Add concurrency controls
- Implement delays between reviews
- Consider caching (upcoming feature)

### Issue: Self-hosted connection failed
**Solutions:**
- Verify endpoint URL is correct
- Check firewall allows GitHub Actions IPs
- Ensure model is loaded and ready
- Test endpoint accessibility

For more help, see [GitHub Discussions](https://github.com/ashsaym/ai-code-reviewer/discussions)

## 🗺️ Roadmap

### Current Version: v1.1.0

**Completed:**
- ✅ Multi-provider support (ChatGPT, Claude, Self-hosted)
- ✅ Inline review comments with position-based placement
- ✅ Slash command support
- ✅ 78%+ test coverage with 168 tests
- ✅ Comprehensive security scanning
- ✅ Production-ready examples for all providers

**Coming Soon:**
- 🔜 Gemini (Google AI) support
- 🔜 Incremental reviews (only new commits)
- 🔜 Multi-file context awareness
- 🔜 Review caching for cost optimization

View the full [Roadmap](ROADMAP.md)

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**: Follow our coding standards
4. **Run tests**: `npm test` (must pass)
5. **Run linting**: `npm run lint` (must pass)
6. **Commit changes**: `git commit -m 'Add amazing feature'`
7. **Push to branch**: `git push origin feature/amazing-feature`
8. **Open a Pull Request**

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

### Areas for Contribution
- 🐛 Bug fixes
- ✨ New features
- 📝 Documentation improvements
- 🌐 Translations
- 🧪 Test coverage
- 💡 Feature suggestions

## 📄 License

[MIT License](LICENSE) - see LICENSE file for details.

## 🙏 Acknowledgments

Built with:
- [OpenAI API](https://platform.openai.com/) - ChatGPT models
- [Anthropic Claude API](https://www.anthropic.com/) - Claude models
- [GitHub Actions](https://github.com/features/actions) - CI/CD platform
- [Jest](https://jestjs.io/) - Testing framework
- [ESLint](https://eslint.org/) - Code quality

## 🌟 Show Your Support

If you find this project useful:
- ⭐ Star the repository
- 🐛 Report bugs and issues
- 💡 Suggest new features
- 🤝 Contribute code
- 📢 Share with others

## 📞 Support & Community

### Get Help
- 💬 [GitHub Discussions](https://github.com/ashsaym/ai-code-reviewer/discussions) - Ask questions, share ideas
- 🐛 [Issue Tracker](https://github.com/ashsaym/ai-code-reviewer/issues) - Report bugs
- 📖 [Documentation](https://github.com/ashsaym/ai-code-reviewer) - Read the docs
- 💼 [Examples](next-gen-ai-reviewer/examples/) - See real-world usage

### Stay Updated
- 🔔 Watch the repository for updates
- 📰 Follow our [changelog](next-gen-ai-reviewer/CHANGELOG.md)
- 🗺️ Check the [roadmap](ROADMAP.md)

### Connect
- 🌟 [Star the repo](https://github.com/ashsaym/ai-code-reviewer)
- 👥 [Meet our contributors](CONTRIBUTORS.md)
- 🏆 [Community projects](COMMUNITY_PROJECTS.md)

---

**Made with ❤️ by the community**

[![GitHub stars](https://img.shields.io/github/stars/ashsaym/ai-code-reviewer?style=social)](https://github.com/ashsaym/ai-code-reviewer/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/ashsaym/ai-code-reviewer?style=social)](https://github.com/ashsaym/ai-code-reviewer/network/members)
