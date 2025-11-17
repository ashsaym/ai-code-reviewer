# Contributing to AI Code Reviewer

Thank you for your interest in contributing to AI Code Reviewer! 🎉

This guide will help you get started with contributing to the project, whether you're fixing bugs, adding features, improving documentation, or helping with code reviews.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Running Tests](#running-tests)
- [Code Quality](#code-quality)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)
- [Documentation](#documentation)
- [Getting Help](#getting-help)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior by opening an issue or contacting the maintainers.

**TL;DR:** Be respectful, inclusive, and constructive in all interactions.

## Getting Started

We welcome contributions of all kinds:

- 🐛 **Bug fixes** - Fix issues and improve stability
- ✨ **New features** - Add new functionality or providers
- 📚 **Documentation** - Improve guides, examples, and clarity
- 🧪 **Tests** - Increase coverage and test reliability
- 🎨 **Code quality** - Refactoring and improvements
- 💡 **Ideas** - Suggestions for enhancements

## Development Setup

### Prerequisites

Before you begin, make sure you have:

- **Node.js 20.x or higher** ([Download](https://nodejs.org/))
- **npm** (included with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **GitHub account** ([Sign up](https://github.com/join))
- Basic knowledge of JavaScript and GitHub Actions

### Fork and Clone

1. **Fork the repository** on GitHub by clicking the "Fork" button

2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ai-code-reviewer.git
   cd ai-code-reviewer
   ```

3. **Add upstream remote** to sync with the main repository:
   ```bash
   git remote add upstream https://github.com/ashsaym/ai-code-reviewer.git
   ```

4. **Navigate to the action directory**:
   ```bash
   cd next-gen-ai-reviewer
   ```

5. **Install dependencies**:
   ```bash
   npm install
   ```

6. **Verify the setup** by running tests:
   ```bash
   npm test
   ```

You're all set! 🚀

## Development Workflow

### Project Structure

```
ai-code-reviewer/
├── next-gen-ai-reviewer/           # Main GitHub Action
│   ├── src/
│   │   ├── main.js                 # Entry point and orchestration
│   │   ├── github.js               # GitHub API client
│   │   ├── promptBuilder.js        # AI prompt generation
│   │   ├── reviewFormatter.js      # Response formatting
│   │   ├── guidanceLoader.js       # Load .github/ guidance files
│   │   └── providers/              # AI provider implementations
│   │       ├── chatgpt.js          # OpenAI ChatGPT provider
│   │       ├── claude.js           # Anthropic Claude provider
│   │       └── selfHosted.js       # Self-hosted/Open WebUI provider
│   ├── tests/
│   │   ├── unit/                   # Unit tests for each module
│   │   └── integration/            # Integration tests
│   ├── examples/                   # Example configurations
│   │   ├── .github/                # Example guidance files
│   │   └── workflows/              # Example workflow files
│   ├── action.yml                  # Action metadata
│   └── package.json                # Dependencies and scripts
├── .github/
│   ├── workflows/                  # CI/CD pipelines
│   ├── prompts/                    # Prompt templates for this repo
│   └── review-*.md                 # Guidance files for this repo
├── README.md                       # Main documentation
├── CONTRIBUTING.md                 # This file
├── CODE_OF_CONDUCT.md              # Community guidelines
└── SECURITY.md                     # Security policy
```

### Creating a Branch

Always create a new branch for your changes:

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/my-awesome-feature

# Or for bug fixes
git checkout -b fix/issue-123
```

**Branch naming conventions:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or improvements
- `chore/` - Maintenance tasks

### Making Changes

**Best Practices:**

1. **Start with tests** - Write tests first (TDD) or alongside your changes
2. **Keep changes focused** - One feature or fix per pull request
3. **Follow conventions** - Match existing code style and patterns
4. **Test thoroughly** - Ensure all tests pass and add new ones
5. **Update docs** - Keep documentation in sync with code changes
6. **Check security** - Review changes for security implications

**Development cycle:**

```bash
# Make your changes
vim src/providers/newProvider.js

# Run tests frequently
npm test

# Fix linting issues
npm run lint:fix

# Run tests again
npm test

# Commit your changes
git add .
git commit -m "feat(providers): add support for new provider"
```

## Running Tests

We use Jest for testing with comprehensive coverage requirements.

### Test Commands

```bash
# Run all tests with coverage report
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests  
npm run test:integration

# Watch mode for development (re-runs on file changes)
npm run test:watch

# Run specific test file
npm test -- tests/unit/github.test.js
```

### Coverage Requirements

The project maintains high coverage standards:

| Metric | Threshold | Current |
|--------|-----------|---------|
| Statements | 77% | ~78% |
| Branches | 67% | ~67% |
| Functions | 79% | ~79% |
| Lines | 78% | ~78% |

**Your changes should:**
- Not decrease overall coverage
- Include tests for new functionality
- Include tests for bug fixes (regression tests)
- Test both success and error paths

### Writing Tests

**Test file organization:**
```
tests/
├── unit/
│   ├── github.test.js          # Tests for github.js
│   ├── promptBuilder.test.js   # Tests for promptBuilder.js
│   └── ...
└── integration/
    └── fullWorkflow.test.js    # End-to-end tests
```

**Example test:**
```javascript
describe("myFunction", () => {
  it("should handle valid input", () => {
    const result = myFunction("valid input");
    expect(result).toBe("expected output");
  });

  it("should throw on invalid input", () => {
    expect(() => myFunction(null)).toThrow("Invalid input");
  });

  it("should handle edge cases", () => {
    expect(myFunction("")).toBe("");
    expect(myFunction("   ")).toBe("");
  });
});
```

### Debugging Tests

```bash
# Run with verbose output
npm test -- --verbose

# Run single test with debugging
node --inspect-brk node_modules/.bin/jest tests/unit/github.test.js
```

## Code Quality

### Linting with ESLint

We use ESLint to maintain code quality and consistency.

```bash
# Check for linting issues
npm run lint

# Auto-fix most issues
npm run lint:fix
```

**ESLint will check for:**
- Code style consistency
- Potential bugs and errors
- Best practice violations
- Security issues

Fix all linting errors before submitting your PR.

### Code Style Guidelines

**JavaScript Style:**
- ✅ Use double quotes for strings: `"hello"`
- ✅ Always use semicolons: `const x = 5;`
- ✅ Use 2-space indentation
- ✅ Prefer `const` over `let`
- ❌ Never use `var`
- ✅ Use descriptive variable names: `userCount` not `cnt`
- ✅ Use camelCase for variables and functions: `getUserData()`
- ✅ Use PascalCase for classes: `UserManager`
- ✅ Use UPPER_SNAKE_CASE for constants: `MAX_RETRIES`

**File Organization:**
- Keep files focused on a single responsibility
- Maximum 400 lines per file (consider splitting larger files)
- Group related functions together
- Put helper functions at the bottom

**Comments:**
- Add JSDoc comments for exported functions
- Use inline comments for complex logic
- Avoid obvious comments
- Keep comments up-to-date with code changes

**JSDoc Example:**

```javascript
/**
 * Parse AI review response with comprehensive error handling
 * 
 * @param {string} content - Raw response content from AI provider
 * @param {object} options - Parsing options
 * @param {boolean} options.strict - Whether to throw on parsing errors
 * @returns {object} Parsed review object with reviews array
 * @throws {Error} If content is invalid or parsing fails in strict mode
 * 
 * @example
 * const review = parseReviewJSON('{"reviews": []}', { strict: true });
 */
function parseReviewJSON(content, options = {}) {
  if (!content || typeof content !== "string") {
    throw new Error("Invalid content: expected non-empty string");
  }
  
  // Implementation...
}
```

### Error Handling

**Always handle errors gracefully:**

```javascript
// ✅ Good - specific error with context
throw new Error(`Failed to fetch PR #${prNumber}: ${error.message}`);

// ❌ Bad - generic error
throw new Error("Something went wrong");

// ✅ Good - try-catch with logging
try {
  await riskyOperation();
} catch (error) {
  console.error("Operation failed:", error);
  return fallbackValue;
}
```

### Security Practices

- Never log API keys or secrets
- Validate all external inputs
- Use parameterized queries (if applicable)
- Sanitize user-provided content
- Follow principle of least privilege

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) for clear, semantic commit history.

### Commit Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(providers): add Gemini support` |
| `fix` | Bug fix | `fix(github): handle API rate limits` |
| `docs` | Documentation only | `docs(readme): update setup instructions` |
| `style` | Code style/formatting | `style: fix indentation in main.js` |
| `refactor` | Code refactoring | `refactor(promptBuilder): simplify template logic` |
| `test` | Add/update tests | `test(github): add tests for error handling` |
| `chore` | Maintenance | `chore: update dependencies` |
| `perf` | Performance improvement | `perf(formatter): optimize JSON parsing` |
| `ci` | CI/CD changes | `ci: add CodeQL workflow` |

### Scopes

Common scopes in this project:
- `providers` - AI provider implementations
- `github` - GitHub API interactions
- `formatter` - Response formatting
- `prompts` - Prompt building
- `guidance` - Guidance file loading
- `tests` - Test-related changes
- `docs` - Documentation
- `workflows` - GitHub Actions workflows

### Writing Good Commits

**Subject line (first line):**
- Use imperative mood: "add" not "added" or "adds"
- Don't capitalize first letter
- No period at the end
- 50 characters or less
- Be descriptive but concise

**Body (optional):**
- Explain what and why, not how
- Wrap at 72 characters
- Use bullet points for multiple changes

**Footer (optional):**
- Reference issues: `Fixes #123`, `Closes #456`
- Breaking changes: `BREAKING CHANGE: description`

### Examples

**Simple feature:**
```
feat(providers): add support for Google Gemini

Implements Gemini AI provider with streaming capabilities
and proper error handling for rate limits.

Closes #123
```

**Bug fix:**
```
fix(reviewFormatter): handle empty diff sections

Position calculation was failing when diff sections
were empty, causing inline comments to fail.

This fix:
- Validates diff content before processing
- Falls back to file comment if position can't be calculated
- Adds test coverage for edge case

Fixes #456
```

**Breaking change:**
```
feat(api)!: change provider configuration format

BREAKING CHANGE: Provider configuration now uses a
structured object instead of comma-separated string.

Before:
  ai-provider: "chatgpt,claude"

After:
  ai-provider:
    - provider: chatgpt
      model: gpt-4o-mini
    - provider: claude
      model: claude-3-5-sonnet

Migration guide: See UPGRADING.md

Closes #789
```

### Multiple Commits

For related changes, make separate commits:

```bash
git add src/providers/gemini.js tests/unit/gemini.test.js
git commit -m "feat(providers): add Gemini provider"

git add docs/providers/gemini.md
git commit -m "docs(providers): add Gemini setup guide"

git add examples/workflows/ai-review-gemini.yml
git commit -m "docs(examples): add Gemini workflow example"
```

## Pull Request Process

### Pre-Submission Checklist

Before opening a pull request, ensure:

- [ ] **Tests pass:** `npm test` shows all green
- [ ] **Linter passes:** `npm run lint` reports no errors
- [ ] **Coverage maintained:** No decrease in test coverage
- [ ] **Documentation updated:** README, CHANGELOG, and relevant docs
- [ ] **Examples added:** If applicable, add workflow examples
- [ ] **Commits follow convention:** Use Conventional Commits format
- [ ] **Branch is up-to-date:** Synced with `main` branch

### Opening a Pull Request

1. **Push your changes** to your fork:
   ```bash
   git push origin feature/my-feature
   ```

2. **Create a Pull Request** on GitHub:
   - Go to the main repository
   - Click "New Pull Request"
   - Select your fork and branch
   - Click "Create Pull Request"

3. **Fill out the PR template** completely:
   - Clear description of changes
   - Type of change (bug fix, feature, docs, etc.)
   - Testing information
   - Screenshots (if UI changes)
   - Related issues

4. **Link related issues:**
   - Use `Fixes #123` for bug fixes
   - Use `Closes #456` for feature requests
   - Use `Relates to #789` for related issues

### PR Template

```markdown
## Description

Briefly describe what this PR does and why.

## Type of Change

- [ ] 🐛 Bug fix (non-breaking change fixing an issue)
- [ ] ✨ New feature (non-breaking change adding functionality)
- [ ] 💥 Breaking change (fix or feature causing existing functionality to change)
- [ ] 📚 Documentation update
- [ ] ♻️  Code refactoring
- [ ] ✅ Test addition or improvement

## Changes Made

- List specific changes
- Each change on a new line
- Be clear and concise

## Testing

Describe how you tested your changes:
- Unit tests added/updated
- Integration tests run
- Manual testing performed
- Edge cases considered

## Screenshots (if applicable)

Add screenshots for UI changes or visual examples.

## Checklist

- [ ] My code follows the project's code style
- [ ] I have performed a self-review of my code
- [ ] I have commented my code where necessary
- [ ] I have updated the documentation accordingly
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] I have updated CHANGELOG.md with my changes

## Related Issues

Fixes #(issue number)
Closes #(issue number)
Relates to #(issue number)
```

### Review Process

**Automated Checks:**
- ✅ Tests must pass (Jest test suite)
- ✅ Linting must pass (ESLint)
- ✅ Security scans must pass (CodeQL, Trivy)
- ✅ Coverage thresholds must be met

**Human Review:**
1. A maintainer will review your PR within 3-5 business days
2. They may request changes or ask questions
3. Address feedback by pushing new commits
4. Maintainer approves when ready

**Merging:**
- At least 1 maintainer approval required
- All checks must pass
- No unresolved conversations
- Maintainer will merge (squash and merge typically)

### Addressing Feedback

**Responding to review comments:**

```markdown
> Consider using async/await here instead of promises

Good catch! I've updated it to use async/await in commit abc123.
```

**Making requested changes:**

```bash
# Make the changes
vim src/myfile.js

# Commit with descriptive message
git add src/myfile.js
git commit -m "refactor: use async/await as suggested"

# Push to your PR branch
git push origin feature/my-feature
```

**Keeping PR updated:**

```bash
# Sync with main repository
git fetch upstream
git rebase upstream/main

# Force push (safe for PR branches)
git push --force-with-lease origin feature/my-feature
```

### After Merge

Once your PR is merged:

1. **Delete your branch:**
   ```bash
   git branch -d feature/my-feature
   git push origin --delete feature/my-feature
   ```

2. **Sync your fork:**
   ```bash
   git checkout main
   git pull upstream main
   git push origin main
   ```

3. **Celebrate!** 🎉 Your contribution is now part of the project!

## Reporting Bugs

Found a bug? Help us fix it!

### Before Reporting

1. **Search existing issues** to avoid duplicates:
   - Check [open issues](https://github.com/ashsaym/ai-code-reviewer/issues)
   - Check [closed issues](https://github.com/ashsaym/ai-code-reviewer/issues?q=is%3Aissue+is%3Aclosed)

2. **Verify the bug:**
   - Test with the latest version
   - Try in a clean environment
   - Check if it's a configuration issue

3. **Collect information:**
   - Workflow file configuration
   - Error messages and logs
   - Environment details

### Creating a Bug Report

1. Go to [Issues](https://github.com/ashsaym/ai-code-reviewer/issues/new)
2. Select "Bug Report" template
3. Fill out all sections completely
4. Add relevant labels (e.g., `bug`, `needs-triage`)

### Bug Report Template

```markdown
## Bug Description

A clear and concise description of the bug.

## To Reproduce

Steps to reproduce the behavior:

1. Configure workflow with these settings:
   ```yaml
   # Your workflow configuration
   ```

2. Create a PR with:
   - Description of changes
   - Files modified

3. Observe the error/unexpected behavior

## Expected Behavior

What you expected to happen instead.

## Actual Behavior

What actually happened. Include error messages, logs, or screenshots.

## Logs and Error Messages

```
Paste relevant logs here
```

Screenshots:
![Screenshot description](url-to-screenshot)

## Environment

- **Action Version:** v1.1.0
- **AI Provider:** ChatGPT / Claude / Self-hosted
- **Model:** gpt-4o-mini / claude-3-5-sonnet / llama3:70b
- **Runner:** ubuntu-latest / ubuntu-22.04
- **Node.js Version:** (if known)

## Workflow Configuration

```yaml
# Paste your workflow file here
```

## Additional Context

Any other information that might help:
- Is this a new setup or was it working before?
- Did you recently change any configuration?
- Are there any custom guidance files (.github/review-*.md)?
- Does it happen consistently or intermittently?

## Possible Solution

If you have ideas on how to fix it, share them here.
```

### Security Vulnerabilities

**Do not report security vulnerabilities as public issues!**

See our [Security Policy](SECURITY.md) for how to report security issues privately.

## Requesting Features

Have an idea to make AI Code Reviewer better? We'd love to hear it!

### Before Requesting

1. **Check existing requests:**
   - Search [issues](https://github.com/ashsaym/ai-code-reviewer/issues) for similar ideas
   - Check [discussions](https://github.com/ashsaym/ai-code-reviewer/discussions) for proposals

2. **Consider the scope:**
   - Does it fit the project's goals?
   - Would it benefit many users?
   - Is it technically feasible?

### Creating a Feature Request

1. Go to [Issues](https://github.com/ashsaym/ai-code-reviewer/issues/new)
2. Select "Feature Request" template
3. Describe your idea clearly
4. Add `enhancement` label

### Feature Request Template

```markdown
## Feature Summary

One-sentence description of the feature.

## Problem Statement

Describe the problem or limitation you're facing:
- What are you trying to accomplish?
- What makes it difficult with the current version?
- How does this affect your workflow?

## Proposed Solution

Describe your ideal solution:
- How would you like it to work?
- What would the API/interface look like?
- Any specific implementation ideas?

## Example Usage

Show how the feature would be used:

```yaml
# Example workflow configuration
- uses: ashsaym/ai-code-reviewer/next-gen-ai-reviewer@v1.1.0
  with:
    new-feature: enabled
    new-option: value
```

## Alternatives Considered

What other solutions have you considered?
- Alternative approach 1
- Alternative approach 2
- Why the proposed solution is better

## Benefits

Who would benefit from this feature?
- Individual developers
- Teams
- Enterprise users
- Specific use cases

## Additional Context

- Mockups or diagrams
- Links to similar implementations
- Related issues or discussions
- Any other relevant information

## Implementation Notes (Optional)

If you have technical insights:
- Suggested approach
- Potential challenges
- Breaking changes
- Migration path
```

### Feature Development Guidelines

**Before implementing:**
1. Discuss in an issue first for large features
2. Get maintainer buy-in on the approach
3. Consider backward compatibility

**While implementing:**
1. Break into smaller, reviewable PRs
2. Add comprehensive tests
3. Update documentation
4. Add examples

**Breaking changes:**
- Clearly document what breaks
- Provide migration guide
- Use semantic versioning
- Announce in advance if possible

## Documentation

Good documentation is just as important as good code!

### Types of Documentation

1. **Code Comments**
   - JSDoc for functions and classes
   - Inline comments for complex logic
   - Keep comments updated with code

2. **README Files**
   - Main README.md - Project overview
   - next-gen-ai-reviewer/README.md - Action details
   - Keep examples up-to-date

3. **Guides and Examples**
   - Workflow examples in examples/
   - Configuration examples
   - Troubleshooting guides

4. **CHANGELOG**
   - Document all user-facing changes
   - Follow Keep a Changelog format
   - Update with each PR

### Documentation Standards

**Writing Style:**
- Clear and concise
- Use active voice
- Provide examples
- Consider different experience levels

**Formatting:**
- Use Markdown formatting
- Include code blocks with syntax highlighting
- Add screenshots where helpful
- Use tables for comparisons

**Examples Should:**
- Be complete and working
- Include comments explaining key parts
- Cover common use cases
- Show best practices

## Getting Help

Need assistance? We're here to help!

### Resources

- 📚 **[Documentation](README.md)** - Full project documentation
- 💬 **[Discussions](https://github.com/ashsaym/ai-code-reviewer/discussions)** - Ask questions, share ideas
- 🐛 **[Issues](https://github.com/ashsaym/ai-code-reviewer/issues)** - Report bugs, request features
- 🔐 **[Security Policy](SECURITY.md)** - Report security vulnerabilities

### Communication Channels

**For general questions:**
- Start a [Discussion](https://github.com/ashsaym/ai-code-reviewer/discussions)
- Check existing discussions first

**For bugs and features:**
- Open an [Issue](https://github.com/ashsaym/ai-code-reviewer/issues)
- Use appropriate templates

**For sensitive matters:**
- Security issues: See [SECURITY.md](SECURITY.md)
- Private concerns: Contact maintainers via GitHub

### Response Times

We aim to respond to:
- Security issues: Within 48 hours
- Bug reports: Within 3-5 business days
- Feature requests: Within 1 week
- Questions: Within 1 week
- Pull requests: Within 3-5 business days

## Recognition

Contributors are recognized in several ways:

- 🌟 Listed in GitHub Contributors
- 📝 Mentioned in release notes
- 💬 Acknowledged in issue/PR comments
- 🏆 Special recognition for significant contributions

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).

**In summary:**
- Be respectful and inclusive
- Welcome newcomers
- Accept constructive criticism
- Focus on what's best for the community
- Show empathy towards others

## License

By contributing to AI Code Reviewer, you agree that your contributions will be licensed under the [MIT License](LICENSE).

This means:
- Your code can be used freely
- You retain copyright to your contributions
- You're granting the project a license to use your code
- Others can use, modify, and distribute the project

---

## Thank You! 🎉

Every contribution, no matter how small, makes a difference. Whether you're fixing a typo, adding a feature, or helping others in discussions, you're helping make AI Code Reviewer better for everyone.

**Happy Contributing!** 🚀

---

**Questions about contributing?** Open a [Discussion](https://github.com/ashsaym/ai-code-reviewer/discussions) and we'll help you get started!
