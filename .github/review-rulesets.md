# Repository Code Review Rulesets

## Mandatory Rules for This Repository

These rules are **non-negotiable** and must be enforced in every code review. Violations block PR approval.

---

## 🔒 Security Rules (Blocking)

### S1: No Secrets in Code
**Status**: 🔴 **BLOCKING**

All secrets, API keys, tokens, and credentials must be stored in environment variables or GitHub Secrets.

**Requirements:**
```javascript
// ❌ NEVER
const apiKey = "sk-proj-abc123...";
console.log(`Using key: ${process.env.CHATGPT_API_KEY}`);  // Never log secrets!

// ✅ ALWAYS
const apiKey = process.env.CHATGPT_API_KEY;
if (!apiKey) {
  throw new Error('CHATGPT_API_KEY environment variable required');
}
console.log('Making API call...');  // Log action, not secret
```

### S2: Secure External HTTP Calls
**Status**: 🔴 **BLOCKING**

All HTTP/HTTPS calls to external services must:
- Use HTTPS (never HTTP for external APIs)
- Validate TLS certificates (never disable verification)
- Implement timeouts (5-30 seconds recommended)
- Handle network errors gracefully

**Requirements:**
```javascript
// ❌ BAD - No timeout, insecure
const response = await fetch(url);

// ✅ GOOD - With timeout and proper error handling
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);
try {
  const response = await fetch(url, {
    signal: controller.signal,
    headers: { 'User-Agent': 'ai-code-reviewer/1.1.0' }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return await response.json();
} catch (error) {
  if (error.name === 'AbortError') {
    throw new TimeoutError('Request timed out after 10s');
  }
  throw new NetworkError('Request failed', { cause: error });
} finally {
  clearTimeout(timeout);
}
```

### S3: Input Validation Required
**Status**: 🔴 **BLOCKING**

All external inputs must be validated before use:
- PR numbers, repository names, user inputs
- Environment variables
- API responses
- File contents

**Requirements:**
```javascript
// ❌ BAD - No validation
function processPR(prNumber) {
  return fetchPR(prNumber);
}

// ✅ GOOD - Proper validation
function processPR(prNumber) {
  if (!Number.isInteger(prNumber) || prNumber < 1) {
    throw new ValidationError(`Invalid PR number: ${prNumber}`);
  }
  if (prNumber > 999999) {  // Sanity check
    throw new ValidationError('PR number out of expected range');
  }
  return fetchPR(prNumber);
}
```

---

## ⚡ Performance Rules

### P1: No Blocking Operations
**Status**: 🟠 **WARNING**

GitHub Actions entry points must use async/await. Never use blocking synchronous operations.

**Requirements:**
```javascript
// ❌ BAD - Blocking I/O in action
const data = fs.readFileSync('file.json');

// ✅ GOOD - Async I/O
const data = await fs.promises.readFile('file.json', 'utf8');
```

### P2: Respect Resource Limits
**Status**: 🟠 **WARNING**

Implement limits to prevent resource exhaustion:
- `max-files` - Limit number of files processed
- `max-diff-chars` - Limit diff size per file
- `max-output-tokens` - Limit AI response size

**Requirements:**
```javascript
// ✅ Enforce limits
const files = allFiles.slice(0, maxFiles);
const diff = largeDiff.substring(0, maxDiffChars);
```

### P3: Efficient API Usage
**Status**: 🟡 **ADVISORY**

Minimize API calls:
- Batch requests when possible
- Cache results when appropriate
- Use conditional requests (ETags)
- Respect rate limits

---

## 📋 Code Quality Rules

### Q1: Comprehensive Error Handling
**Status**: 🔴 **BLOCKING**

All error conditions must be handled explicitly with meaningful messages.

**Requirements:**
```javascript
// ❌ BAD - Silent failure
try {
  await operation();
} catch (error) {
  // Ignored!
}

// ✅ GOOD - Proper handling
try {
  await operation();
} catch (error) {
  console.error('Operation failed:', error.message);
  throw new OperationError('Failed to complete operation', {
    cause: error,
    context: { operation: 'fetch' }
  });
}
```

### Q2: Test Coverage Required
**Status**: 🟠 **WARNING**

New code must include tests:
- Unit tests for all new functions
- Test success AND error paths
- Maintain >75% overall coverage (lines, branches, functions)
- Integration tests for workflows

**Requirements:**
```javascript
// For every new function in src/
describe('myFunction', () => {
  it('should handle valid input', () => {
    expect(myFunction('valid')).toBe('expected');
  });
  
  it('should throw on invalid input', () => {
    expect(() => myFunction(null)).toThrow(ValidationError);
  });
  
  it('should handle edge cases', () => {
    expect(myFunction('')).toBe('');
    expect(myFunction('   ')).toBe('');
  });
});
```

### Q3: Code Documentation
**Status**: 🟡 **ADVISORY**

Public functions must have JSDoc comments:

**Requirements:**
```javascript
/**
 * Builds a prompt for the AI provider
 * @param {string} task - Task type (review, summary, suggestions)
 * @param {object} prData - Pull request data from GitHub
 * @param {object} options - Additional options
 * @param {string} options.instructions - Custom instructions
 * @param {string} options.rulesets - Repository rulesets
 * @returns {string} Formatted prompt for AI
 * @throws {ValidationError} If required parameters are missing
 */
function buildPrompt(task, prData, options = {}) {
  // Implementation...
}
```

---

## ✅ GitHub Actions Compliance

### W1: Minimal Permissions
**Status**: 🔴 **BLOCKING**

Workflows must specify exact permissions needed. Never use `permissions: write-all`.

**Requirements:**
```yaml
# ❌ BAD - Excessive permissions
permissions: write-all

# ✅ GOOD - Minimal permissions
permissions:
  contents: read           # Read repository files
  pull-requests: write     # Post PR comments
```

### W2: Pin Action Versions
**Status**: 🟠 **WARNING**

Use specific version tags, not `@main` or `@master`.

**Requirements:**
```yaml
# ❌ BAD - Unpinned version
uses: actions/checkout@main

# ✅ GOOD - Pinned version
uses: actions/checkout@v4
```

### W3: Document Environment Variables
**Status**: 🟡 **ADVISORY**

New environment variables must be documented in README.md before merge.

**Requirements:**
- Add to "Environment Variables" section
- Describe purpose and format
- Indicate if required or optional
- Provide example values (not real secrets!)

---

## 📦 Dependency Management

### D1: Justify New Dependencies
**Status**: 🟠 **WARNING**

New dependencies must be justified in PR description:
- Why is it needed?
- What alternatives were considered?
- What is the bundle size impact?
- Is it actively maintained?

### D2: Security Scanning
**Status**: 🔴 **BLOCKING**

Dependencies must pass security scans:
- No critical vulnerabilities
- No high severity issues without mitigation plan
- Review Dependabot alerts promptly

**Requirements:**
```bash
# Must pass before merge
npm audit --audit-level=high
```

### D3: License Compatibility
**Status**: 🟡 **ADVISORY**

New dependencies must have compatible licenses:
- MIT, Apache 2.0, BSD (preferred)
- Check for GPL conflicts
- Document license in package.json

---

## 📝 Documentation Requirements

### DOC1: Update README for Features
**Status**: 🟠 **WARNING**

New features must update README.md with:
- Description of the feature
- Configuration examples
- Usage instructions

### DOC2: Update CHANGELOG
**Status**: 🟠 **WARNING**

All user-facing changes must be documented in CHANGELOG.md:
- Use conventional commit format
- Describe what changed and why
- Note any breaking changes
- Credit contributors

### DOC3: Code Comments for Complexity
**Status**: 🟡 **ADVISORY**

Complex logic should have explanatory comments:
- Algorithm explanations
- Why certain approaches were chosen
- Known limitations or edge cases
- Links to relevant issues/documentation

---

## Enforcement

- 🔴 **Blocking Rules**: MUST be fixed before merge
- 🟠 **Warning Rules**: SHOULD be fixed, or explain why not
- 🟡 **Advisory Rules**: Good to have, use judgment

Violations of blocking rules will result in PR changes requested with clear explanation and fix requirements.
