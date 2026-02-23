# Axioma Manifest Template

> **Usage:** Copy this template to `/docs/specs/[feature-name].spec.md` when
> creating a new specification. Replace all `[placeholders]` with concrete values.
> This template defines the contract that all Axioma agents must respect.

---

```yaml
---
status: drafting                 # drafting | auditing | approved | implementing | done | failed
feature: "[feature-name]"
author: "The Blueprint"
created: "[YYYY-MM-DD]"

# Only files listed here may be touched by The Mason.
# Any file NOT in this list is off-limits.
context_bounds:
  - "src/[path/to/file-1.ts]"
  - "src/[path/to/file-2.ts]"

# Logical rules that, if broken, render the implementation INVALID.
# Must be measurable, boolean, and unambiguous.
invariants:
  - "[Invariant 1: e.g., The function MUST return within 200ms for inputs ≤ 1000 items.]"
  - "[Invariant 2: e.g., If input is null, the function MUST throw TypeError.]"
---
```

## Intent
[One paragraph: What is being built and WHY. Be specific — no subjective words.]

## Contract (Acceptance Criteria)
> Each AC item will be converted into an automated test by **The Justice**.
> Use **Given / When / Then** format. Every criterion must be independently testable.

- [ ] **AC-01:** Given [precondition], when [action], then [measurable, boolean result].
- [ ] **AC-02:** Given [precondition], when [action], then [measurable, boolean result].
- [ ] **AC-03:** Given [precondition], when [action], then [measurable, boolean result].

## Fixtures (Optional)
> If this spec requires synthetic data, reference the fixture files here.
> Fixtures must be created in `/docs/fixtures/[feature-name].fixture.json`.

| Fixture File | Description |
|---|---|
| `[feature-name].fixture.json` | [Brief description of the data] |

## Ledger (State Machine)
> Tracks the progression of the spec through the Axioma pipeline.
> Each agent updates their row upon completing their phase.

| Agent         | Status  | Timestamp  | Notes                 |
|---------------|---------|------------|-----------------------|
| The Archivist | DONE    | [date]     | Context Map delivered. |
| The Blueprint | DONE    | [date]     | Spec drafted.         |
| The Censor    | PENDING | -          | -                     |
| The Justice   | -       | -          | -                     |
| The Mason     | -       | -          | -                     |

---
> ⚠️ **Ledger Rules:**
> - Only the responsible agent may update its own row.
> - Valid statuses: `PENDING`, `DONE`, `VETOED`, `FAILED`.
> - If The Censor sets `VETOED`, the spec returns to The Blueprint and status resets to `drafting`.
> - If The Mason sets `FAILED`, a `git rollback` must be executed and the failure documented.
