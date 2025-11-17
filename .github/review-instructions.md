# AI Code Review Instructions for This Repository

## Review Philosophy

This repository values **quality, security, and maintainability** above all else. When reviewing code:

1. **Correctness First**: Identify bugs, logic errors, and potential failures before anything else
2. **Security Second**: Flag vulnerabilities, data exposure risks, and unsafe practices
3. **Maintainability Third**: Consider long-term code health and developer experience
4. **Style Last**: Only mention style issues if they significantly impact readability

## Specific Guidance for This Project

### Priority Areas

**Critical Attention Required:**
- **GitHub Actions Security**: This project contains workflow files that must follow security best practices
- **Secret Handling**: API keys and tokens must never be logged or exposed
- **AI Provider Integration**: Review error handling and fallback mechanisms thoroughly
- **Test Coverage**: All provider implementations and core logic must be well-tested

**Key Focus Areas:**
- Proper error handling with meaningful messages
- Input validation for all external data
- Comprehensive test coverage (maintain >75% coverage)
- Clear documentation for public interfaces
- Security scanning integration

### Project-Specific Conventions

**Code Organization:**
- `src/providers/` - Each AI provider in separate file
- `src/main.js` - Entry point and orchestration
- `tests/unit/` - Unit tests mirroring source structure
- Keep functions focused and < 50 lines when possible

**Error Handling:**
```javascript
// Preferred pattern
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error('Operation failed:', error.message);  // Log for debugging
  throw new CustomError('User-friendly message', { cause: error });  // Throw with context
}
```

**Testing Requirements:**
- Unit test for every exported function
- Test both success and error paths
- Mock external dependencies (GitHub API, AI providers)
- Integration tests for end-to-end workflows
- Maintain coverage thresholds (see CONTRIBUTING.md)

### Review Style

**When Providing Feedback:**
- Reference exact files and line numbers: `src/github.js:45-50`
- Explain WHY something is an issue, not just what
- Provide code examples for suggested fixes
- Group related issues together
- Be direct and professional—no pleasantries needed

**Severity Levels:**
- **Critical** 🔴: Blocks merge - security issues, data corruption, breaking bugs
- **High** 🟠: Should fix before merge - significant bugs, missing tests, performance issues
- **Medium** 🟡: Address soon - code quality, maintainability, minor bugs
- **Low** 🟢: Nice to have - style, refactoring, optimizations

### Test Coverage Expectations

When code is added or modified:
- **New Functions**: Must have unit tests
- **Bug Fixes**: Must have regression tests
- **Providers**: Must test success, failure, and edge cases
- **Integration**: End-to-end workflow tests for major features

Call out missing tests explicitly:
```markdown
**Missing Tests:**
- Test for invalid API key response
- Test for network timeout handling
- Test for empty diff scenario
```

### Documentation Standards

Required documentation:
- JSDoc comments for all exported functions
- README updates for new features
- CHANGELOG entries for user-facing changes
- Inline comments for complex logic
- Example workflows for new providers

### Common Pitfalls to Watch For

**In This Codebase:**
- ❌ Logging secrets or API keys
- ❌ Not handling API rate limits
- ❌ Missing error handling in async functions
- ❌ Hardcoded configuration values
- ❌ Excessive permissions in workflows
- ❌ Not validating user inputs
- ❌ Missing tests for error paths

**GitHub Actions Specific:**
- ❌ Using `permissions: write-all`
- ❌ Not pinning action versions
- ❌ Exposing secrets in workflow logs
- ❌ Running workflows on untrusted input

### Code Examples

**Good:**
```javascript
/**
 * Fetch pull request data from GitHub API
 * @param {object} octokit - Authenticated GitHub client
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} prNumber - Pull request number
 * @returns {Promise<object>} Pull request data
 * @throws {GitHubApiError} If API call fails
 */
async function fetchPullRequest(octokit, owner, repo, prNumber) {
  if (!prNumber || prNumber < 1) {
    throw new ValidationError('Invalid PR number');
  }
  
  try {
    const { data } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber
    });
    return data;
  } catch (error) {
    console.error(`Failed to fetch PR #${prNumber}:`, error.message);
    throw new GitHubApiError('Unable to fetch pull request', { cause: error });
  }
}
```

**Bad:**
```javascript
// Missing documentation, no validation, poor error handling
async function fetchPullRequest(octokit, owner, repo, prNumber) {
  const { data } = await octokit.rest.pulls.get({
    owner, repo, pull_number: prNumber
  });
  return data;
}
```

## Summary

Focus on making this codebase:
- **Secure**: No vulnerabilities, proper secret handling
- **Reliable**: Comprehensive error handling and testing
- **Maintainable**: Clear code, good documentation
- **Performant**: Efficient algorithms, proper resource management

Be thorough but constructive. Help us ship high-quality code that users can trust.
