---
status: drafting
feature: "compound-assertion"
context_bounds:
  - "src/auth/login.ts"
---

## Intent
Audit should veto compound assertions.

## Contract
- [ ] **AC-01:** Given a login request, when it executes, then src/auth/login.ts returns a token and writes an audit record.

## Ledger
| Agent | Status | Timestamp | Notes |
|---|---|---|---|
| The Archivist | DONE | 2026-04-04 | Context discovered. |
| The Blueprint | DONE | 2026-04-04 | Spec drafted. |
| The Censor | PENDING | - | Awaiting audit. |
| The Justice | - | - | - |
| The Mason | - | - | - |
