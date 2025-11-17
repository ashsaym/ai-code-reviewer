# Repository Rulesets

## Security
- Never commit plaintext secrets or tokens; require `process.env` usage.
- Ensure external HTTP calls validate TLS certificates and timeouts.

## Performance
- Flag synchronous or blocking work inside GitHub Action entry points.
- Warn when prompts exceed budgeted diff sizes or chunking rules.

## Compliance
- Document any new environment variables in the README before approving.
- All workflows must set explicit permissions for `GITHUB_TOKEN`.
