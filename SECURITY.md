# Security Policy

## Overview

Security is a top priority for AI Code Reviewer. This document outlines our security practices, how to report vulnerabilities, and what to expect when using this action.

## Supported Versions

We actively maintain and provide security updates for the following versions:

| Version | Supported | Status |
| ------- | --------- | ------ |
| 1.1.x   | ✅ Yes | Current stable release |
| 1.0.x   | ✅ Yes | Maintenance mode |
| < 1.0   | ❌ No  | End of life |

**Recommendation:** Always use the latest stable version (`@v1.1.0` or `@main`) for the most up-to-date security fixes.

## Reporting a Vulnerability

We take security vulnerabilities seriously and appreciate responsible disclosure.

### 🔒 Private Reporting (Preferred)

**⚠️ DO NOT report security vulnerabilities through public GitHub issues.**

Instead, use one of these private channels:

#### Method 1: GitHub Security Advisories (Recommended)

1. Go to [Security Advisories](https://github.com/ashsaym/ai-code-reviewer/security/advisories)
2. Click **"Report a vulnerability"**
3. Fill out the vulnerability report form
4. Submit securely

This method ensures:
- Private communication with maintainers
- Secure collaboration on fixes
- Coordinated public disclosure
- CVE assignment if applicable

#### Method 2: Direct Contact

If you cannot use GitHub Security Advisories:
1. Contact the maintainers through GitHub
2. Use subject line: **"SECURITY: [Brief Description]"**
3. Wait for a secure communication channel to be established
4. Share full details privately

### What to Include in Your Report

Help us understand and address the issue quickly by including:

**Required Information:**
- **Vulnerability Type**: What kind of security issue is it?
- **Component Affected**: Which part of the action is affected?
- **Attack Scenario**: How could an attacker exploit this?
- **Impact**: What's the potential damage?
- **Reproduction Steps**: How can we reproduce it?

**Optional but Helpful:**
- Proof of concept code
- Suggested fix or mitigation
- Related vulnerabilities (if any)
- References (CVEs, security papers, etc.)

**Example Report Template:**

```markdown
## Summary
Brief one-line summary of the vulnerability

## Vulnerability Type
[ ] Injection (SQL, Command, etc.)
[ ] Authentication/Authorization bypass
[ ] Information disclosure
[ ] Code execution
[ ] Denial of service
[ ] Other: ___________

## Affected Component
- Version: v1.1.0
- File/Module: src/providers/chatgpt.js
- Function: makeApiCall()

## Description
Detailed description of the vulnerability including:
- What the vulnerable code does
- Why it's exploitable
- What makes it a security issue

## Attack Scenario
Step-by-step description of how an attacker could exploit this:
1. Attacker does X
2. This causes Y to happen
3. Resulting in Z

## Impact
- **Confidentiality**: High/Medium/Low
- **Integrity**: High/Medium/Low
- **Availability**: High/Medium/Low
- **Scope**: What systems/data are at risk?

## Reproduction Steps
1. Configure workflow with...
2. Create a PR with...
3. Observe that...

## Proof of Concept
```yaml
# Malicious workflow configuration that demonstrates the issue
```

## Suggested Fix
If you have ideas for how to fix it (optional)

## References
Links to similar vulnerabilities, standards, or documentation
```

### Response Timeline

We commit to the following response times:

| Stage | Timeline | Description |
|-------|----------|-------------|
| **Initial Response** | 48 hours | Acknowledgment of receipt |
| **Triage** | 5 business days | Severity assessment |
| **Status Update** | 7 business days | Fix timeline communicated |
| **Resolution** | Varies by severity | Patch released |

**Fix Timelines by Severity:**

| Severity | Target Timeline | Examples |
|----------|----------------|----------|
| **Critical** | 1-7 days | RCE, secret leakage, authentication bypass |
| **High** | 7-14 days | Injection vulnerabilities, XSS, privilege escalation |
| **Medium** | 14-30 days | Information disclosure, CSRF |
| **Low** | 30-90 days | Minor information leaks, edge cases |

### Disclosure Policy

We follow **coordinated disclosure**:

1. **Private Development**: We develop and test the fix privately
2. **Advance Notice**: We notify you before public disclosure
3. **Public Release**: We release the fix and security advisory
4. **Credit**: We credit you in the advisory (unless you prefer anonymity)

**Timeline:**
- Security fix released as soon as ready
- Public advisory within 30 days of fix (unless extraordinary circumstances)
- We'll work with you on disclosure timing

## Security Best Practices

### For Action Users

**Protecting Your API Keys:**

```yaml
# ✅ GOOD - Use GitHub Secrets
env:
  CHATGPT_API_KEY: ${{ secrets.CHATGPT_API_KEY }}

# ❌ BAD - Never hardcode secrets
env:
  CHATGPT_API_KEY: sk-proj-abc123...
```

**Best Practices:**
- ✅ Store all API keys in GitHub Secrets
- ✅ Use repository-level secrets for better isolation
- ✅ Rotate API keys regularly (every 90 days)
- ✅ Use separate keys for different environments
- ✅ Revoke keys immediately if compromised
- ❌ Never commit secrets to version control
- ❌ Never log or print secret values
- ❌ Never share secrets in issues or PRs

**Workflow Security:**

```yaml
# ✅ GOOD - Minimal permissions
permissions:
  contents: read
  pull-requests: write

# ❌ BAD - Excessive permissions
permissions: write-all
```

**Recommendations:**
- Use minimal required permissions
- Pin action versions: `@v1.1.0` instead of `@main`
- Review AI suggestions before applying
- Enable branch protection rules
- Require review for sensitive PRs

**Dependency Management:**

```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Review Dependabot alerts
```

- ✅ Enable Dependabot alerts
- ✅ Review and apply security updates promptly
- ✅ Keep action version up-to-date
- ✅ Monitor security advisories

### For Contributors

**Secure Coding Practices:**

1. **Input Validation**
   ```javascript
   // ✅ GOOD - Validate inputs
   function processInput(userInput) {
     if (!userInput || typeof userInput !== 'string') {
       throw new Error('Invalid input');
     }
     // Process safely...
   }

   // ❌ BAD - No validation
   function processInput(userInput) {
     return eval(userInput); // Never do this!
   }
   ```

2. **Secret Handling**
   ```javascript
   // ✅ GOOD - Never log secrets
   console.log('Making API call...');

   // ❌ BAD - Logs secret
   console.log(`API Key: ${apiKey}`);
   ```

3. **Error Messages**
   ```javascript
   // ✅ GOOD - Generic error
   throw new Error('Authentication failed');

   // ❌ BAD - Leaks information
   throw new Error(`Invalid API key: ${apiKey}`);
   ```

**Security Checklist for PRs:**

- [ ] No secrets in code or logs
- [ ] Input validation for external data
- [ ] Proper error handling
- [ ] No use of `eval()` or similar dangerous functions
- [ ] Dependencies checked for vulnerabilities
- [ ] Tests include security scenarios
- [ ] Documentation updated for security features

## Security Architecture

### Threat Model

**Assets Protected:**
- API keys for AI providers (ChatGPT, Claude, self-hosted)
- Repository source code
- Pull request data
- GitHub tokens

**Potential Threats:**
- Secret exposure through logs or outputs
- Unauthorized code execution
- Data exfiltration to AI providers
- Man-in-the-middle attacks
- Supply chain attacks

**Mitigations:**
- Secrets never logged or output
- Minimal permissions model
- HTTPS for all API calls
- Dependency scanning
- Code review and testing

### Data Handling

**What Data is Sent to AI Providers:**
- PR title and description
- File diffs (code changes)
- File names and paths
- Commit messages
- Repository guidance files

**What Data is NOT Sent:**
- GitHub tokens
- API keys
- Full repository contents (only diffs)
- Previous PR history
- User personal information

**Data Privacy:**
- Data is only sent to configured AI provider
- No data is stored by this action
- Data handling follows provider's privacy policy
- Use self-hosted models for sensitive code

### Required Permissions

**Minimal GitHub Token Permissions:**

```yaml
permissions:
  contents: read        # Read repository files and PR diffs
  pull-requests: write  # Post review comments and summaries
```

**NOT Required:**
- `contents: write` - Never writes to repository
- `issues: write` - Only needed for slash commands
- `actions: write` - Not used
- `packages: write` - Not used

**AI Provider Permissions:**
- API key with minimal scope
- Read-only access if provider supports it
- Separate keys for different projects recommended

### Third-Party Dependencies

**Dependency Security:**
- All dependencies scanned regularly
- Automated updates via Dependabot
- No dependencies with known critical vulnerabilities
- Regular audits with `npm audit`

**Supply Chain Protection:**
- Lock files committed (`package-lock.json`)
- Integrity hashes verified
- Only well-maintained packages used
- Minimal dependency tree

## Security Scanning & Monitoring

We use multiple automated security tools:

### CodeQL Analysis
- **Purpose**: Detects security vulnerabilities and code quality issues
- **Frequency**: Every push and pull request
- **Languages**: JavaScript, GitHub Actions YAML
- **View Results**: [Security → Code Scanning](https://github.com/ashsaym/ai-code-reviewer/security/code-scanning)

### Trivy Vulnerability Scanner
- **Purpose**: Scans dependencies for known vulnerabilities
- **Frequency**: Daily and on pull requests
- **Coverage**: npm packages, container images, configurations
- **View Results**: Security tab

### Gitleaks Secret Scanner
- **Purpose**: Prevents secret leakage in commits
- **Frequency**: Every commit
- **Detects**: API keys, passwords, tokens, private keys
- **Action**: Blocks commits containing secrets

### Dependabot
- **Purpose**: Automated dependency updates
- **Frequency**: Weekly scans
- **Action**: Creates PRs for security updates
- **Priority**: Critical and high severity first

### npm audit
- **Purpose**: Checks for vulnerable packages
- **Frequency**: Every build and release
- **Integration**: CI/CD pipeline
- **Threshold**: Fails on high severity

## Security Updates

**Our Commitment:**

1. **Rapid Response**: Security fixes prioritized above features
2. **Clear Communication**: Advisories published for all security updates
3. **Backward Compatibility**: Security fixes avoid breaking changes when possible
4. **Version Support**: Security patches backported to supported versions

**Update Process:**

1. Vulnerability reported or discovered
2. Fix developed and tested privately
3. Security advisory drafted
4. Patch released with new version
5. Advisory published
6. Users notified via GitHub notifications

**Notification Channels:**
- GitHub Security Advisories
- Release notes
- CHANGELOG.md
- Repository discussions (for major issues)

**Semantic Versioning:**
- Patch version (1.1.1): Security fixes
- Minor version (1.2.0): New features + security fixes
- Major version (2.0.0): Breaking changes + security fixes

## Compliance & Standards

**Security Standards:**
- OWASP Top 10 awareness
- CWE (Common Weakness Enumeration) consideration
- Secure coding practices (input validation, least privilege)
- Regular security training for maintainers

**GitHub Actions Security:**
- Minimal permission model
- Pin action versions
- No secrets in logs
- Secure workflow practices

## Known Security Considerations

### API Key Management
- **Risk**: API keys could be exposed if not properly secured
- **Mitigation**: Never logged, always use GitHub Secrets, rotation recommended
- **User Responsibility**: Properly configure secrets, monitor usage

### AI Provider Security
- **Risk**: Code sent to external AI providers
- **Mitigation**: Users control what providers to use, self-hosted option available
- **User Responsibility**: Review AI provider's privacy policy, use self-hosted for sensitive code

### Supply Chain
- **Risk**: Compromised dependencies could affect action
- **Mitigation**: Regular scanning, minimal dependencies, lock files
- **Monitoring**: Automated alerts for all dependency vulnerabilities

## Responsible Disclosure Recognition

We value security researchers and responsible disclosure.

**Recognition:**
- Public acknowledgment in security advisories
- Listed in SECURITY_HALL_OF_FAME.md (if exists)
- Special thanks in release notes
- Option to remain anonymous

**What We Don't Offer:**
- Bug bounties (we're an open-source project)
- Financial rewards
- Physical goods

**What We Do Offer:**
- Fast response and communication
- Collaboration on fixes
- Public credit (if desired)
- Gratitude for making the project safer

## Security Resources

**For Users:**
- [GitHub Security Best Practices](https://docs.github.com/en/actions/security-guides)
- [Action Security Hardening](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [Secrets Management](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

**For Contributors:**
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## Contact

**Security Issues:** Use private reporting methods above

**Security Questions:** Open a [Discussion](https://github.com/ashsaym/ai-code-reviewer/discussions)

**General Issues:** Use [Issues](https://github.com/ashsaym/ai-code-reviewer/issues)

---

**Last Updated**: January 17, 2025

**Security Policy Version**: 1.1.0
