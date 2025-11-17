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
    chatgpt-model: gpt-5-mini
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}
```

**Environment Variables:**
- `CHATGPT_API_KEY` or `OPENAI_API_KEY` (required) - Your OpenAI API key

**Configuration:**
- `chatgpt-model` (default: `gpt-5-mini`) - Model to use (gpt-4o, gpt-5-mini, gpt-4-turbo, etc.)
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

### PR Description (`description`)
Generates a comprehensive PR description based on the changes and updates it automatically. Perfect for auto-documenting your PRs.

```yaml
with:
  task: description
```

**Slash Command:** Use `/generate_description` as a PR comment to trigger this task interactively.

### Combined Report (`combined`)
Runs all three analysis tasks (summary, review, suggestions) and combines them into a single comprehensive comment. Saves time and API calls.

```yaml
with:
  task: combined
```

**Slash Command:** Use `/generate_reports` as a PR comment to trigger this task interactively.

## 💬 Slash Commands

Enable interactive AI analysis by commenting on your PRs:

### `/generate_description`
Analyzes all changes in the PR and automatically updates the PR description with a comprehensive summary including:
- Clear description of what changed
- Type of change (bug fix, feature, etc.)
- List of changes made
- Testing notes

### `/generate_reports`
Generates a complete analysis combining summary, code review, and suggestions in **one single comment** instead of multiple separate comments.

To enable slash commands, add the `.github/workflows/ai-slash-commands.yml` workflow to your repository (included in this action).

## ⚙️ Configuration Options

### All Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `pr-number` | Auto-detected | Pull request number to review |
| `repository` | `github.repository` | Repository in format `owner/repo` |
| `task` | `review` | Analysis type: `review`, `summary`, `suggestions`, `description`, or `combined` |
| `ai-provider` | `chatgpt,claude,self-hosted` | Provider priority list |
| `chatgpt-model` | `gpt-5-mini` | OpenAI model to use |
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
