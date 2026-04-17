# Architecture Overview

## Runtime layers
- **Transport layer**: Next.js Route Handlers under `src/app/api/**`.
- **Application/domain layer**: service modules in `src/services/**` plus new policy/workflow guards in `src/lib`.
- **Infrastructure layer**: Prisma client and schema in `src/lib/prisma.ts` + `prisma/schema.prisma`.

## Hardening additions
- Centralized role/permission constants and evaluator in `src/lib/permissions.ts`.
- Reusable institution/action policies in `src/lib/policies.ts`.
- Domain error taxonomy in `src/lib/errors.ts`.
- Workflow transition guards in `src/lib/workflows.ts`.
- API envelope/error mapping in `src/lib/api-utils.ts`.
- Login rate limiting in `src/lib/rate-limit.ts`.

## Design direction
- Keep Route Handlers thin and move remaining decision logic into module services.
- Introduce module boundaries incrementally:
  - `src/modules/auth`
  - `src/modules/approvals`
  - `src/modules/exceptions`
  - `src/modules/submissions`
- Each module should include `domain`, `application`, `infrastructure`, and `validations` packages over time.
