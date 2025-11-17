# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Removed
- 🗑️ Removed mock provider entirely from codebase and documentation

### Added
- ✨ GitHub-style inline review comments with position-based commenting
- ✨ Explicit `expectJson` flag passed to providers instead of prompt inspection
- ✨ `computePositionFromPatch` function for accurate diff position calculation
- ✨ Comprehensive test suite with Jest (unit and integration tests)
- ✨ ESLint configuration for code quality
- ✨ CI/CD pipeline with test automation
- ✨ CodeQL security scanning workflow
- ✨ Dependency scanning with Trivy
- ✨ Secret scanning with Gitleaks
- ✨ Coverage reporting with Codecov
- ✨ Comprehensive README with examples and troubleshooting
- ✨ Integration test placeholder structure

### Fixed
- 🐛 Fixed missing `packageJson` import in `main.js` causing runtime error
- 🐛 Fixed `getInput` undefined error - now properly defined in `main.js`
- 🐛 Fixed GitHub API payload to use `position` instead of `line` for review comments
- 🐛 Improved diff parsing to handle hunk headers without counts (e.g., `@@ -1 +1 @@`)
- 🐛 Enhanced JSON parsing with better error messages and fence removal
- 🐛 Added validation for review comment line numbers against actual diff content
- 🐛 Improved error handling in `postInlineReview` with detailed logging
- 🐛 Fixed provider response validation to handle missing model/provider fields

### Changed
- ♻️ Refactored providers to accept explicit `expectJson` parameter
- ♻️ Updated ChatGPT provider to use `response_format: { type: "json_object" }` when appropriate
- ♻️ Improved `parseReviewJSON` to handle various markdown fence formats and extract JSON from text
- ♻️ Enhanced `formatReviewComment` with severity badges and suggestion blocks
- ♻️ Improved error messages throughout the codebase for better debugging

### Security
- 🔒 Added CodeQL analysis for vulnerability detection
- 🔒 Added Trivy dependency scanning
- 🔒 Added Gitleaks secret scanning
- 🔒 Configured minimal required permissions in workflows
- 🔒 Added dependency review for pull requests

## [0.1.0] - 2024-11-17

### Added
- Initial release of Next Gen AI Reviewer
- Multi-provider support (ChatGPT, Claude, Self-Hosted)
- Multiple task types (review, summary, suggestions)
- Repository guidance file support
- Configurable prompts and models
- Auto-detection of PR number
- Fallback provider mechanism

[Unreleased]: https://github.com/ashsaym/ai-code-reviewer/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ashsaym/ai-code-reviewer/releases/tag/v0.1.0
