# Platform Hardening Plan

## Current architecture (as implemented)
- Next.js App Router with API route handlers under `src/app/api/**/route.ts`.
- Shared auth and permission helpers in `src/lib/auth.ts` with middleware enforcement in `src/middleware.ts`.
- Validation using Zod in `src/lib/validations.ts`.
- Business logic partly in services (`src/services/*.service.ts`) and partly directly in route handlers.
- Prisma with SQLite datasource in `prisma/schema.prisma`.

## Key weaknesses found during inspection
1. **Auth/session risks**: permissive default JWT secret fallback, weak claim validation, no issuer/audience checks.
2. **Authorization inconsistency**: duplicated per-route checks (`canAccessBank`, ad-hoc role checks), mixed permission strings.
3. **State/workflow fragility**: status transitions were not guarded by explicit transition rules.
4. **Route handlers too heavy**: update/delete routes still contained business rules and status logic.
5. **Upload safety gaps**: no hard file size/type guard in upload endpoint.
6. **Error model inconsistency**: mixed response shapes (`{error}` vs `{success,data}`), no domain error taxonomy.
7. **Operational controls missing**: no login throttling and limited security headers.

## Risks and impact
- Horizontal privilege escalation risk for weakly guarded institution-scoped actions.
- Invalid lifecycle transitions producing non-auditable or contradictory state histories.
- Brute-force login exposure.
- Hard-to-debug API behavior due to inconsistent response and error shape.

## Refactor strategy
1. Introduce core security primitives first (typed session, permissions, policies, errors, rate limiting).
2. Move state transition logic into explicit domain workflow guards.
3. Standardize API envelope and centralized error mapping.
4. Harden upload entry points and add security headers.
5. Document architecture/security/workflows/deployment/testing for phased continuation.

## Migration order
1. Phase 1: repository inspection + architecture and risk documentation ✅
2. Phase 2: auth/authorization hardening (session claims, centralized permissions/policies, login throttling) ✅
3. Phase 3: workflow transition guards + audit enrichment ✅
4. Phase 4: Prisma schema + PostgreSQL migration path ⏳
5. Phase 5: route standardization completion + domain repositories ⏳
6. Phase 6: uploads/jobs + notifications/comments/attachments/assignments ⏳
7. Phase 7: dashboard/report performance optimization ⏳
8. Phase 8: expanded automated testing + CI scripts + release runbooks ⏳

## Specific findings inventory
- **Duplicated permission logic**: route handlers in approvals/reports/submissions duplicate role+bank checks.
- **Heavy handlers**: `approvals/[id]`, `exceptions/[id]`, and report generation endpoint include business rules.
- **Missing audit coverage**: many read-sensitive actions and failed auth events were not consistently logged.
- **Weak validation points**: upload endpoint accepted file with minimal boundary validation.
- **Unsafe upload path likelihood**: CSV parsing path relied on content parsing but not strict file envelope controls.
- **Missing indexes likely for scale**: no indexes on many composite operational filters (`status+bankId+date` patterns).
- **Likely N+1/query inflation**: dashboard/report endpoints fetch broad includes and some per-item loops in services.
- **Status normalization needed**: workflow state strings are mixed legacy and process states.
