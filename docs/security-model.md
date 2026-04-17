# Security Model

## Authentication
- JWTs are signed and verified with `jose`.
- Claims now include issuer/audience validation and typed session payload.
- Session cookie is `HttpOnly`, `Secure` (production), `SameSite=Lax`.

## Authorization
- Action-based permission matrix in `src/lib/permissions.ts`.
- Resource-scoped policy helpers in `src/lib/policies.ts` enforce institution-level checks.
- API handlers enforce server-side auth regardless of UI state.

## Abuse protection
- Login API now uses per-IP in-memory rate limiting (windowed attempt cap).
- Failed and successful login events are recorded to audit logs.

## Workflow integrity
- Approval and exception status transitions are validated through explicit legal transition maps.
- Invalid transitions are rejected as domain conflicts.

## HTTP hardening
- Middleware applies baseline security headers:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: same-origin`
  - `Permissions-Policy`

## Remaining work
- Add CSRF token strategy for state-changing cookie-auth endpoints.
- Add persistent distributed rate limiting store (Redis/Postgres) for multi-instance deployments.
- Add session invalidation/token version checks persisted on user/session models.
