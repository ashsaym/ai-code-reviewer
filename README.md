# 🤖 Code Sentinel AI

[![CI/CD](https://github.com/ashsaym/ai-code-reviewer/actions/workflows/code-sentinel-ai-ci.yml/badge.svg)](https://github.com/ashsaym/ai-code-reviewer/actions/workflows/code-sentinel-ai-ci.yml)
[![codecov](https://codecov.io/gh/ashsaym/ai-code-reviewer/branch/v2-rewrite/graph/badge.svg)](https://codecov.io/gh/ashsaym/ai-code-reviewer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)

> **Production-ready AI code reviewer** with zero external dependencies. Intelligent, incremental, and GitHub-native.

### 💬 Comment Commands
Trigger different modes via PR comments:
- `/review` - Perform code review
- `/summary` - Generate PR summary
- `/suggestion` - Generate code suggestions
- `/description` - Generate PR description

## ✨ Features

### 🎯 Core Capabilities
- **🧠 Smart AI Reviews** - Powered by OpenAI GPT-5-mini, GPT-4o, GPT-4-turbo, or self-hosted models
- **⚡ Incremental Analysis** - Reviews only changed code, not the entire PR
- **💾 GitHub-Native Caching** - Uses GitHub Actions Cache API (no external services)
- **🔄 Outdated Comment Cleanup** - Automatically marks outdated comments on updated code
- **📊 Multi-Mode Operation** - Supports review, summary, suggestion, and description modes via comments
- **🎨 Customizable Templates** - Use Handlebars templates for custom prompts
- **🚀 Zero Dependencies** - No Redis, PostgreSQL, or S3 required

### 🏗️ Architecture Highlights
- **TypeScript** - Full type safety and modern tooling
- **Modular Design** - 50+ focused, testable modules
- **Production-Ready** - Comprehensive error handling, logging, and retry logic
- **Extensible Providers** - Easy to add new LLM providers (one file per provider)
- **Fast & Efficient** - 60%+ cache hit rate, parallel processing

## 🚀 Quick Start

### 1. Add to Your Workflow

Create `.github/workflows/code-review.yml`:

```yaml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write
  checks: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: AI Code Review
        uses: ashsaym/code-sentinel-ai@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          api-key: ${{ secrets.OPENAI_API_KEY }}
          provider: 'openai'
          model: 'gpt-5-mini'
```

### 2. Set Your API Key

Add your OpenAI API key to GitHub Secrets:
1. Go to **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Name: `OPENAI_API_KEY`
4. Value: Your OpenAI API key

### 3. Done! 🎉

Open a PR and watch Code Sentinel review your code automatically.

## 📖 Configuration

### Input Parameters

| Parameter | Description | Required | Default |
|-----------|-------------|----------|---------|
| `github-token` | GitHub token for API access | ✅ | `${{ github.token }}` |
| `api-key` | API key for AI provider | ✅ | - |
| `mode` | Operation mode: `review`, `summary`, `suggestion`, or `description` (auto-detected from comments) | ❌ | `review` |
| `provider` | AI provider (`openai` or `openwebui`) | ❌ | `openai` |
| `model` | AI model to use | ❌ | `gpt-5-mini` |
| `max-completion-tokens-mode` | Enable max_completion_tokens for newer models | ❌ | `false` |
| `api-endpoint` | Custom API endpoint (required for `openwebui` provider) | ❌ | - |
| `include-patterns` | File patterns to include (comma or newline separated) | ❌ | `**/*.{js,ts,jsx,tsx,py,java,go,rb,php,cs,cpp,c,rs,swift,kt}` |
| `exclude-patterns` | File patterns to exclude (comma or newline separated) | ❌ | `**/node_modules/**, **/dist/**, **/build/**, **/*.min.js, **/*.lock` |
| `max-files-per-batch` | Maximum files to review in one AI call | ❌ | `10` |
| `max-lines-per-file` | Maximum lines to review per file | ❌ | `500` |
| `auto-clean-outdated` | Automatically mark outdated comments | ❌ | `true` |
| `incremental-mode` | Enable incremental review mode | ❌ | `true` |
| `enable-check-runs` | Enable GitHub Check Runs for review history | ❌ | `true` |
| `check-name` | Name for the GitHub Check Run | ❌ | `Code Sentinel AI Review` |
| `custom-prompt-path` | Path to custom prompt template (Handlebars) | ❌ | - |
| `custom-rules` | Custom review rules to add to the prompt | ❌ | - |
| `cache-enabled` | Enable GitHub Actions cache | ❌ | `true` |
| `cache-ttl-days` | Cache TTL in days (1-7) | ❌ | `7` |
| `debug-mode` | Enable debug logging | ❌ | `false` |

### Example: Self-Hosted Models

```yaml
- name: AI Code Review (Self-Hosted)
  uses: ashsaym/code-sentinel-ai@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    api-key: ${{ secrets.OPENWEBUI_API_KEY }}
    provider: 'openwebui'
    model: 'llama3.1:70b'
    api-endpoint: 'https://your-openwebui-instance.com'
```

### Example: Strict Review Mode

```yaml
- name: AI Code Review (Strict)
  uses: ashsaym/code-sentinel-ai@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    api-key: ${{ secrets.OPENAI_API_KEY }}
    model: 'gpt-4o'  # More powerful model
    max-files-per-batch: 20
    max-lines-per-file: 1000
    incremental-mode: true
    enable-check-runs: true
    debug-mode: true
```

## 🎨 Customization

### Custom Prompt Templates

Create custom templates in your repository:

```
.github/
└── code-sentinel-ai/
    └── templates/
        └── review.hbs       # Custom review prompt
```

**Example: `.github/code-sentinel-ai/templates/review.hbs`**

```handlebars
You are a senior {{language}} developer reviewing a pull request.

**PR Title:** {{prTitle}}
**Files Changed:** {{filesCount}}

{{#each files}}
### File: {{this.path}}
```{{this.language}}
{{this.diff}}
```
{{/each}}

**Instructions:**
- Focus on security vulnerabilities
- Check for performance issues
- Verify error handling
- Suggest improvements

**Format:** Provide line-by-line comments with severity (🔴 Critical, 🟡 Warning, 🟢 Info)
```

## 📊 Performance & Caching

Code Sentinel uses **GitHub Actions Cache API** for intelligent caching:

- **File Content Hashing** - Detects actual code changes (not just commits)
- **60%+ Cache Hit Rate** - Avoids re-reviewing unchanged code
- **7-Day Cache TTL** - Automatic cleanup
- **Parallel Processing** - Reviews multiple files simultaneously

### Cache Strategy

```typescript
// Cached items:
✅ File hashes (SHA-256)
✅ Previous review comments
✅ LLM responses (by hash)
✅ PR metadata

// Not cached:
❌ API tokens
❌ Temporary state
```

## 🏗️ Architecture

```
code-sentinel-ai/
├── src/
│   ├── core/           # Orchestration & workflow
│   ├── storage/        # GitHub-native caching
│   ├── github/         # GitHub API integration
│   ├── providers/      # LLM providers (OpenAI, OpenWebUI)
│   ├── prompts/        # Template management
│   ├── analysis/       # Incremental analysis
│   ├── description/    # PR description generation
│   ├── suggestion/     # Code suggestions
│   ├── summary/        # PR summary generation
│   ├── parsers/        # Response parsing
│   └── utils/          # Logging, retry, token counting
├── tests/
│   ├── unit/          # Unit tests (>80% coverage)
│   ├── integration/   # Integration tests
│   └── e2e/           # End-to-end tests
└── dist/              # Built action (auto-generated)
```

### Key Components

| Module | Responsibility |
|--------|---------------|
| `ActionOrchestrator` | Main workflow coordinator & mode routing |
| `ReviewEngine` | Review processing logic |
| `SummaryService` | PR summary generation |
| `SuggestionService` | Code suggestion generation |
| `DescriptionService` | PR description generation |
| `StorageManager` | Unified caching interface |
| `GitHubClient` | GitHub API wrapper with retry/throttling |
| `ProviderFactory` | LLM provider registry |
| `IncrementalAnalyzer` | Delta detection |
| `OutdatedCommentCleaner` | Comment lifecycle management |

## 🧪 Development

### Prerequisites

- Node.js 20+
- npm 9+
- TypeScript 5.3+

### Setup

```bash
# Clone the repository
git clone https://github.com/ashsaym/ai-code-reviewer.git
cd ai-code-reviewer/code-sentinel-ai

# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build the action
npm run build

# Lint & typecheck
npm run lint
npm run typecheck
```

### Project Scripts

```json
{
  "build": "Build production bundle + copy templates",
  "test": "Run all tests",
  "test:coverage": "Run tests with coverage report",
  "test:unit": "Run unit tests only",
  "test:integration": "Run integration tests only",
  "lint": "Run ESLint",
  "typecheck": "Run TypeScript type checking",
  "validate": "Lint + typecheck + test + build (pre-push)"
}
```

## 🧪 Testing

[![Coverage](https://codecov.io/gh/ashsaym/ai-code-reviewer/branch/v2-rewrite/graphs/sunburst.svg)](https://codecov.io/gh/ashsaym/ai-code-reviewer)

### Test Coverage

- **Unit Tests:** Core logic, utilities, parsers
- **Integration Tests:** GitHub API, storage, providers
- **E2E Tests:** Full workflow simulation
- **Target Coverage:** >80%

### Running Tests Locally

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Open coverage HTML
open coverage/lcov-report/index.html
```

## 🤝 Contributing

Contributions are welcome! Please see:

- [Architecture Documentation](./docs/ARCHITECTURE.md)
- [Implementation Plan](./docs/IMPLEMENTATION_PLAN.md)
- [Migration Guide](./docs/MIGRATION_PLAN.md)

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes in `code-sentinel-ai/src/`
4. Add tests in `code-sentinel-ai/tests/`
5. Run `npm run validate` (lint + typecheck + test + build)
6. Commit your changes (`git commit -m 'feat: add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## 📝 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🙏 Acknowledgments

- OpenAI for GPT models
- GitHub Actions team for excellent platform
- Open source community for inspiration and feedback

## 📧 Support

- **Issues:** [GitHub Issues](https://github.com/ashsaym/ai-code-reviewer/issues)
- **Discussions:** [GitHub Discussions](https://github.com/ashsaym/ai-code-reviewer/discussions)
- **Email:** [ashsaym@users.noreply.github.com](mailto:ashsaym@users.noreply.github.com)

---

<div align="center">

**[⭐ Star this project](https://github.com/ashsaym/ai-code-reviewer)** if you find it useful!

Made with ❤️ by [ashsaym](https://github.com/ashsaym)

</div>
