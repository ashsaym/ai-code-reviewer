# Repository Code Review Rulesets

These are **mandatory rules** that must be enforced during code review. Violations of these rules should block PR approval.

---

## Security Rules 🔒

### Rule S1: No Hardcoded Secrets
**Status**: 🔴 **BLOCKING**

**Description**: Never commit secrets, API keys, passwords, tokens, or credentials in source code.

**Requirements**:
- All secrets must be stored in environment variables or secure vaults
- Use `process.env.SECRET_NAME` or equivalent for all credentials
- Never log or print secret values
- Use secret scanning tools (e.g., Gitleaks) in CI/CD

**Examples**:
```javascript
// ❌ VIOLATION - Hardcoded API key
const apiKey = "sk-proj-abc123def456...";

// ✅ COMPLIANT - Environment variable
const apiKey = process.env.OPENAI_API_KEY;
```

### Rule S2: Input Validation Required
**Status**: 🔴 **BLOCKING**

**Description**: All functions that accept external input (user data, API requests, file uploads) must validate inputs before processing.

**Requirements**:
- Validate data types, formats, and ranges
- Sanitize inputs to prevent injection attacks
- Reject invalid inputs with clear error messages
- Never trust client-side validation alone

**Examples**:
```javascript
// ❌ VIOLATION - No validation
function createUser(email, age) {
  return db.insert({ email, age });
}

// ✅ COMPLIANT - Proper validation
function createUser(email, age) {
  if (!isValidEmail(email)) {
    throw new ValidationError('Invalid email format');
  }
  if (!Number.isInteger(age) || age < 0 || age > 150) {
    throw new ValidationError('Age must be between 0 and 150');
  }
  return db.insert({ email, age });
}
```

### Rule S3: Secure External Communications
**Status**: 🔴 **BLOCKING**

**Description**: All external HTTP/HTTPS calls must use TLS, validate certificates, and implement timeouts.

**Requirements**:
- Use HTTPS for all external communications
- Validate TLS certificates (don't disable verification)
- Set reasonable timeouts (5-30 seconds typical)
- Handle network errors gracefully
- Never expose internal errors to external callers

**Examples**:
```javascript
// ❌ VIOLATION - No timeout, certificate validation disabled
const response = await fetch(url, {
  agent: new https.Agent({ rejectUnauthorized: false })
});

// ✅ COMPLIANT - Secure with timeout
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);
const response = await fetch(url, {
  signal: controller.signal,
  // TLS validation enabled by default
});
clearTimeout(timeout);
```

### Rule S4: Authentication & Authorization
**Status**: 🔴 **BLOCKING**

**Description**: All protected resources must verify both authentication (who you are) and authorization (what you can do).

**Requirements**:
- Verify user authentication before accessing protected resources
- Check authorization for every sensitive operation
- Use principle of least privilege
- Never rely solely on client-side checks
- Implement proper session management

---

## Performance Rules ⚡

### Rule P1: No Blocking Operations in Request Path
**Status**: 🟠 **WARNING**

**Description**: Synchronous or blocking operations must not be used in HTTP request/response handlers or event loops.

**Requirements**:
- Use async/await for I/O operations
- Never use sync filesystem operations in request handlers
- Avoid blocking CPU-intensive tasks
- Offload heavy processing to background jobs

**Examples**:
```javascript
// ❌ VIOLATION - Blocking I/O
app.get('/users', (req, res) => {
  const data = fs.readFileSync('users.json');  // Blocks event loop!
  res.json(JSON.parse(data));
});

// ✅ COMPLIANT - Async I/O
app.get('/users', async (req, res) => {
  const data = await fs.promises.readFile('users.json');
  res.json(JSON.parse(data));
});
```

### Rule P2: Database Query Optimization
**Status**: 🟡 **ADVISORY**

**Description**: Avoid N+1 queries and ensure efficient database access patterns.

**Requirements**:
- Use eager loading to avoid N+1 queries
- Add database indexes for frequently queried columns
- Limit result sets with pagination
- Use connection pooling
- Cache frequently accessed data

**Examples**:
```javascript
// ❌ VIOLATION - N+1 query problem
const users = await User.findAll();
for (const user of users) {
  user.posts = await Post.findAll({ where: { userId: user.id } });  // N queries!
}

// ✅ COMPLIANT - Single query with join
const users = await User.findAll({
  include: [{ model: Post }]  // One query with join
});
```

### Rule P3: Resource Limits
**Status**: 🟠 **WARNING**

**Description**: Set limits on resource consumption to prevent DoS and memory exhaustion.

**Requirements**:
- Limit request body sizes
- Set maximum array/collection sizes
- Implement pagination for list endpoints
- Set timeouts on external calls
- Monitor memory usage for large operations

**Examples**:
```javascript
// ❌ VIOLATION - Unbounded array processing
const results = await processAllUsers();  // Could be millions!

// ✅ COMPLIANT - Paginated processing
const pageSize = 100;
for (let page = 0; ; page++) {
  const users = await User.findAll({ limit: pageSize, offset: page * pageSize });
  if (users.length === 0) break;
  await processUsers(users);
}
```

---

## Code Quality Rules 📋

### Rule Q1: Error Handling Required
**Status**: 🔴 **BLOCKING**

**Description**: All error conditions must be handled explicitly. No silent failures.

**Requirements**:
- Wrap risky operations in try-catch blocks
- Return meaningful error messages
- Log errors for debugging (without exposing secrets)
- Handle promise rejections
- Implement proper cleanup in finally blocks

**Examples**:
```javascript
// ❌ VIOLATION - Unhandled error
async function fetchUserData(userId) {
  const response = await fetch(`/api/users/${userId}`);  // What if this fails?
  return response.json();
}

// ✅ COMPLIANT - Proper error handling
async function fetchUserData(userId) {
  try {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error.message);
    throw new UserFetchError(`Unable to retrieve user data`, { cause: error });
  }
}
```

### Rule Q2: Test Coverage for New Code
**Status**: 🟠 **WARNING**

**Description**: All new functions and bug fixes must include corresponding tests.

**Requirements**:
- Unit tests for new functions
- Integration tests for new endpoints
- Regression tests for bug fixes
- Test both success and failure paths
- Aim for >80% coverage on new code

### Rule Q3: Documentation for Public APIs
**Status**: 🟡 **ADVISORY**

**Description**: Public functions, classes, and APIs must be documented.

**Requirements**:
- JSDoc comments for exported functions
- API documentation for HTTP endpoints
- README updates for new features
- Changelog entries for user-facing changes
- Migration guides for breaking changes

---

## Compliance Rules 📜

### Rule C1: Environment Configuration
**Status**: 🔴 **BLOCKING**

**Description**: All configurable values must use environment variables, not hardcoded values.

**Requirements**:
- Use environment variables for all deployment-specific config
- Document all required environment variables in README
- Provide sensible defaults where appropriate
- Validate environment variables at startup
- Never commit .env files with real values

**Examples**:
```javascript
// ❌ VIOLATION - Hardcoded configuration
const config = {
  databaseUrl: 'postgresql://localhost:5432/mydb',
  apiTimeout: 5000
};

// ✅ COMPLIANT - Environment-based configuration
const config = {
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/mydb',
  apiTimeout: parseInt(process.env.API_TIMEOUT) || 5000
};

// Validate at startup
if (!config.databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}
```

### Rule C2: Minimal Permissions
**Status**: 🟠 **WARNING**

**Description**: GitHub Actions workflows must use minimal required permissions.

**Requirements**:
- Explicitly declare permissions in workflow files
- Never use `permissions: write-all`
- Grant only the permissions actually needed
- Prefer read-only permissions when possible
- Document why each permission is needed

**Examples**:
```yaml
# ❌ VIOLATION - Excessive permissions
permissions: write-all

# ✅ COMPLIANT - Minimal permissions
permissions:
  contents: read         # Only what we need
  pull-requests: write
```

### Rule C3: Dependency Vetting
**Status**: 🟡 **ADVISORY**

**Description**: New dependencies must be justified and vetted for security.

**Requirements**:
- Justify why the dependency is needed
- Check for known vulnerabilities
- Prefer well-maintained, popular packages
- Consider bundle size impact
- Review license compatibility
- Check last update date and maintenance status

---

## Enforcement

**Blocking Rules** (🔴): Must be fixed before merge approval.
**Warning Rules** (🟠): Should be fixed, or explained why not.
**Advisory Rules** (🟡): Nice to have, use judgment.

Violations of blocking rules will result in PR review rejection with clear explanation of the issue and required fix.
