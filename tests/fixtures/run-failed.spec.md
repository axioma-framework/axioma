---
status: failed
feature: "failed-feature"
context_bounds:
  - "src/greeting.ts"
---

## Intent
Run service should stop on failed specs.

## Contract
- [ ] **AC-01:** Given a failed feature, when the pipeline resumes, then it stops explicitly.

## Ledger
| Agent | Status | Timestamp | Notes |
|---|---|---|---|
| The Archivist | DONE | 2026-04-04 | Context discovered. |
| The Blueprint | DONE | 2026-04-04 | Spec drafted. |
| The Censor | DONE | 2026-04-04 | PASS |
| The Justice | DONE | 2026-04-04 | Red Step confirmed. |
| The Mason | FAILED | 2026-04-04 | Failed after retries. |
