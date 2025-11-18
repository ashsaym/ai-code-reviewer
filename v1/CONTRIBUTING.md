# Contributing to Next Gen AI Reviewer

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Running Tests](#running-tests)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## Code of Conduct

This project adheres to a code of conduct that all contributors are expected to follow. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm (comes with Node.js)
- Git
- GitHub account

### Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ai-code-reviewer.git
   cd ai-code-reviewer/next-gen-ai-reviewer
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a branch for your changes:
   ```bash
   git checkout -b feature/my-new-feature
   ```

## Development Workflow

### Project Structure

```
next-gen-ai-reviewer/
├── src/
│   ├── main.js              # Entry point
│   ├── github.js            # GitHub API interactions
│   ├── promptBuilder.js     # Prompt construction
│   ├── reviewFormatter.js   # Response parsing and formatting
│   ├── guidanceLoader.js    # Load repository guidance files
│   └── providers/           # AI provider implementations
│       ├── chatgpt.js
│       ├── claude.js
│       ├── selfHosted.js
│       └── mock.js
├── tests/
│   ├── unit/               # Unit tests
│   └── integration/        # Integration tests
├── action.yml              # GitHub Action metadata
├── package.json            # Dependencies and scripts
└── eslint.config.js        # Linting rules
```

### Making Changes

1. **Write tests first**: Add tests for new functionality before implementing it
2. **Keep changes focused**: One feature/fix per pull request
3. **Follow coding standards**: Run linter before committing
4. **Update documentation**: Update README.md and CHANGELOG.md

## Running Tests

### Run all tests with coverage
```bash
npm test
```

### Run only unit tests
```bash
npm run test:unit
```

### Run only integration tests
```bash
npm run test:integration
```

### Watch mode (for TDD)
```bash
npm run test:watch
```

### Coverage thresholds

The project maintains minimum coverage thresholds:
- Statements: 45%
- Branches: 40%
- Functions: 50%
- Lines: 45%

Aim to maintain or improve these thresholds with your changes.

## Coding Standards

### ESLint

Run the linter to check for issues:
```bash
npm run lint
```

Fix auto-fixable issues:
```bash
npm run lint:fix
```

### Code Style

- Use double quotes for strings
- Use semicolons
- Use 2-space indentation
- Prefer `const` over `let`
- Never use `var`
- Use descriptive variable names
- Add JSDoc comments for exported functions

### Example

```javascript
/**
 * Parse AI review response JSON with error handling
 * @param {string} content - Raw content from AI provider
 * @returns {object} Parsed review data with reviews array
 * @throws {Error} If content is invalid or cannot be parsed
 */
function parseReviewJSON(content) {
  if (!content || typeof content !== 'string') {
    throw new Error("Invalid content: expected non-empty string");
  }
  
  // Implementation...
}
```

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(providers): add support for Gemini API

Implement Gemini provider with streaming support and
proper error handling.

Closes #123
```

```
fix(reviewFormatter): handle edge case in diff parsing

Fixed position calculation for diffs with single-line hunks.

Fixes #456
```

## Pull Request Process

### Before Submitting

1. ✅ All tests pass (`npm test`)
2. ✅ Linter passes (`npm run lint`)
3. ✅ Code is properly formatted
4. ✅ New features have tests
5. ✅ Bug fixes have regression tests
6. ✅ Documentation is updated
7. ✅ CHANGELOG.md is updated

### Submitting

1. Push your changes to your fork
2. Create a pull request on GitHub
3. Fill out the PR template completely
4. Link related issues
5. Request review from maintainers

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How was this tested?

## Checklist
- [ ] Tests pass locally
- [ ] Linter passes
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
```

### Review Process

1. Automated checks must pass (tests, linter, CodeQL)
2. At least one maintainer approval required
3. Address review feedback
4. Squash commits if requested
5. Maintainer will merge when ready

## Reporting Bugs

### Before Reporting

- Search existing issues to avoid duplicates
- Verify the bug in the latest version
- Collect relevant information

### Bug Report Template

```markdown
**Describe the bug**
Clear description of what the bug is

**To Reproduce**
Steps to reproduce:
1. Configure workflow with...
2. Create PR with...
3. See error...

**Expected behavior**
What you expected to happen

**Screenshots/Logs**
Relevant error messages or logs

**Environment**
- Node.js version:
- Action version:
- AI Provider:
- Model:

**Additional context**
Any other relevant information
```

## Suggesting Features

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
Description of the problem

**Describe the solution**
How you'd like to see it solved

**Describe alternatives**
Alternative solutions you've considered

**Additional context**
Mockups, examples, or other context
```

### Feature Development

1. Discuss in an issue before implementing large features
2. Break large features into smaller, reviewable PRs
3. Maintain backward compatibility when possible
4. Document breaking changes clearly

## Code Review Guidelines

### As a Reviewer

- Be constructive and respectful
- Explain the "why" behind suggestions
- Approve when ready, even if minor nitpicks remain
- Use GitHub suggestions for simple fixes

### As an Author

- Respond to all feedback
- Ask questions if unclear
- Don't take feedback personally
- Mark conversations as resolved when addressed

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md` with release notes
3. Create GitHub release with tag
4. Announce in discussions

## Getting Help

- 💬 **Discussions**: Ask questions, share ideas
- 🐛 **Issues**: Report bugs, request features
- 📧 **Email**: Contact maintainers directly for sensitive topics

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🎉
