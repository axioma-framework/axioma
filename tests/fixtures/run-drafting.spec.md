---
status: drafting
feature: "greeting"
context_bounds:
  - "src/greeting.ts"
invariants:
  - "Keep the spec narrow."
---

## Intent
Run service should orchestrate from drafting to done.

## Contract
- [ ] **AC-01:** Given the greeting flow is triggered, when the implementation is executed, then the expected behavior is produced in a measurable way.
- [ ] **AC-02:** Given invalid input for greeting, when the implementation is executed, then the system responds with an explicit failure condition.

## Fixtures (Optional)
> No fixtures defined yet.

## Ledger
| Agent | Status | Timestamp | Notes |
|---|---|---|---|
| The Archivist | DONE | 2026-04-04 | Context discovered. |
| The Blueprint | DONE | 2026-04-04 | Spec drafted. |
| The Censor | PENDING | - | Awaiting audit. |
| The Justice | - | - | - |
| The Mason | - | - | - |
