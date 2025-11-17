# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
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

This action requires API keys for AI providers (OpenAI, Anthropic, etc.). These must be:
- Stored as GitHub Secrets
- Never logged or exposed in outputs
- Restricted to minimum required permissions

### Pull Request Access

The action requires `GITHUB_TOKEN` with:
- `pull-requests: write` - To post review comments
- `contents: read` - To read repository contents

### Third-Party Dependencies

We use automated dependency scanning through:
- Dependabot security updates
- npm audit
- GitHub Security Advisories

## Security Updates

Security updates will be:
1. Released as soon as possible
2. Documented in CHANGELOG.md
3. Announced in GitHub Security Advisories
4. Tagged with semantic versioning

## Acknowledgments

We appreciate security researchers and users who report vulnerabilities responsibly. Contributors will be acknowledged in our security advisories (unless they prefer to remain anonymous).

## Contact

For general security questions or concerns, please open a discussion in the repository.

---

**Last Updated**: November 17, 2025
