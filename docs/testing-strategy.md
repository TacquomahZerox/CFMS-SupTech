# Testing Strategy

## Framework
- Node.js built-in test runner (`node --test`) with `tsx` import support for TypeScript tests.
- Focus on domain logic and security-critical flows first.

## Priority test suites
1. Auth session claim validation and permission checks.
2. Workflow transition guards (approval/exception).
3. Policy functions for institution access and action checks.
4. API handlers for login throttling and validation errors.

## Expansion roadmap
- Repository tests with isolated Prisma test DB.
- Route handler integration tests with mocked Next requests.
- End-to-end happy paths for login -> submit -> review -> resolve.

## CI behavior
- Run lint + tests on pull requests.
- Fail fast on security and authorization test failures.
