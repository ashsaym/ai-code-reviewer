# Review Rulesets

## Security
- Reject code that stores secrets, tokens, or passwords in source files.
- Require input validation for any handler that accepts user-controlled data.

## Performance
- Flag synchronous network calls inside request/response paths.
- Warn if new dependencies add more than 200ms cold-start latency.

## Compliance
- Ensure new telemetry events document data retention period and opt-out mechanics.
