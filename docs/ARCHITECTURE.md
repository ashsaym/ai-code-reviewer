# 🏗️ Architecture Documentation: AI Code Reviewer v2

**Version:** 2.0.0  
**Last Updated:** November 18, 2025  
**Status:** Design Complete

---

## 📐 Architecture Overview

AI Code Reviewer v2 is a **modular, TypeScript-based GitHub Action** that provides intelligent code reviews with zero external dependencies. The architecture is designed for:

- **Modularity:** Each component has a single responsibility
- **Extensibility:** Easy to add new providers, features
- **Testability:** Comprehensive unit and integration testing
- **Production-Ready:** Robust error handling, logging, retry logic
- **GitHub-Native:** Uses only GitHub's built-in APIs for storage

---

## 🎯 Design Principles

### 1. Zero External Dependencies
- No Redis, PostgreSQL, S3, or any external service
- Uses GitHub Actions Cache API, PR Comments, Check Runs
- Free, scalable, maintenance-free

### 2. Modular Architecture
- 50+ small, focused files
- Each module has a single responsibility
- Easy to understand, test, and maintain

### 3. Provider Extensibility
- **One file = One provider**
- Dynamic provider registry
- Easy to add new LLM providers

### 4. Production-First
- Comprehensive error handling
- Structured logging
- Retry logic with exponential backoff
- Graceful degradation

### 5. Performance Optimized
- Smart caching (60%+ cache hit rate)
- Incremental reviews (only changed code)
- Parallel processing where possible

---

## 📁 Directory Structure

```
v2/
├── src/
│   ├── index.ts                          # Entry point
│   │
│   ├── core/                             # Core orchestration
│   │   ├── ActionOrchestrator.ts         # Main workflow coordinator
│   │   ├── ConfigLoader.ts               # Configuration management
│   │   └── ReviewEngine.ts               # Review processing engine
│   │
│   ├── storage/                          # GitHub-native storage
│   │   ├── StorageManager.ts             # Unified storage interface
│   │   ├── GitHubCacheStorage.ts         # GitHub Actions Cache API
│   │   ├── CommentStateStorage.ts        # State in PR comments
│   │   ├── CheckRunStorage.ts            # Review history in check runs
│   │   └── models/
│   │       ├── ReviewState.ts            # State schema
│   │       ├── CommentMetadata.ts        # Comment tracking schema
│   │       └── ReviewHistory.ts          # History schema
│   │
│   ├── github/                           # GitHub API integration
│   │   ├── GitHubClient.ts               # Octokit wrapper
│   │   ├── PullRequestService.ts         # PR operations
│   │   ├── CommentService.ts             # Comment CRUD
│   │   ├── DiffParser.ts                 # Patch parsing
│   │   └── FileHasher.ts                 # Content hashing
│   │
│   ├── providers/                        # LLM providers
│   │   ├── BaseProvider.ts               # Abstract provider interface
│   │   ├── ProviderFactory.ts            # Dynamic registry
│   │   ├── OpenAIProvider.ts             # OpenAI (gpt-5-mini, gpt-4o)
│   │   └── OpenWebUIProvider.ts          # Self-hosted models
│   │
│   ├── prompts/                          # Prompt management
│   │   ├── PromptBuilder.ts              # Build prompts
│   │   ├── TemplateLoader.ts             # Load repo-specific templates
│   │   ├── ContextOptimizer.ts           # Token optimization
│   │   └── templates/                    # Built-in templates
│   │       ├── review.hbs
│   │       ├── summary.hbs
│   │       ├── suggestions.hbs
│   │       └── description.hbs
│   │
│   ├── analysis/                         # Code analysis
│   │   ├── IncrementalAnalyzer.ts        # Delta detection
│   │   ├── OutdatedCommentCleaner.ts     # Cleanup logic
│   │   └── MultiCommitAnalyzer.ts        # Multi-commit analysis
│   │
│   ├── parsers/                          # Response processing
│   │   ├── ResponseParser.ts             # Parse LLM JSON
│   │   ├── ReviewFormatter.ts            # Format comments
│   │   └── SeverityClassifier.ts         # Classify issues
│   │
│   ├── utils/                            # Utilities
│   │   ├── Logger.ts                     # Structured logging
│   │   ├── ErrorHandler.ts               # Error management
│   │   ├── Retry.ts                      # Retry with backoff
│   │   ├── TokenCounter.ts               # Token counting
│   │   └── Validators.ts                 # Input validation
│   │
│   └── config/                           # Configuration
│       ├── defaults.ts                   # Default values
│       ├── schema.ts                     # Zod schemas
│       └── types.ts                      # TypeScript interfaces
│
├── tests/                                # Test suite
│   ├── unit/                             # Unit tests
│   ├── integration/                      # Integration tests
│   ├── e2e/                              # End-to-end tests
│   ├── fixtures/                         # Test data
│   └── mocks/                            # Mock implementations
│
├── dist/                                 # Compiled output (gitignored)
│   └── index.js                          # Bundled action
│
├── action.yml                            # GitHub Action metadata
├── package.json                          # Dependencies
├── tsconfig.json                         # TypeScript config
├── rollup.config.js                      # Build configuration
├── jest.config.js                        # Test configuration
└── README.md                             # Documentation
```

---

## 🔄 Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Actions                            │
│                     (Workflow Triggered)                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      index.ts (Entry Point)                      │
│                  Initialize ActionOrchestrator                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ActionOrchestrator                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ ConfigLoader │  │StorageManager│  │ GitHub Client│         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
   ┌──────────┐      ┌────────────┐     ┌────────────┐
   │  Config  │      │   State    │     │ PR Data    │
   └────┬─────┘      └─────┬──────┘     └─────┬──────┘
        │                  │                   │
        └──────────────────┴───────────────────┘
                           │
                           ▼
               ┌───────────────────────┐
               │ IncrementalAnalyzer   │
               │  • Compare with cache │
               │  • Detect new changes │
               └───────────┬───────────┘
                           │
          ┌────────────────┴────────────────┐
          │                                 │
          ▼                                 ▼
  ┌───────────────┐              ┌──────────────────┐
  │ Cache Hit     │              │ Cache Miss       │
  │ (Reuse prev)  │              │ (Need LLM call)  │
  └───────┬───────┘              └────────┬─────────┘
          │                               │
          │                               ▼
          │                    ┌────────────────────┐
          │                    │  PromptBuilder     │
          │                    │  • Load template   │
          │                    │  • Build context   │
          │                    └─────────┬──────────┘
          │                              │
          │                              ▼
          │                    ┌────────────────────┐
          │                    │ Provider (OpenAI)  │
          │                    │  • Call API        │
          │                    │  • Handle errors   │
          │                    └─────────┬──────────┘
          │                              │
          │                              ▼
          │                    ┌────────────────────┐
          │                    │  ResponseParser    │
          │                    │  • Parse JSON      │
          │                    │  • Extract comments│
          │                    └─────────┬──────────┘
          │                              │
          └──────────────────────────────┘
                                         │
                                         ▼
                         ┌───────────────────────────┐
                         │ OutdatedCommentCleaner    │
                         │  • Clean old comments     │
                         └────────────┬──────────────┘
                                      │
                                      ▼
                         ┌───────────────────────────┐
                         │  ReviewFormatter          │
                         │  • Format comments        │
                         │  • Add severity badges    │
                         └────────────┬──────────────┘
                                      │
                                      ▼
                         ┌───────────────────────────┐
                         │  CommentService           │
                         │  • Post to GitHub         │
                         └────────────┬──────────────┘
                                      │
                                      ▼
                         ┌───────────────────────────┐
                         │  StorageManager           │
                         │  • Save state             │
                         │  • Create check run       │
                         └───────────────────────────┘
```

---

## 🗄️ Storage Architecture

### Three-Layer Storage Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    STORAGE LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: GitHub Actions Cache (Short-term, 7 days)            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  • File diffs                                            │  │
│  │  • LLM responses                                         │  │
│  │  • PR metadata                                           │  │
│  │  • Key: ai-reviewer-{repo}-pr-{num}-{type}-{hash}      │  │
│  │  • API: @actions/cache                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Layer 2: PR Comments (Persistent state)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  • Review state (last commit, comment tracking)         │  │
│  │  • Stored as HTML comment in PR                         │  │
│  │  • Format: <!-- ai-reviewer-state {...} -->            │  │
│  │  • API: Octokit issues.createComment()                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Layer 3: Check Runs (Review history)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  • Review summaries                                      │  │
│  │  • Performance metrics                                   │  │
│  │  • Visible in GitHub UI (Checks tab)                   │  │
│  │  • API: Octokit checks.create()                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Storage Flow

```typescript
// Read flow
const state = await storage.loadState(prNumber);
// 1. Check PR comments for state
// 2. Parse HTML comment
// 3. Return ReviewState object

// Write flow
await storage.saveState(prNumber, newState);
// 1. Format state as HTML comment
// 2. Update or create PR comment
// 3. Invisible to users, parseable by bot
```

---

## 🔌 Provider System Architecture

### Provider Registration & Factory

```typescript
// Providers register themselves
ProviderFactory.register('openai', OpenAIProvider);
ProviderFactory.register('openwebui', OpenWebUIProvider);

// Dynamic instantiation
const provider = ProviderFactory.create('openai', config);

// Fallback chain
const providers = ['openai', 'openwebui'];
for (const name of providers) {
  try {
    const provider = ProviderFactory.create(name, config);
    return await provider.review(prompt);
  } catch (error) {
    console.warn(`Provider ${name} failed, trying next...`);
  }
}
```

### Provider Interface

```typescript
abstract class BaseProvider {
  // Must implement
  abstract review(prompt: string): Promise<ProviderResponse>;
  
  // Optional overrides
  getContextWindow(): number { return 128000; }
  getMaxOutputTokens(): number { return 4096; }
  
  // Common functionality
  protected normalizeResponse(raw: any): ProviderResponse { }
  protected handleError(error: Error): never { }
}
```

### Adding a New Provider

**Step 1:** Create file `src/providers/NewProvider.ts`

```typescript
import { BaseProvider } from './BaseProvider';

export class NewProvider extends BaseProvider {
  async review(prompt: string): Promise<ProviderResponse> {
    // Implementation
  }
}
```

**Step 2:** Register in `src/providers/index.ts`

```typescript
import { NewProvider } from './NewProvider';
ProviderFactory.register('new', NewProvider);
```

**Step 3:** Done! Users can now use it:

```yaml
with:
  providers: new,openai
env:
  NEW_API_KEY: ${{ secrets.NEW_API_KEY }}
```

---

## 📝 Prompt Management Architecture

### Template Hierarchy

```
1. Repo-specific template (.github/ai-reviewer/prompts/review.hbs)
   ↓ (if not found)
2. Legacy location (.github/prompts/review.md)
   ↓ (if not found)
3. Built-in template (src/prompts/templates/review.hbs)
```

### Template Loading Flow

```typescript
// TemplateLoader.ts
async loadTemplate(repo: string, task: string): Promise<string> {
  // Try new location
  let template = await this.loadFromRepo(
    `.github/ai-reviewer/prompts/${task}.hbs`
  );
  
  if (template) return template;
  
  // Try legacy location (v1 compat)
  template = await this.loadFromRepo(
    `.github/prompts/${task}.md`
  );
  
  if (template) return template;
  
  // Use built-in
  return this.loadBuiltIn(task);
}
```

### Template Variables

```handlebars
{{! review.hbs }}
You are reviewing PR #{{prNumber}} in {{repository}}.

**Author:** {{author}}
**Branch:** {{baseBranch}} → {{headBranch}}

**Changed Files:**
{{#each files}}
  {{filename}} ({{status}}, ±{{changes}})
  ```diff
  {{patch}}
  ```
{{/each}}

{{#if customInstructions}}
**Custom Instructions:**
{{customInstructions}}
{{/if}}

Provide inline review comments in JSON format...
```

---

## 🔄 Incremental Review Architecture

### State Tracking

```typescript
interface ReviewState {
  prNumber: number;
  lastReviewedCommit: string;          // abc123
  reviewedCommits: string[];            // [abc123, def456]
  commentsTracking: CommentMetadata[];  // All posted comments
  totalReviews: number;
  lastReviewedAt: string;
}
```

### Delta Detection Algorithm

```typescript
async function analyzeIncremental(
  pr: PullRequest,
  state: ReviewState | null
): Promise<AnalysisResult> {
  
  // 1. Get all changed files in PR
  const allFiles = await github.getChangedFiles(pr.number);
  
  // 2. For each file, compute hash
  const filesToReview = [];
  const cachedFiles = [];
  
  for (const file of allFiles) {
    const fileHash = hashFile(file);  // hash(filename + patch + sha)
    
    // 3. Check cache
    const cached = await storage.getCachedDiff(fileHash);
    
    if (cached && isCacheValid(cached, state)) {
      // Cache hit - reuse previous analysis
      cachedFiles.push(file);
    } else {
      // Cache miss - needs new review
      filesToReview.push(file);
    }
  }
  
  return { filesToReview, cachedFiles };
}
```

### Cache Invalidation

Cache is invalidated when:
1. File content changes (different hash)
2. Provider or model changes
3. Template changes
4. Force-review flag set
5. Cache older than 7 days (automatic)

---

## 🧹 Outdated Comment Management

### Comment Lifecycle

```
Comment Created → Active → Outdated → Cleaned
```

### Detection Algorithm

```typescript
async function cleanOutdatedComments(
  pr: PullRequest,
  previousComments: CommentMetadata[]
): Promise<void> {
  
  const currentFiles = await github.getChangedFiles(pr.number);
  
  for (const comment of previousComments) {
    // Check if file still in PR
    const file = currentFiles.find(f => f.filename === comment.path);
    
    if (!file) {
      await markOutdated(comment.id, 'File removed from PR');
      continue;
    }
    
    // Check if line still exists
    const lineExists = diffParser.lineExistsAtPosition(
      file.patch,
      comment.position
    );
    
    if (!lineExists) {
      await markOutdated(comment.id, 'Code changed');
    }
  }
}
```

### Cleanup Strategies

**Strategy 1: Strikethrough (Default)**
```markdown
~~🔴 **HIGH**

Original comment text...~~

_⚠️ Outdated: code was changed in commit abc123_
```

**Strategy 2: Delete (Optional)**
```typescript
if (config.autoResolveOutdated === 'delete') {
  await github.deleteComment(comment.id);
}
```

---

## 🎯 Error Handling Architecture

### Error Hierarchy

```
Error
├── ProviderError
│   ├── RateLimitError (retry)
│   ├── InvalidAPIKeyError (fatal)
│   ├── ModelNotFoundError (fatal)
│   └── ContextLengthError (reduce context)
│
├── GitHubError
│   ├── NotFoundError (fatal)
│   ├── PermissionError (fatal)
│   └── RateLimitError (retry)
│
├── StorageError
│   ├── CacheError (warning, continue)
│   └── StateError (warning, continue)
│
└── ValidationError
    ├── ConfigError (fatal)
    └── InputError (fatal)
```

### Error Handling Flow

```typescript
try {
  await orchestrator.run();
} catch (error) {
  // 1. Categorize error
  const category = errorHandler.categorize(error);
  
  // 2. Log with context
  logger.error(error.message, { category, context });
  
  // 3. Post user-friendly comment to PR
  const userMessage = errorHandler.generateUserMessage(error);
  await github.postComment(prNumber, userMessage);
  
  // 4. Attempt recovery if possible
  if (errorHandler.shouldRetry(error)) {
    return await retry(() => orchestrator.run());
  }
  
  // 5. Fail gracefully
  process.exit(1);
}
```

### User-Friendly Error Messages

```markdown
❌ **OpenAI API Key Error**

The configured API key is invalid.

**Fix:** Update `OPENAI_API_KEY` in repository secrets.

**Steps:**
1. Go to Settings → Secrets and variables → Actions
2. Update OPENAI_API_KEY with a valid key
3. Re-run the workflow

_Failed in AI Code Reviewer v2.0.0_
```

---

## 📊 Performance Architecture

### Performance Targets

| Metric | Target | Actual (Estimated) |
|--------|--------|-------------------|
| Cold start | <10s | ~8s |
| Small PR (5 files) | <30s | ~25s |
| Medium PR (20 files) | <60s | ~50s |
| Large PR (50 files) | <120s | ~90s |
| Cache hit rate | 60%+ | ~65% |

### Optimization Strategies

**1. Parallel Processing**
```typescript
// Fetch PR data in parallel
const [pr, files, state] = await Promise.all([
  github.getPullRequest(prNumber),
  github.getChangedFiles(prNumber),
  storage.loadState(prNumber)
]);
```

**2. Smart Caching**
```typescript
// Cache at multiple levels
const fileHash = hashFile(file);
const cached = 
  memoryCache.get(fileHash) ||          // L1: In-memory
  await githubCache.get(fileHash) ||    // L2: GitHub Cache
  await fetchAndCache(fileHash);        // L3: Fetch & cache
```

**3. Incremental Analysis**
```typescript
// Only review changed files
const analysis = await analyzer.analyze(pr, state);
// Returns: { filesToReview: 2, cachedFiles: 18 }
// Only calls LLM for 2 files instead of 20
```

**4. Context Optimization**
```typescript
// Fit within token budget
const optimized = await contextOptimizer.optimize(
  files,
  provider.getContextWindow()  // 128k tokens
);
// Prioritizes important files, truncates less important
```

---

## 🧪 Testing Architecture

### Test Pyramid

```
         ╱╲
        ╱  ╲         E2E Tests (5%)
       ╱────╲        • Full action workflow
      ╱      ╲       • Real GitHub repo
     ╱────────╲      
    ╱          ╲     Integration Tests (25%)
   ╱────────────╲    • Multi-component
  ╱              ╲   • Mock GitHub/LLM APIs
 ╱────────────────╲  
╱                  ╲ Unit Tests (70%)
────────────────────
```

### Test Strategy

**Unit Tests** (70% of tests)
- Each function tested independently
- Mock all external dependencies
- Fast execution (<1s per test)
- Run on every commit

**Integration Tests** (25% of tests)
- Test component interactions
- Mock external APIs (GitHub, OpenAI)
- Medium execution (~5s per test)
- Run on every commit

**E2E Tests** (5% of tests)
- Full workflow with real GitHub repo
- Real API calls (in CI only)
- Slow execution (~60s per test)
- Run on PR merge only

### Test Coverage Target

```
Overall: 85%+
Critical paths: 95%+
Error handling: 90%+
```

---

## 🔐 Security Architecture

### Security Principles

1. **Never log sensitive data**
   - API keys redacted in logs
   - PR content not logged (only metadata)

2. **Validate all inputs**
   - Type checking with TypeScript
   - Runtime validation with Zod
   - Sanitize user inputs

3. **Principle of least privilege**
   - Request only necessary GitHub permissions
   - Read-only where possible

4. **Secure secrets management**
   - Use GitHub Secrets
   - Never hardcode keys
   - Clear error messages without exposing keys

### Required Permissions

```yaml
permissions:
  contents: read          # Read repo files
  pull-requests: write    # Post comments
  checks: write           # Create check runs
```

---

## 📈 Scalability Architecture

### Horizontal Scalability

- ✅ **No shared state:** Each action run is independent
- ✅ **No coordination needed:** No race conditions
- ✅ **Stateless design:** State stored in GitHub, not in-memory

### Vertical Scalability

- ✅ **Efficient caching:** Reduces API calls by 60%
- ✅ **Incremental processing:** Only process deltas
- ✅ **Token optimization:** Maximize context utilization

### GitHub Limits

| Resource | Limit | Our Usage |
|----------|-------|-----------|
| GitHub Cache | 10 GB/repo | ~500 MB typical |
| API Rate Limit | 5000/hour | ~50 per review |
| Actions Minutes | Variable | ~2 min per review |

---

## 🔮 Future Architecture (v2.1+)

### Planned Enhancements

**1. Streaming Responses**
```typescript
async *streamReview(prompt: string): AsyncGenerator<ReviewChunk> {
  const stream = await provider.createStream(prompt);
  for await (const chunk of stream) {
    yield chunk;
    await postPartialComment(chunk);  // Live updates
  }
}
```

**2. Additional Providers**
- Google Gemini 2.0
- Anthropic Claude 3.5
- xAI Grok
- Local models via Ollama

**3. Advanced Features**
- Full repository scanning
- Cross-file analysis
- Security vulnerability detection
- Performance profiling

---

## 📚 References

### GitHub APIs Used
- [Actions Cache API](https://github.com/actions/cache)
- [Octokit REST API](https://octokit.github.io/rest.js/)
- [GitHub Check Runs](https://docs.github.com/en/rest/checks/runs)

### External APIs
- [OpenAI Chat Completions](https://platform.openai.com/docs/api-reference/chat)
- [OpenWebUI API](https://docs.openwebui.com/)

### Tools & Libraries
- [TypeScript](https://www.typescriptlang.org/)
- [Rollup](https://rollupjs.org/)
- [Jest](https://jestjs.io/)
- [Handlebars](https://handlebarsjs.com/)

---

**Document Version:** 1.0  
**Last Updated:** November 18, 2025  
**Next Review:** December 1, 2025
