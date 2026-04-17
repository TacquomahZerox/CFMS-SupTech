# Workflow State Machine

## Approval workflow (enforced)
Legacy and new process states are bridged while migrating:
- Legacy: `PENDING -> ACTIVE -> EXHAUSTED|EXPIRED|REVOKED`
- Process extension: `PENDING_REVIEW -> ASSIGNED -> REVIEWED -> APPROVED|REJECTED|ESCALATED`

Invalid transitions throw `IllegalStateTransitionError`.

## Exception workflow (enforced)
- Legacy: `OPEN -> UNDER_REVIEW -> RESOLVED|WAIVED`
- Process extension: `OPEN -> TRIAGED -> ASSIGNED -> INVESTIGATING -> RESOLVED|DISMISSED -> REOPENED`

Invalid transitions are blocked in service/route update paths.

## Submission workflow (defined scaffold)
Defined for next phases:
`DRAFT -> SUBMITTED -> UNDER_REVIEW -> REQUIRES_CHANGES -> RESUBMITTED -> APPROVED|REJECTED -> ARCHIVED`

## Audit requirement
Every status transition should produce an append-only audit event including:
- actor
- entity
- previous state
- next state
- timestamp
- optional reason/comment
