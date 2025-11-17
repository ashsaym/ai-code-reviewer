# Next Gen AI Reviewer

A multi-provider GitHub Action that turns any pull request into an AI-assisted experience. It can compile full code reviews, publish stakeholder summaries, or share actionable suggestions using your own ChatGPT, Claude, or self-hosted (Open WebUI-compatible) models.

## Why build yet another reviewer?
- **Bring your own keys**: Works with `CHATGPT_API_KEY`/`OPENAI_API_KEY`, `CLAUDE_API_KEY`/`ANTHROPIC_API_KEY`, and any Open WebUI-style self-hosted endpoint. Just export those secrets as env vars on the workflow step.
- **Action-native**: Ship it as a reusable workflow step without extra infrastructure.
- **Task aware**: Switch between `review`, `summary`, and `suggestions` modes using a single input.
- **Lean prompts**: Automatically trims PR descriptions and diffs to stay within model limits while preserving context.
- **Extensible**: Provider selection is ordered so you can prioritize your cheapest/fastest model and fall back when it is unavailable.

## Features
- Fetches PR metadata and changed files directly from the GitHub API (no local checkout necessary).
- Builds role-specific prompts with optional team instructions and repo-level guidance files (sample `.github` assets included).
- Calls ChatGPT (OpenAI) or Claude (Anthropic) with temperature tuned for deterministic output.
- Falls back to self-hosted/Open WebUI endpoints when the hosted providers are unavailable.
- Posts nicely formatted Markdown comments back onto the PR.
- Ships with a small Node-based architecture and `node:test` coverage for the prompt builder logic.

## Inputs
| Name | Default | Description |
| --- | --- | --- |
| `pr-number` | _auto_ | Optional. Auto-detected from the workflow event or `PR_NUMBER` env. |
| `repository` | `github.repository` | Useful for cross-repo workflows. Format: `owner/name`. |
| `task` | `review` | One of `review`, `summary`, `suggestions` (aliases like `summarize` or `suggest` also work). |
| `ai-provider` | `chatgpt,claude,self-hosted` | Priority-ordered list (or set `AI_PROVIDER`). |
| `chatgpt-model` | `gpt-4o-mini` | Any ChatGPT-compatible model. |
| `claude-model` | `claude-3-5-sonnet-20241022` | Any Claude-compatible model. |
| `self-hosted-endpoint` | _empty_ | Full URL to an OpenAI-compatible chat completion endpoint (e.g. Open WebUI). |
| `self-hosted-model` | `local-model` | Model identifier passed to the self-hosted endpoint. |
| `self-hosted-token` | _empty_ | Optional token sent to the endpoint (use `${{ secrets.* }}`). |
| `self-hosted-token-header` | `Authorization` | Header name that carries the token (Authorization automatically prepends `Bearer`). |
| `max-files` | `40` | Cap on changed files included in the prompt (`MAX_FILES`). |
| `max-diff-chars` | `12000` | Per-file diff truncation limit (`MAX_DIFF_CHARS`). |
| `additional-context` | _empty_ | Extra guidance appended to every prompt (`ADDITIONAL_CONTEXT`). |
| `max-output-tokens` | `16000` | Response cap applied to every provider (`MAX_OUTPUT_TOKENS`). |
| `max-completion-tokens-mode` | `auto` | Force ChatGPT to use `max_completion_tokens` (`true`), `max_tokens` (`false`), or auto-detect (`auto`). |

## Required secrets
- `GITHUB_TOKEN` – provided automatically inside Actions, but required when testing locally.
- At least one AI key (exported as env vars inside your workflow step):
  - `CHATGPT_API_KEY` or `OPENAI_API_KEY`
  - `CLAUDE_API_KEY` or `ANTHROPIC_API_KEY`
  - `SELF_HOSTED_API_KEY` / `OPENWEBUI_API_KEY` (optional, when targeting self-hosted models)
- Optional inputs or repository variables (`vars.*`) you can set once and re-use across workflows:
  - `chatgpt-model`, `claude-model`, `self-hosted-model`
  - `ai-provider`, `max-files`, `max-diff-chars`, `max-output-tokens`, `additional-context`
  - `max-completion-tokens-mode` - Set to `true` for newer models (gpt-4o, gpt-5-mini, o1, o3) or `false` for older models (gpt-4-turbo, gpt-3.5-turbo). Leave empty/`auto` to auto-detect.

## Repository guidance files
Drop these files inside `.github/` of the repository under review and the action will automatically load them without a checkout:

| File | Purpose |
| --- | --- |
| `.github/review-instructions.md` | Long-form instructions, definitions of done, or teams’ reviewer personas. |
| `.github/review-rulesets.md` | Strict policies, security/compliance rules, or release blockers. |
| `.github/review-ignorelist.txt` | Glob patterns (one per line) that should be excluded from prompts (e.g. `docs/**`). |
| `.github/prompts/review.md` | Custom template for `review` tasks (use `{{placeholders}}`, see below). |
| `.github/prompts/summary.md` | Custom template for `summary` tasks. |
| `.github/prompts/suggestions.md` | Custom template for `suggestions` tasks. |

Available template placeholders: `{{taskLabel}}`, `{{prHeader}}`, `{{prDescription}}`, `{{fileSummaries}}`, `{{instructions}}`, `{{rulesets}}`, `{{ignorePatterns}}`, `{{ignoredFiles}}`, `{{teamNotes}}`, and more (see `src/promptBuilder.js`). If no template is present, the built-in prompt is used.

## Self-hosted/Open WebUI provider
Use any on-prem OpenAI-compatible endpoint by adding it to the provider list:

```yaml
      - name: AI review
        uses: ./next-gen-ai-reviewer
        with:
          ai-provider: self-hosted,chatgpt
          self-hosted-endpoint: ${{ secrets.OPENWEBUI_URL }}/api/v1/chat/completions
          self-hosted-model: mistral-small
          self-hosted-token: ${{ secrets.OPENWEBUI_TOKEN }}
          max-output-tokens: 1600
          pr-number: ${{ github.event.pull_request.number }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }} # optional fallback provider
```

If the endpoint accepts bearer auth, leave `self-hosted-token-header` at its default. Otherwise set it to the expected header name (for example `X-API-Key`).

## ChatGPT model compatibility (max_completion_tokens)

OpenAI introduced a new parameter `max_completion_tokens` for newer models (gpt-4o, gpt-4o-mini, gpt-5-mini, o1, o3, etc.) to replace the older `max_tokens` parameter.

**Auto-detection (default):** The action automatically detects which parameter to use based on the model name.

**Manual override:** Set the `max-completion-tokens-mode` input (or repository variable):
- `true` - Force `max_completion_tokens` (for gpt-4o, gpt-4o-mini, gpt-5-mini, o1, o3, chatgpt-4o-latest)
- `false` - Force `max_tokens` (for gpt-4-turbo, gpt-3.5-turbo, older models)

Example for gpt-5-mini:
```yaml
      - uses: ./next-gen-ai-reviewer
        with:
          task: review
          pr-number: ${{ github.event.pull_request.number }}
          chatgpt-model: gpt-5-mini
          max-output-tokens: 16000
          max-completion-tokens-mode: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}
```

## Working example (external repo)
The `examples/.github` folder in this project ships drop-in guidance files you can copy into another repository. Here's how to wire everything together for `acme/awesome-app` that wants to reuse this action from a submodule or checkout step:

1. Copy the sample guidance files:
   ```bash
   mkdir -p .github/prompts
   cp next-gen-ai-reviewer/examples/.github/review-instructions.md .github/
   cp next-gen-ai-reviewer/examples/.github/review-rulesets.md .github/
   cp next-gen-ai-reviewer/examples/.github/review-ignorelist.txt .github/
   cp next-gen-ai-reviewer/examples/.github/prompts/*.md .github/prompts/
   ```
2. Add the action as a workflow step (assuming it lives in `.github/actions/next-gen-ai-reviewer` or as a git submodule):
   ```yaml
   name: AI Review

   on:
     pull_request:
       types: [opened, reopened, synchronize]

   jobs:
     review:
       runs-on: ubuntu-latest
        env:
          AI_REVIEW_CHATGPT_MODEL: gpt-4o-mini
          AI_REVIEW_MAX_OUTPUT_TOKENS: "1400"
          AI_REVIEW_MAX_COMPLETION_MODE: auto
       steps:
         - uses: actions/checkout@v4
         - name: Install reviewer action
           uses: actions/checkout@v4
           with:
             repository: ashsaym/ai-code-reviewer
             path: .github/actions/ai-reviewer-src
         - name: Run AI reviewer
           uses: ./.github/actions/ai-reviewer-src/next-gen-ai-reviewer
           with:
             pr-number: ${{ github.event.pull_request.number }}
             ai-provider: chatgpt,claude,self-hosted
            chatgpt-model: ${{ env.AI_REVIEW_CHATGPT_MODEL }}
            claude-model: claude-3-5-sonnet-20241022
            self-hosted-model: mistral-small
            max-output-tokens: ${{ env.AI_REVIEW_MAX_OUTPUT_TOKENS }}
            max-completion-tokens-mode: ${{ env.AI_REVIEW_MAX_COMPLETION_MODE }}
            max-files: 60
            max-diff-chars: 18000
            additional-context: |
              Reference the monorepo release checklist.
           env:
             GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
             CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}
             CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
             OPENWEBUI_API_KEY: ${{ secrets.OPENWEBUI_API_KEY }}
             OPENWEBUI_API_URL: ${{ secrets.OPENWEBUI_API_URL }}
   ```
3. Commit `.github/review-*` and `.github/prompts/*.md` to keep repository-specific policy close to the code. The action automatically fetches them through the GitHub API—no extra checkout logic is required inside the action itself.

## Built-in self-test workflow
This repository ships `.github/workflows/ai-review-selftest.yml`, which:
- Runs on every pull request (or manually via `workflow_dispatch`).
- Auto-detects the PR number; manual runs can pass `pr_number`.
- Executes a task matrix (`review`, `summary`, `suggestions`) and tries `chatgpt`, then `claude`, then `self-hosted`.
- Reads API keys from secrets but relies on workflow inputs/repository variables for model + token limits, so the same configuration is shared across CI.

If you clone this workflow into another repository, make sure you export the secrets alongside `GITHUB_TOKEN`:

```yaml
      env:
        AI_REVIEW_CHATGPT_MODEL: gpt-4o-mini
        AI_REVIEW_MAX_OUTPUT_TOKENS: "16000"
        AI_REVIEW_MAX_COMPLETION_MODE: auto

      - name: Run Next Gen AI Reviewer
        uses: ./next-gen-ai-reviewer
        with:
          task: review
          pr-number: ${{ github.event.pull_request.number }}
          ai-provider: chatgpt,claude,self-hosted
          chatgpt-model: ${{ env.AI_REVIEW_CHATGPT_MODEL }}
          max-output-tokens: ${{ env.AI_REVIEW_MAX_OUTPUT_TOKENS }}
          max-completion-tokens-mode: ${{ env.AI_REVIEW_MAX_COMPLETION_MODE }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          SELF_HOSTED_ENDPOINT: ${{ secrets.SELF_HOSTED_ENDPOINT }}
          SELF_HOSTED_API_KEY: ${{ secrets.SELF_HOSTED_API_KEY }}
          SELF_HOSTED_TOKEN: ${{ secrets.SELF_HOSTED_TOKEN }}
          SELF_HOSTED_MODEL: ${{ secrets.SELF_HOSTED_MODEL }}
          OPENWEBUI_API_URL: ${{ secrets.OPENWEBUI_API_URL }}
          OPENWEBUI_API_KEY: ${{ secrets.OPENWEBUI_API_KEY }}
          OPENWEBUI_MODEL: ${{ secrets.OPENWEBUI_MODEL }}
```

With that in place the bundled workflow behaves exactly like production—real providers produce the comments.

## Example workflow
```yaml
name: AI PR Review

on:
  pull_request:
    types: [opened, reopened, synchronize]

jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: AI review
        uses: ./next-gen-ai-reviewer
        with:
          pr-number: ${{ github.event.pull_request.number }}
          task: review
          ai-provider: chatgpt,claude
          additional-context: |
            Highlight risks that would block release.
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}
          CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
```

## PR Comment Commands

You can trigger AI reviews on-demand by commenting on any pull request with these commands:

| Command | Description | Response |
| --- | --- | --- |
| `/review` | Performs a code review with findings and recommendations | Posts detailed review with file:line references |
| `/suggestion` | Generates actionable improvement suggestions | Posts numbered list of enhancement ideas |
| `/summary` | Creates a PR summary with intent, impact, and risk analysis | Posts executive summary |

**How it works:**
1. Comment `/review` (or `/suggestion` or `/summary`) on any PR
2. The workflow reacts with 👀 to acknowledge the command
3. AI analysis runs and posts results as a new comment
4. Success: 👍 reaction, Failure: 👎 reaction + error comment

**Setup:** Create `.github/workflows/ai-review-on-command.yml` (see examples folder) to enable this feature.

## Failure Handling

When the AI review fails (invalid API key, model error, rate limits, etc.), the action will:
- Post a comment to the PR explaining what went wrong
- Include possible causes and troubleshooting steps
- Mark the workflow as failed so it's visible in the checks
- Add 👎 reaction to command comments (if triggered via `/review` etc.)

## Local testing
```bash
cd next-gen-ai-reviewer
npm test
```

Use [`act`](https://github.com/nektos/act) or a dry-run workflow to simulate end-to-end behavior before shipping.

## Roadmap ideas
1. Add provider plugins (Gemini, Groq, etc.).
2. Support inline review comments plus review states.
3. Stream responses for eager feedback.

PRs are welcome—connect your favorite model and extend the reviewer however you like.
