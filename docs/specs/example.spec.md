---
status: done
feature: "add-greeting"
author: "The Blueprint"
created: "2025-01-15"

context_bounds:
  - "src/greeting.ts"

invariants:
  - "The greet() function MUST return a string."
  - "If the name argument is an empty string, greet() MUST throw a ValueError."
  - "The returned string MUST start with 'Hello, ' followed by the provided name."
---

## Intent
Create a simple `greet(name)` function that returns a personalized greeting string. This spec exists as a **reference example** to demonstrate the full Axioma pipeline from Archivist → Blueprint → Censor → Justice → Mason.

## Contract (Acceptance Criteria)

- [x] **AC-01:** Given a valid name `"Alice"`, when `greet("Alice")` is called, then it returns exactly `"Hello, Alice"`.
- [x] **AC-02:** Given an empty string `""`, when `greet("")` is called, then it throws a `ValueError` with message `"Name cannot be empty"`.
- [x] **AC-03:** Given a name with leading/trailing whitespace `" Bob "`, when `greet(" Bob ")` is called, then it returns `"Hello, Bob"` (trimmed).

## Fixtures
> No external fixtures required for this spec.

## Ledger

| Agent         | Status | Timestamp  | Notes                                           |
|---------------|--------|------------|-------------------------------------------------|
| The Archivist | DONE   | 2025-01-15 | Context Map: no existing greeting modules found. |
| The Blueprint | DONE   | 2025-01-15 | Spec drafted with 3 ACs and 3 invariants.        |
| The Censor    | DONE   | 2025-01-15 | PASS — No subjective language, 1 domain only.    |
| The Justice   | DONE   | 2025-01-15 | 3 tests generated. All failed (Red Step ✅).      |
| The Mason     | DONE   | 2025-01-15 | All 3 tests passing (Green Step ✅). Attempt 1.   |
