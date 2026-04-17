# Security Review Checklist

- [x] JWT verify path validates signature, issuer, and audience.
- [x] Auth cookie configured with HttpOnly/Secure/SameSite.
- [x] Server-side authorization checks are centralized and reusable.
- [x] Institution-scoped access checks are enforced by policy helpers.
- [x] Login endpoint has brute-force mitigation (rate limiting).
- [x] Sensitive auth events are auditable (`success` + `failure`).
- [x] Status transitions reject illegal state changes.
- [x] API error responses avoid stack/secret leakage.
- [x] Middleware applies baseline security headers.
- [ ] CSRF anti-forgery token workflow for state-changing endpoints.
- [ ] Distributed rate limiter for multi-instance deployment.
- [ ] Session invalidation/token version persistence checks.
