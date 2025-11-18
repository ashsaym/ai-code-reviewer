# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.1.x   | :white_check_mark: |
| 1.0.x   | :white_check_mark: |
| 0.1.x   | :x:                |
| < 0.1   | :x:                |

## Reporting a Vulnerability

We take the security of ai-code-reviewer seriously. If you discover a security vulnerability, please follow these steps:

### 🔒 Private Disclosure

**DO NOT** open a public issue. Instead, please report security vulnerabilities through one of the following methods:

1. **GitHub Security Advisories** (Preferred)
   - Go to https://github.com/ashsaym/ai-code-reviewer/security/advisories
   - Click "Report a vulnerability"
   - Fill out the form with details

2. **Email**
   - Send an email to the repository maintainer through GitHub
   - Include "SECURITY" in the subject line
   - Provide detailed information about the vulnerability

### What to Include

When reporting a vulnerability, please include:

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested fix (if any)
- Your contact information

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity
  - Critical: Within 7 days
  - High: Within 14 days
  - Medium: Within 30 days
  - Low: Within 90 days

## Security Best Practices

### For Users

1. **API Keys & Secrets**
   - Never commit API keys, tokens, or secrets to the repository
   - Use GitHub Secrets for storing sensitive information
   - Rotate API keys regularly

2. **Dependencies**
   - Keep dependencies up to date
   - Review Dependabot alerts promptly
   - Run `npm audit` regularly

3. **Code Review**
   - Review AI-generated code suggestions carefully
   - Don't blindly accept all recommendations
   - Validate security-sensitive changes manually

### For Contributors

1. **Secure Coding**
   - Follow OWASP security guidelines
   - Sanitize user inputs
   - Validate all external data
   - Use parameterized queries
   - Implement proper error handling

2. **Dependencies**
   - Only add necessary dependencies
   - Verify package integrity
   - Check for known vulnerabilities before adding

3. **Testing**
   - Write security-focused tests
   - Test authentication and authorization
   - Validate input validation

## Known Security Considerations

### AI Provider API Keys

This action requires API keys for AI providers (OpenAI, Anthropic, self-hosted). These must be:
- Stored as GitHub Secrets (never hardcoded)
- Never logged or exposed in outputs or error messages
- Restricted to minimum required permissions
- Rotated regularly for production use
- Unique per environment (dev, staging, prod)

**Supported Provider Keys:**
- `CHATGPT_API_KEY` or `OPENAI_API_KEY` - For OpenAI/ChatGPT
- `CLAUDE_API_KEY` or `ANTHROPIC_API_KEY` - For Anthropic Claude
- `SELF_HOSTED_API_KEY`, `OPENWEBUI_API_KEY`, or `SELF_HOSTED_TOKEN` - For self-hosted models

### Pull Request Access

The action requires `GITHUB_TOKEN` with minimal permissions:
- `pull-requests: write` - To post review comments and inline reviews
- `contents: read` - To read repository contents and changed files
- `issues: write` - (Optional) For slash command workflows

**Security Note:** The action never requests write access to repository code, only to PR comments.

### Third-Party Dependencies

We use comprehensive automated security scanning:
- **Dependabot** - Automated security updates for npm dependencies
- **npm audit** - Regular vulnerability scanning
- **GitHub Security Advisories** - CVE monitoring
- **CodeQL** - Static code analysis for security vulnerabilities
- **Trivy** - Container and dependency vulnerability scanning
- **Gitleaks** - Secret scanning to prevent credential leaks

Current dependency security status: ✅ No known vulnerabilities (verified v1.1.0)

### Self-Hosted Model Security

When using self-hosted or Open WebUI endpoints:
- **Network Security**: Ensure endpoint is accessible only from GitHub Actions IPs
- **TLS/SSL**: Always use HTTPS in production environments
- **Authentication**: Use strong API tokens with proper header configuration
- **Token Headers**: Default is `Authorization` (Bearer), customize if needed
- **Firewall**: Consider IP whitelisting for enhanced security
- **Private Networks**: Use VPN or Tailscale for on-premise deployments

## Security Features

### Built-in Security Measures

**v1.1.0 includes:**
- ✅ **78%+ test coverage** - Comprehensive unit and integration tests
- ✅ **Input validation** - All user inputs are sanitized and validated
- ✅ **Error handling** - Secure error messages without sensitive data exposure
- ✅ **JSON parsing** - Safe JSON parsing with try-catch blocks
- ✅ **Diff validation** - Comments validated against actual diff content
- ✅ **File filtering** - Glob pattern support via `.github/review-ignorelist.txt`
- ✅ **Token limits** - Configurable limits prevent excessive API usage
- ✅ **Minimal permissions** - No unnecessary access requested
- ✅ **No data storage** - Action doesn't persist any PR data

### CI/CD Security Workflows

Active security workflows in this repository:
1. **CodeQL Analysis** (`.github/workflows/codeql.yml`)
   - JavaScript/TypeScript scanning
   - Runs on push and PR
   - Detects security vulnerabilities and code quality issues

2. **Security Scan** (`.github/workflows/security-scan.yml`)
   - Trivy vulnerability scanning
   - Gitleaks secret scanning
   - Runs daily and on pull requests

3. **Dependency Review** (`.github/workflows/dependency-review.yml`)
   - Reviews new dependencies in PRs
   - Identifies known vulnerabilities
   - Checks license compatibility

4. **Test Suite** (`.github/workflows/test.yml`)
   - 168 tests covering all modules
   - Runs on every push and PR
   - Validates security-critical code paths

## Security Updates

Security updates will be:
1. Released as soon as possible (critical: within 24-48 hours)
2. Documented in CHANGELOG.md with security badges
3. Announced in GitHub Security Advisories
4. Tagged with semantic versioning
5. Backported to supported versions when applicable

## Security Disclosure Process

1. **Report received** → Acknowledgment within 48 hours
2. **Validation** → Reproduce and verify the vulnerability
3. **Assessment** → Determine severity and impact
4. **Fix development** → Create patch and tests
5. **Security advisory** → Draft advisory (not published yet)
6. **Release** → Deploy fix to supported versions
7. **Publication** → Publish advisory and notify users

## Acknowledgments

We appreciate security researchers and users who report vulnerabilities responsibly. Contributors will be acknowledged in our security advisories (unless they prefer to remain anonymous).

**Security Hall of Fame:** Contributors who report valid security issues will be listed here.

## Contact

For general security questions or concerns:
- 💬 [GitHub Discussions](https://github.com/ashsaym/ai-code-reviewer/discussions)
- 📧 Private security disclosure through GitHub Security Advisories (preferred)

## Additional Resources

- [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
- [GitHub Actions Security Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [npm Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)

---

**Last Updated**: November 17, 2025  
**Current Version**: v1.1.0  
**Security Status**: ✅ No known vulnerabilities
