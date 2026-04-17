# Deployment and Operations

## Current environment
- Local/dev uses SQLite with Prisma.
- Application runtime is Next.js 14 App Router.

## Production readiness path
1. Move Prisma datasource to PostgreSQL for production.
2. Convert status strings to Prisma enums when moving to Postgres.
3. Add migration-based release discipline (`prisma migrate deploy`).
4. Introduce external cache/rate-limit backend for horizontally scaled deployments.

## Operational guardrails
- Enforce strong `JWT_SECRET` and rotate on schedule.
- Set `SESSION_DURATION_HOURS` explicitly per environment.
- Capture centralized request logs with request IDs.
- Alert on repeated `auth.login.failure` and transition conflict spikes.

## Recommended release checks
- `npm run lint`
- `npm run build`
- `npm run test` (added in this hardening pass)
- `prisma migrate status`

## Rollback
- Keep DB migrations backward-safe.
- Use blue/green or canary deploys for auth and workflow changes.
