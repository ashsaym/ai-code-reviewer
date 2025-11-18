# 🛡️ Code Sentinel AI

[![Test Status](https://github.com/ashsaym/ai-code-reviewer/actions/workflows/test.yml/badge.svg?branch=v2-rewrite)](https://github.com/ashsaym/ai-code-reviewer/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Discussions](https://img.shields.io/github/discussions/ashsaym/ai-code-reviewer)](https://github.com/ashsaym/ai-code-reviewer/discussions)
[![GitHub contributors](https://img.shields.io/github/contributors/ashsaym/ai-code-reviewer)](https://github.com/ashsaym/ai-code-reviewer/graphs/contributors)

**Production-ready AI code sentinel with zero external dependencies - OpenAI GPT-5-mini default**

A next-generation GitHub Action that brings intelligent, incremental code reviews to your pull requests. Built with TypeScript, featuring GitHub-native caching, and zero external services required.

> 🚧 **Status:** Phase 1 - Foundation (30% complete) | **Branch:** `v2-rewrite`  
> 💬 [Join discussions](https://github.com/ashsaym/ai-code-reviewer/discussions) | 📖 [Read docs](docs/) | 🤝 [Contribute](v1/CONTRIBUTING.md)

## 🚀 Quick Start

### V2 (In Development - v2-rewrite branch)

```yaml
name: Code Sentinel AI

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      checks: write
    steps:
      - name: Code Sentinel AI Review
        uses: ashsaym/ai-code-reviewer/v2@v2-rewrite
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
```

### V1 (Stable - Production Ready)

See [v1/README-v1.md](v1/README-v1.md) for full v1 documentation.

```yaml
- uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.0.0
  with:
    pr-number: ${{ github.event.pull_request.number }}
    task: review
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}
```

## ✨ What's New in V2?

| Feature | V1 | V2 |
|---------|----|----|
| **Language** | JavaScript | TypeScript 5.3 |
| **Storage** | None | GitHub Cache + PR Comments |
| **Incremental Reviews** | ❌ | ✅ GitHub-native caching |
| **Outdated Comment Cleanup** | ❌ | ✅ Automatic detection |
| **State Tracking** | ❌ | ✅ Per-file, per-line |
| **Check Runs** | ❌ | ✅ Review history |
| **Token Tracking** | ❌ | ✅ GPT-4 Tokenizer |
| **Response Parser** | Basic | ✅ Schema validation (Zod) |
| **Error Handling** | Basic | ✅ Retry + circuit breaker |
| **Dependencies** | Redis/DB needed | ✅ Zero external services |
| **Test Coverage** | 78% | 🎯 85%+ target |
| **Providers** | ChatGPT, Claude, Self-hosted | OpenAI (default), OpenWebUI |
| **Default Model** | gpt-5-mini | gpt-5-mini |
| **Repo Prompts** | ❌ | ✅ Handlebars templates |

**V2 Core Features:**
- 🚀 **Zero External Dependencies**: Uses only GitHub APIs (Cache, Comments, Check Runs)
- 🔄 **Incremental Analysis**: Reviews only changed lines across commits
- 🧹 **Smart Comment Cleanup**: Auto-resolves outdated inline comments
- 📊 **Token Economics**: Tracks costs per review with GPT-4 tokenizer
- 🎯 **Schema Validation**: Zod-based validation for all configs
- 🔁 **Resilient Retries**: Exponential backoff with circuit breaker
- 📝 **Handlebars Prompts**: Repository-specific prompt templates
- ⚙️ **Modular Architecture**: Pluggable providers, storage, and parsers

## � Documentation

### 📖 Core Documentation
- **[Architecture Guide](docs/ARCHITECTURE.md)** - Complete technical design, diagrams, and decision rationale
- **[Implementation Plan](docs/IMPLEMENTATION_PLAN.md)** - 4-week development roadmap with milestones
- **[Migration Guide](docs/MIGRATION_PLAN.md)** - Step-by-step v1 → v2 upgrade instructions
- **[Progress Tracker](docs/TRACKER.md)** - Real-time implementation status and task tracking

### 🎯 Quick Links
- **[V1 Documentation](v1/README-v1.md)** - Full v1 usage guide (stable, production-ready)
- **[V1 Code](v1/next-gen-ai-reviewer/)** - Legacy JavaScript implementation
- **[Contributing Guide](v1/CONTRIBUTING.md)** - How to contribute
- **[Security Policy](v1/SECURITY.md)** - Vulnerability reporting
- **[Roadmap](v1/ROADMAP.md)** - Future plans and vision

### 🏗️ Repository Structure

```
ai-code-reviewer/
├── README.md                  # This file (overview)
├── v1/                        # Legacy v1 implementation
│   ├── next-gen-ai-reviewer/  # JavaScript codebase
│   ├── README-v1.md           # V1 full documentation
│   ├── CONTRIBUTING.md        # Contribution guide
│   ├── ROADMAP.md             # Project vision
│   └── SECURITY.md            # Security policy
├── v2/                        # New TypeScript implementation (v2-rewrite)
│   ├── src/                   # Source code
│   │   ├── core/              # ActionOrchestrator, ReviewEngine
│   │   ├── storage/           # GitHub Cache, Comment, Check Run storage
│   │   ├── github/            # GitHub API client
│   │   ├── providers/         # OpenAI, OpenWebUI
│   │   ├── prompts/           # Handlebars templates
│   │   ├── analysis/          # Incremental analyzer, comment cleaner
│   │   ├── parsers/           # Response parser, formatter
│   │   └── utils/             # Logger, retry, token counter
│   ├── tests/                 # Test suites (unit, integration, e2e)
│   ├── action.yml             # GitHub Action metadata
│   ├── package.json           # Dependencies
│   ├── tsconfig.json          # TypeScript config
│   └── README.md              # V2 documentation
└── docs/                      # Central documentation hub
    ├── ARCHITECTURE.md        # Technical design
    ├── IMPLEMENTATION_PLAN.md # Development roadmap
    ├── MIGRATION_PLAN.md      # Upgrade guide
    └── TRACKER.md             # Progress tracking
```

## 🚧 Development Status

**Current Phase:** Foundation (Week 1) - 30% Complete

| Phase | Status | Target Date |
|-------|--------|-------------|
| Phase 0: Planning & Documentation | ✅ Complete | Dec 6, 2025 |
| Phase 1: Foundation (Storage, GitHub, Base Provider) | 🚧 In Progress | Dec 13, 2025 |
| Phase 2: Intelligence (Prompts, Incremental, Parser) | ⏳ Pending | Dec 20, 2025 |
| Phase 3: Polish (Tests, Docs, CI/CD) | ⏳ Pending | Dec 27, 2025 |
| Phase 4: Launch (Test Repo, v2.0.0 Release) | ⏳ Pending | Jan 3, 2026 |

**Week 1 Progress:**
- ✅ Repository reorganized (v1 → v1/, docs → docs/)
- ✅ Branding updated to "Code Sentinel AI"
- ✅ TypeScript project initialized
- ✅ Build system configured (Rollup, Jest, ESLint)
- ✅ Action metadata defined (action.yml)
- ⏳ Storage layer implementation
- ⏳ GitHub client implementation
- ⏳ OpenAI provider implementation

See [docs/TRACKER.md](docs/TRACKER.md) for detailed progress tracking.

## 🎯 V2 Configuration (Preview)

### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `github-token` | ✅ | - | GitHub token for API access |
| `openai-api-key` | ✅ | - | OpenAI API key |
| `openai-model` | ❌ | `gpt-5-mini` | OpenAI model (gpt-5-mini, gpt-4o, gpt-4-turbo) |
| `openwebui-endpoint` | ❌ | - | OpenWebUI base URL for self-hosted models |
| `openwebui-api-key` | ❌ | - | OpenWebUI API key |
| `openwebui-model` | ❌ | `mistral-small` | OpenWebUI model identifier |
| `max-files` | ❌ | `50` | Maximum files to analyze per PR |
| `max-tokens` | ❌ | `16000` | Maximum tokens per API request |
| `cache-ttl-days` | ❌ | `7` | GitHub Actions cache retention (1-7 days) |
| `enable-check-runs` | ❌ | `true` | Create check runs for review history |

### Repository Prompts (Handlebars Templates)

Place custom prompt templates in `.github/prompts/`:

**`.github/prompts/review.hbs`**
```handlebars
You are reviewing code for {{repository}}.

PR Title: {{pr_title}}
Branch: {{branch}}

{{#if custom_rules}}
Custom Rules:
{{custom_rules}}
{{/if}}

Files Changed: {{file_count}}
{{#each files}}
- {{this.filename}} (+{{this.additions}} -{{this.deletions}})
{{/each}}

Provide inline review comments in JSON format.
```

**Variables Available:**
- `repository`, `pr_number`, `pr_title`, `pr_body`, `branch`
- `author`, `file_count`, `additions`, `deletions`
- `files[]` - Array of changed files with metadata
- `custom_rules`, `custom_context` - User-defined variables

### V1 Configuration

For V1 configuration options, see [v1/README-v1.md](v1/README-v1.md).

## � Getting Started with V2

### Prerequisites
- Node.js 20+ (for development)
- GitHub repository with Actions enabled
- OpenAI API key or OpenWebUI instance

### Installation

1. **Add workflow file** (`.github/workflows/code-sentinel.yml`):

```yaml
name: Code Sentinel AI

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      checks: write
    steps:
      - name: Code Sentinel AI Review
        uses: ashsaym/ai-code-reviewer/v2@v2-rewrite
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          openai-model: gpt-5-mini
```

2. **Add OpenAI API key** to repository secrets:
   - Go to Settings → Secrets and variables → Actions
   - Add secret: `OPENAI_API_KEY` = `sk-proj-xxxxx`

3. **Create a PR** and watch Code Sentinel AI review your code!

### Advanced: Self-Hosted with OpenWebUI

```yaml
- uses: ashsaym/ai-code-reviewer/v2@v2-rewrite
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    openwebui-endpoint: ${{ secrets.OPENWEBUI_URL }}
    openwebui-api-key: ${{ secrets.OPENWEBUI_API_KEY }}
    openwebui-model: mistral-small
```

## 📝 V1 Workflow Examples

For complete V1 workflow examples (ChatGPT, Claude, Self-hosted, slash commands), see [v1/README-v1.md](v1/README-v1.md).

### Example 1: V1 Basic Review with ChatGPT

Create `.github/workflows/ai-review-chatgpt.yml`:

```yaml
- uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.0.0
  with:
    pr-number: ${{ github.event.pull_request.number }}
    task: review
    ai-provider: chatgpt
    chatgpt-model: gpt-5-mini
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}
```

**More V1 Examples:**
- Claude (Anthropic) integration
- Self-hosted / OpenWebUI setup
- Multi-provider fallback
- Slash commands (`/review`, `/summary`, `/suggestion`)
- Matrix strategy for all tasks

See full examples in [v1/README-v1.md](v1/README-v1.md).

## 🤝 Contributing

We welcome contributions to both v1 and v2!

**For V2 Development:**
- Branch: `v2-rewrite`
- Language: TypeScript 5.3
- Focus: Storage layer, incremental analysis, GitHub-native APIs
- See [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) for roadmap

**For V1 Enhancements:**
- Branch: `main`
- Language: JavaScript
- Focus: Bug fixes, provider improvements, documentation
- See [v1/CONTRIBUTING.md](v1/CONTRIBUTING.md) for guidelines

**Quick Start:**
```bash
# V2 Development
git clone https://github.com/ashsaym/ai-code-reviewer.git
cd ai-code-reviewer
git checkout v2-rewrite
cd v2
npm install
npm test

# V1 Development
git checkout main
cd v1/next-gen-ai-reviewer
npm install
npm test
```

## 🔐 Security

- **Minimal Permissions**: Only requires `contents: read`, `pull-requests: write`, `checks: write`
- **Secret Protection**: Secrets never logged or exposed in comments
- **Vulnerability Scanning**: CodeQL, Trivy, Gitleaks, Dependency Review
- **Regular Updates**: Automated dependency updates via Dependabot

Report security issues: [v1/SECURITY.md](v1/SECURITY.md)

## 📄 License

[MIT License](v1/LICENSE) - See [v1/LICENSE](v1/LICENSE) for details

## 🙏 Acknowledgments

**V2 Built With:**
- [TypeScript](https://www.typescriptlang.org/) - Type-safe language
- [OpenAI API](https://platform.openai.com/) - GPT models
- [GitHub Actions Cache](https://docs.github.com/actions/using-workflows/caching-dependencies) - Zero-cost storage
- [Handlebars](https://handlebarsjs.com/) - Template engine
- [Zod](https://zod.dev/) - Schema validation
- [Rollup](https://rollupjs.org/) - Bundler
- [Jest](https://jestjs.io/) - Testing framework

**V1 Built With:**
- [OpenAI API](https://platform.openai.com/)
- [Anthropic Claude API](https://www.anthropic.com/)
- [GitHub Actions](https://github.com/features/actions)
- [Jest](https://jestjs.io/)

## 🤝 Community & Support

### Get Help
- 💬 [GitHub Discussions](https://github.com/ashsaym/ai-code-reviewer/discussions) - Ask questions, share ideas
- 🐛 [Report Issues](https://github.com/ashsaym/ai-code-reviewer/issues) - Found a bug?
- 📖 [Documentation](docs/) - Read the docs
- 🔍 [V1 Docs](v1/README-v1.md) - Legacy documentation

### Contribute
- 🗺️ [Roadmap](v1/ROADMAP.md) - See what's planned
- 📋 [Progress Tracker](docs/TRACKER.md) - V2 development status
- 🎯 [Good First Issues](https://github.com/ashsaym/ai-code-reviewer/labels/good-first-issue) - New contributors welcome
- 🤝 [Contributing Guide](v1/CONTRIBUTING.md) - How to contribute
- 💝 [Contributors](v1/CONTRIBUTORS.md) - Meet our contributors

### Connect
- ⭐ [Star the repo](https://github.com/ashsaym/ai-code-reviewer) - Show support
- 🐦 Share on social media - Help us grow
- 💬 Join discussions - Share feedback on v2 architecture

---

**Code Sentinel AI** - Made with ❤️ by the community | v2-rewrite in progress 🚧
