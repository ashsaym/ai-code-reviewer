# 🚀 Implementation Plan: AI Code Reviewer v2

**Version:** 2.0.0  
**Start Date:** November 18, 2025  
**Target Date:** December 20, 2025  
**Status:** In Progress

---

## 🎯 Project Overview

Building a production-ready, TypeScript-based AI code review

er with:
- Zero external dependencies (100% GitHub-native)
- Modular, reusable architecture
- Incremental reviews with caching
- Repository-specific prompt management
- OpenAI (gpt-5-mini) as default provider
- Easy provider extensibility (1 file = 1 provider)

---

## 📅 4-Week Timeline

```
Week 1: Foundation & Storage
Week 2: Providers & GitHub Integration  
Week 3: Core Features & Prompts
Week 4: Testing & Production Deployment
```

---

## 🗓️ Week 1: Foundation & Storage (Nov 19-25)

### Day 1: Project Setup (Nov 19)

**Goal:** Initialize TypeScript project with all tooling

#### Tasks:
1. **Create directory structure**
   ```bash
   mkdir -p v2/{src/{core,storage,github,providers,prompts,analysis,parsers,utils,config},tests/{unit,integration,e2e,fixtures,mocks}}
   ```

2. **Initialize npm project**
   ```bash
   cd v2
   npm init -y
   ```

3. **Install dependencies**
   ```bash
   npm install @actions/core@^1.10.1 @actions/cache@^3.2.4 @actions/github@^6.0.0 @octokit/rest@^20.0.2
   npm install --save-dev typescript@^5.3.0 @types/node@^20.10.0 jest@^29.7.0 @types/jest@^29.5.11 ts-jest@^29.1.1 rollup@^4.9.0 @rollup/plugin-typescript@^11.1.5 @rollup/plugin-node-resolve@^15.2.3 @rollup/plugin-commonjs@^25.0.7 eslint@^8.56.0 @typescript-eslint/parser@^6.18.0 @typescript-eslint/eslint-plugin@^6.18.0
   ```

4. **Create configuration files**
   - `tsconfig.json`
   - `rollup.config.js`
   - `jest.config.js`
   - `.eslintrc.js`
   - `.gitignore`

5. **Create action.yml**
   - Define all inputs/outputs
   - Set runtime to node20

**Deliverables:**
- ✅ Working TypeScript project
- ✅ Build system configured
- ✅ Test framework ready
- ✅ Action metadata defined

**Time Estimate:** 3-4 hours

---

### Day 2-3: Storage Layer (Nov 20-21)

**Goal:** Implement GitHub-native storage (no external services)

#### Tasks:

**1. GitHubCacheStorage.ts** (4 hours)
```typescript
export class GitHubCacheStorage {
  async get<T>(type: string, hash: string): Promise<T | null>
  async set(type: string, hash: string, data: any): Promise<void>
  static hash(content: string): string
  private buildKey(type: string, hash: string): string
}
```
- Implement using `@actions/cache`
- Add error handling
- Write unit tests
- Test with mock data

**2. CommentStateStorage.ts** (4 hours)
```typescript
export class CommentStateStorage {
  async getState(prNumber: number): Promise<ReviewState | null>
  async setState(prNumber: number, state: ReviewState): Promise<void>
  private parseStateFromComment(body: string): ReviewState | null
  private formatStateComment(state: ReviewState): string
}
```
- Store state in HTML comments
- Parse state from PR comments
- Handle comment creation/updates
- Write unit tests

**3. CheckRunStorage.ts** (3 hours)
```typescript
export class CheckRunStorage {
  async createReviewCheckRun(prNumber: number, commitSha: string, review: ReviewResult): Promise<void>
  async getReviewHistory(prNumber: number): Promise<ReviewHistory[]>
  private formatReviewSummary(review: ReviewResult): string
}
```
- Create check runs for reviews
- Store review history
- Format summaries
- Write unit tests

**4. StorageManager.ts** (2 hours)
```typescript
export class StorageManager {
  async loadState(): Promise<ReviewState | null>
  async saveState(state: ReviewState): Promise<void>
  async getCachedDiff(fileHash: string): Promise<FileDiff | null>
  async cacheDiff(fileHash: string, diff: FileDiff): Promise<void>
  async getCachedResponse(...): Promise<ReviewResponse | null>
  async cacheResponse(...): Promise<void>
  async saveReviewToHistory(...): Promise<void>
}
```
- Unified interface for all storage
- Integration tests
- Error handling

**5. Storage Models** (1 hour)
- `ReviewState.ts`
- `CommentMetadata.ts`
- `ReviewHistory.ts`

**Deliverables:**
- ✅ Complete storage layer
- ✅ All storage unit tests passing
- ✅ Integration tests for storage
- ✅ Documentation

**Time Estimate:** 14 hours (2 days)

---

### Day 4-5: GitHub Client (Nov 22-23)

**Goal:** Robust GitHub API integration

#### Tasks:

**1. GitHubClient.ts** (3 hours)
```typescript
export class GitHubClient {
  private octokit: Octokit
  constructor(token: string)
  async request<T>(method: string, url: string, data?: any): Promise<T>
  async requestWithRetry<T>(...): Promise<T>
}
```
- Initialize Octokit
- Add retry logic (exponential backoff)
- Add rate limiting
- Error handling

**2. PullRequestService.ts** (4 hours)
```typescript
export class PullRequestService {
  async getPullRequest(prNumber: number): Promise<PullRequest>
  async getChangedFiles(prNumber: number): Promise<FileChange[]>
  async getCommits(prNumber: number): Promise<Commit[]>
  async getCommitsSince(prNumber: number, since: string): Promise<Commit[]>
}
```
- Fetch PR metadata
- Get changed files with pagination
- Get commits with filtering
- Unit tests

**3. CommentService.ts** (4 hours)
```typescript
export class CommentService {
  async createReview(prNumber: number, review: Review): Promise<void>
  async createReviewComment(prNumber: number, comment: ReviewComment): Promise<number>
  async updateComment(commentId: number, body: string): Promise<void>
  async deleteComment(commentId: number): Promise<void>
  async listComments(prNumber: number): Promise<Comment[]>
  async getReviewComments(prNumber: number): Promise<ReviewComment[]>
}
```
- Create inline review comments
- Update/delete comments
- List existing comments
- Unit tests

**4. DiffParser.ts** (3 hours)
```typescript
export class DiffParser {
  parsePatch(patch: string): ParsedDiff
  computePosition(patch: string, lineNumber: number): number | null
  lineExistsAtPosition(patch: string, position: number): boolean
  extractLineContent(patch: string, lineNumber: number): string | null
}
```
- Parse unified diff format
- Calculate GitHub position from line numbers
- Validate line existence
- Unit tests with real diff samples

**5. FileHasher.ts** (1 hour)
```typescript
export class FileHasher {
  static hashFile(file: FileChange): string
  static hashContent(content: string): string
  static hashPrompt(prompt: string, model: string, provider: string): string
}
```
- Content-based hashing for cache keys
- Unit tests

**Deliverables:**
- ✅ Complete GitHub client
- ✅ All GitHub tests passing
- ✅ DiffParser handles edge cases
- ✅ Documentation

**Time Estimate:** 15 hours (2 days)

---

### Weekend: Code Review & Refactoring (Nov 24-25)

- Review Week 1 code
- Refactor as needed
- Add missing tests
- Update documentation

---

## 🗓️ Week 2: Providers & Integration (Nov 26 - Dec 2)

### Day 6: Provider Abstraction (Nov 26)

**Goal:** Extensible provider system

#### Tasks:

**1. BaseProvider.ts** (3 hours)
```typescript
export abstract class BaseProvider {
  abstract review(prompt: string): Promise<ProviderResponse>
  protected normalizeResponse(raw: any): ProviderResponse
  protected handleError(error: Error): never
  getContextWindow(): number
  getMaxOutputTokens(): number
}
```
- Abstract interface
- Common error handling
- Response normalization
- Unit tests

**2. ProviderFactory.ts** (2 hours)
```typescript
export class ProviderFactory {
  private static providers: Map<string, typeof BaseProvider>
  static register(name: string, provider: typeof BaseProvider): void
  static create(name: string, config: ProviderConfig): BaseProvider
  static list(): string[]
}
```
- Dynamic provider registry
- Provider instantiation
- Fallback logic
- Unit tests

**3. Provider Types & Interfaces** (1 hour)
- `ProviderConfig` interface
- `ProviderResponse` interface
- `ReviewRequest` interface

**Deliverables:**
- ✅ Provider abstraction complete
- ✅ Easy to add new providers
- ✅ Tests passing

**Time Estimate:** 6 hours

---

### Day 7-8: OpenAI Provider (Nov 27-28)

**Goal:** Production-ready OpenAI integration (PRIMARY PROVIDER)

#### Tasks:

**1. OpenAIProvider.ts** (8 hours)
```typescript
export class OpenAIProvider extends BaseProvider {
  async review(prompt: string): Promise<ProviderResponse>
  private buildRequest(prompt: string): OpenAIRequest
  private handleRateLimit(error: RateLimitError): Promise<ProviderResponse>
  private parseResponse(response: OpenAIResponse): ProviderResponse
}
```

Features to implement:
- Support gpt-5-mini (default)
- Support gpt-4o, gpt-4-turbo, gpt-3.5-turbo
- Handle `max_completion_tokens` vs `max_tokens`
- JSON mode for structured output
- Streaming support (future)
- Error handling:
  - Rate limits (retry with backoff)
  - Invalid API key (clear error message)
  - Model not found
  - Context length exceeded
  - Timeout handling
- Unit tests with mocked API
- Integration test with real API (in CI)

**2. OpenAI Response Parser** (2 hours)
- Parse JSON from OpenAI
- Extract review comments
- Validate structure
- Handle malformed responses

**3. OpenAI Error Handler** (2 hours)
- Specific error messages for each error type
- Retry logic for transient errors
- User-friendly error messages

**Deliverables:**
- ✅ OpenAI provider fully functional
- ✅ Handles all error scenarios
- ✅ Tests passing (90%+ coverage)
- ✅ Documentation with examples

**Time Estimate:** 12 hours (2 days)

---

### Day 9: OpenWebUI Provider (Nov 29)

**Goal:** Support self-hosted models (SECONDARY PROVIDER)

#### Tasks:

**1. OpenWebUIProvider.ts** (6 hours)
```typescript
export class OpenWebUIProvider extends BaseProvider {
  async review(prompt: string): Promise<ProviderResponse>
  private buildRequest(prompt: string): OpenWebUIRequest
  private handleAuthentication(): Headers
}
```

Features to implement:
- OpenAI-compatible endpoint
- Custom authentication headers
- Model selection
- Error handling
- Unit tests
- Integration tests

**Deliverables:**
- ✅ OpenWebUI provider working
- ✅ Tests passing
- ✅ Documentation

**Time Estimate:** 6 hours

---

### Day 10: Provider Testing (Nov 30)

**Goal:** Comprehensive provider test suite

#### Tasks:

1. **Mock API responses** (2 hours)
   - Create realistic mock data
   - Test fixtures for all providers

2. **Integration tests** (3 hours)
   - Test provider fallback
   - Test rate limiting
   - Test error scenarios

3. **End-to-end tests** (2 hours)
   - Full review workflow
   - Real API calls (in CI only)

**Deliverables:**
- ✅ Provider test suite complete
- ✅ 85%+ coverage
- ✅ All tests passing

**Time Estimate:** 7 hours

---

### Weekend: Integration & Testing (Dec 1-2)

- Integration testing
- Fix bugs
- Performance testing
- Documentation

---

## 🗓️ Week 3: Core Features (Dec 3-9)

### Day 11-12: Prompt Management (Dec 3-4)

**Goal:** Repository-specific, customizable prompts

#### Tasks:

**1. TemplateLoader.ts** (6 hours)
```typescript
export class TemplateLoader {
  async loadTemplate(repo: string, task: string): Promise<string>
  private loadFromRepo(path: string): Promise<string | null>
  private loadBuiltIn(task: string): Promise<string>
  async cacheTemplate(key: string, template: string): Promise<void>
}
```

Features:
- Load from `.github/ai-reviewer/prompts/{task}.hbs`
- Fallback to `.github/prompts/{task}.md` (v1 compat)
- Fallback to built-in templates
- Cache loaded templates
- Support Handlebars syntax

**2. PromptBuilder.ts** (6 hours)
```typescript
export class PromptBuilder {
  async build(options: PromptOptions): Promise<string>
  private renderTemplate(template: string, context: any): string
  private buildContext(pr: PullRequest, files: FileChange[]): PromptContext
}
```

Features:
- Variable substitution
- Build context from PR data
- Support all tasks (review, summary, suggestions, description)
- Token counting
- Context optimization

**3. Built-in Templates** (4 hours)
Create default templates:
- `templates/review.hbs`
- `templates/summary.hbs`
- `templates/suggestions.hbs`
- `templates/description.hbs`

Each with:
- Clear instructions
- Example output format
- Handlebars variables
- JSON schema (for review/suggestions)

**Deliverables:**
- ✅ Template system working
- ✅ Repo-specific prompts supported
- ✅ Backward compatible with v1
- ✅ Tests passing

**Time Estimate:** 16 hours (2 days)

---

### Day 13-14: Incremental Analysis (Dec 5-6)

**Goal:** Smart incremental reviews with caching

#### Tasks:

**1. IncrementalAnalyzer.ts** (8 hours)
```typescript
export class IncrementalAnalyzer {
  async analyze(pr: PullRequest, state: ReviewState | null): Promise<AnalysisResult>
  private getNewCommits(pr: PullRequest, lastCommit: string): Promise<Commit[]>
  private hashFile(file: FileChange): string
  private isCacheValid(cached: FileDiff, state: ReviewState): boolean
}
```

Features:
- Detect new commits since last review
- Compare with cached file hashes
- Determine which files need review
- Return cache hits and misses
- Unit tests with mock data

**2. OutdatedCommentCleaner.ts** (6 hours)
```typescript
export class OutdatedCommentCleaner {
  async clean(pr: PullRequest, comments: CommentMetadata[]): Promise<void>
  private isCommentOutdated(comment: CommentMetadata, currentFiles: FileChange[]): boolean
  private markOutdated(commentId: number): Promise<void>
  private deleteComment(commentId: number): Promise<void>
}
```

Features:
- Check if commented lines still exist
- Mark outdated comments with strikethrough
- Option to delete outdated comments
- Update state tracking
- Unit tests

**3. MultiCommitAnalyzer.ts** (2 hours)
```typescript
export class MultiCommitAnalyzer {
  async analyzeCommits(commits: Commit[]): Promise<CommitAnalysis[]>
  private aggregateChanges(commits: Commit[]): FileChange[]
}
```

**Deliverables:**
- ✅ Incremental analysis working
- ✅ Outdated comment cleanup working
- ✅ Cache hit rate 60%+ on test data
- ✅ Tests passing

**Time Estimate:** 16 hours (2 days)

---

### Day 15: Response Parsing & Formatting (Dec 7)

**Goal:** Parse LLM output and format GitHub comments

#### Tasks:

**1. ResponseParser.ts** (4 hours)
```typescript
export class ResponseParser {
  parse(response: string): ReviewComment[]
  private parseJSON(content: string): any
  private extractReviewComments(data: any): ReviewComment[]
  private validateComment(comment: ReviewComment): boolean
}
```

Features:
- Parse JSON from LLM response
- Handle malformed JSON
- Extract review comments
- Validate structure
- Unit tests with edge cases

**2. ReviewFormatter.ts** (3 hours)
```typescript
export class ReviewFormatter {
  formatComment(comment: ReviewComment): string
  formatSeverityBadge(severity: string): string
  formatSuggestion(suggestion: string): string
}
```

Features:
- Format inline comments
- Add severity badges (🔴🟡🟢)
- Create suggestion blocks
- Markdown formatting
- Unit tests

**3. SeverityClassifier.ts** (1 hour)
```typescript
export class SeverityClassifier {
  classify(comment: string): 'high' | 'medium' | 'low'
}
```

**Deliverables:**
- ✅ Parsing and formatting complete
- ✅ Tests passing
- ✅ Well-formatted comments

**Time Estimate:** 8 hours

---

### Weekend: Integration Testing (Dec 8-9)

- End-to-end integration tests
- Fix bugs
- Performance optimization
- Documentation

---

## 🗓️ Week 4: Production & Deployment (Dec 10-16)

### Day 16-17: Main Orchestrator (Dec 10-11)

**Goal:** Tie everything together

#### Tasks:

**1. ActionOrchestrator.ts** (12 hours)
```typescript
export class ActionOrchestrator {
  async run(): Promise<void>
  private loadConfig(): Promise<Config>
  private initializeServices(): Promise<void>
  private performReview(pr: PullRequest): Promise<void>
  private postComments(comments: ReviewComment[]): Promise<void>
  private handleError(error: Error): Promise<void>
}
```

Features:
- Load configuration from inputs/env
- Initialize all services
- Load state
- Fetch PR data
- Analyze changes (incremental)
- Call LLM (with caching)
- Parse response
- Clean outdated comments
- Post new comments
- Save state
- Create check run
- Comprehensive error handling
- Integration tests

**2. ConfigLoader.ts** (4 hours)
```typescript
export class ConfigLoader {
  static async load(): Promise<Config>
  private static loadFromInputs(): Partial<Config>
  private static loadFromEnv(): Partial<Config>
  private static validateConfig(config: Config): void
  private static applyDefaults(config: Partial<Config>): Config
}
```

**3. index.ts** (2 hours)
```typescript
async function main() {
  try {
    const orchestrator = new ActionOrchestrator();
    await orchestrator.run();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
```

**Deliverables:**
- ✅ Complete end-to-end workflow
- ✅ All features integrated
- ✅ Tests passing

**Time Estimate:** 18 hours (2 days)

---

### Day 18: Utility Functions (Dec 12)

**Goal:** Robust utilities for production

#### Tasks:

**1. Logger.ts** (2 hours)
```typescript
export class Logger {
  static info(message: string, meta?: any): void
  static warn(message: string, meta?: any): void
  static error(message: string, error?: Error): void
  static debug(message: string, meta?: any): void
}
```

**2. ErrorHandler.ts** (3 hours)
```typescript
export class ErrorHandler {
  async handle(error: Error, context: any): Promise<void>
  private categorize(error: Error): ErrorCategory
  private generateUserMessage(error: Error): string
  private shouldRetry(error: Error): boolean
}
```

**3. Retry.ts** (2 hours)
```typescript
export class Retry {
  static async withBackoff<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>
}
```

**4. TokenCounter.ts** (1 hour)
```typescript
export class TokenCounter {
  static count(text: string, model: string): number
}
```

**5. Validators.ts** (1 hour)
```typescript
export class Validators {
  static validateConfig(config: any): Config
  static validatePRNumber(prNumber: any): number
  static validateAPIKey(key: any): string
}
```

**Deliverables:**
- ✅ Production-ready utilities
- ✅ Comprehensive error handling
- ✅ Tests passing

**Time Estimate:** 9 hours

---

### Day 19: Testing & QA (Dec 13)

**Goal:** Comprehensive test coverage

#### Tasks:

1. **Unit tests** (3 hours)
   - Ensure 85%+ coverage
   - Test edge cases
   - Test error scenarios

2. **Integration tests** (3 hours)
   - Test full workflows
   - Test with mock GitHub API
   - Test with mock LLM API

3. **E2E tests** (2 hours)
   - Test action in isolated environment
   - Test with real GitHub repo (private)

**Deliverables:**
- ✅ 85%+ test coverage
- ✅ All tests passing
- ✅ CI/CD passing

**Time Estimate:** 8 hours

---

### Day 20: Test Repository Setup (Dec 14)

**Goal:** Create real-world test environment

#### Tasks:

**1. Create Test Repository** (2 hours)
```bash
# Create private repo: ai-code-reviewer-test
gh repo create ashsaym/ai-code-reviewer-test --private
```

**2. Create Test Workflow** (2 hours)
```yaml
# .github/workflows/ai-review.yml
name: AI Code Review
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: ashsaym/ai-code-reviewer@v2-rewrite
        with:
          task: review
          providers: openai,openwebui
          openai-model: gpt-5-mini
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

**3. Create Test PRs** (2 hours)
- Small PR (5 files)
- Medium PR (20 files)
- Large PR (50 files)
- PR with syntax errors
- PR with security issues

**4. Verify Features** (2 hours)
- ✅ Comments posted correctly
- ✅ Caching works
- ✅ Incremental reviews work
- ✅ Outdated comments cleaned
- ✅ State tracking works
- ✅ Custom prompts work

**Deliverables:**
- ✅ Test repository working
- ✅ All features verified
- ✅ Performance benchmarks

**Time Estimate:** 8 hours

---

### Day 21: Documentation & Release Prep (Dec 15)

**Goal:** Production-ready documentation

#### Tasks:

**1. README.md** (4 hours)
- Getting started
- Features overview
- Configuration options
- Examples
- Troubleshooting

**2. API Documentation** (2 hours)
- Provider interface
- Storage interface
- Configuration schema

**3. Configuration Guide** (2 hours)
- All input options
- Environment variables
- Repository-specific settings
- Custom prompts

**4. Troubleshooting Guide** (1 hour)
- Common errors
- Solutions
- FAQ

**Deliverables:**
- ✅ Complete documentation
- ✅ Examples for all use cases
- ✅ Migration guide updated

**Time Estimate:** 9 hours

---

### Day 22: Final Testing & Release (Dec 16)

**Goal:** Release v2.0.0

#### Tasks:

1. **Final testing** (3 hours)
   - Test all features
   - Verify documentation
   - Check performance

2. **Build and bundle** (1 hour)
   ```bash
   npm run build
   git add dist/
   ```

3. **Create release** (1 hour)
   ```bash
   git tag v2.0.0
   git push origin v2-rewrite
   git push origin v2.0.0
   ```

4. **Update marketplace** (1 hour)
   - Update action metadata
   - Add screenshots
   - Update description

**Deliverables:**
- ✅ v2.0.0 released
- ✅ Marketplace updated
- ✅ Documentation published

**Time Estimate:** 6 hours

---

## 📊 Implementation Metrics

### Code Statistics (Target)
- **Total Files:** 50 TypeScript files
- **Total Lines:** ~5,000 LOC
- **Test Files:** 30 test files
- **Test Coverage:** 85%+
- **Build Size:** <1 MB

### Time Breakdown
- Week 1: 40 hours (Foundation)
- Week 2: 37 hours (Providers)
- Week 3: 40 hours (Core Features)
- Week 4: 40 hours (Testing & Production)
- **Total:** ~157 hours (~ 4 weeks)

---

## 🎯 Success Criteria

### Functional
- ✅ All features working as designed
- ✅ Tests passing (85%+ coverage)
- ✅ No critical bugs
- ✅ Performance targets met

### Non-Functional
- ✅ Code is maintainable
- ✅ Documentation is complete
- ✅ Easy to extend (new providers)
- ✅ Production-ready error handling

### User Experience
- ✅ Easy to set up (2 lines in workflow)
- ✅ Clear error messages
- ✅ Faster than v1 (30-50%)
- ✅ Lower costs (40-60%)

---

## 🚨 Risk Management

### Technical Risks

**Risk:** GitHub Cache API limitations
- **Mitigation:** Implement fallback to comments if cache fails
- **Probability:** Low
- **Impact:** Medium

**Risk:** OpenAI API rate limits
- **Mitigation:** Implement exponential backoff and retry logic
- **Probability:** Medium
- **Impact:** Low

**Risk:** Complex diff parsing issues
- **Mitigation:** Extensive test coverage with real diffs
- **Probability:** Medium
- **Impact:** Medium

### Schedule Risks

**Risk:** Provider implementation takes longer than expected
- **Mitigation:** Start with OpenAI only, add others later
- **Probability:** Medium
- **Impact:** Low

**Risk:** Testing reveals major issues
- **Mitigation:** Continuous testing throughout development
- **Probability:** Low
- **Impact:** High

---

## 🔄 Continuous Integration

### CI/CD Pipeline

```yaml
name: CI/CD

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm run lint

  integration-test:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - name: Test action
        uses: ./
        with:
          task: review
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

---

## 📝 Daily Checklist

Each day:
- [ ] Update TRACKER.md with progress
- [ ] Write code with tests
- [ ] Run tests locally
- [ ] Push code to branch
- [ ] Update documentation
- [ ] Review and refactor

---

## 🎉 Post-Launch (Week 5+)

### Week 5: Monitoring & Fixes
- Monitor real-world usage
- Fix bugs
- Gather feedback

### Week 6-8: v2.1.0 Planning
- Add more providers (Claude, Gemini)
- Add streaming support
- Implement advanced features

---

**Document Version:** 1.0  
**Last Updated:** November 18, 2025  
**Next Review:** November 19, 2025
