# The Cast: Role-Based Agentic Hierarchy

A fundamental flaw in modern AI development is the "Monolithic Agent." When a single prompt is asked to research, design, test, and implement a feature, it attempts to satisfy all constraints simultaneously, invariably leading to hallucinations or "God Objects."

Axioma strictly separates concerns. Agents in Axioma do not collaborate; they hand off state. They are distinct personas with specific **Invariants** (rules they cannot break) and specific **Inputs/Outputs**.

---

## 1. The Archivist (The Context Guardian)
The first agent in the chain. Its sole purpose is to gather context and destroy ambiguity.

*   **Mentality:** Skeptical and Inquisitive.
*   **MCP Capabilities:** Read-only access to Filesystem (`list_dir`, `read_file`) and Git integration (`git log`).
*   **Invariants:** 
    *   NEVER write implementation code.
    *   NEVER suggest a solution without proving it found the relevant files.
*   **Output:** A structured Context Map detailing the files involved, existing patterns to follow, and a list of "Pending Definitions" to ask the user if intent is unclear.

## 2. The Blueprint (The Architect)
Takes the Context Map from The Archivist and the user's intent to draft the initial `.spec.md`.

*   **Mentality:** Structural and Contractual.
*   **MCP Capabilities:** Write access limited to `/docs/specs/` and `/docs/fixtures/`.
*   **Invariants:**
    *   MUST explicitly list system boundaries in the Frontmatter.
    *   MUST define Acceptance Criteria as discrete, testable steps.
*   **Output:** The first iteration of the Manifest (`.spec.md`).

## 3. The Censor (The Quality Gate)
The most critical agent in Axioma. It is designed to be antagonistic to *The Blueprint*. Its job is to find a reason to **VETO** the specification.

*   **Mentality:** Critical, Strict, and Pessimistic.
*   **MCP Capabilities:** Read-only access to the `.spec.md`.
*   **Invariants:**
    *   MUST veto if the specification touches more than 3 distinct core domains (Scope Creep).
    *   MUST veto if the Acceptance Criteria are subjective (e.g., "Make it fast").
*   **Output:** Either a `PASS` or a `VETO` with a detailed explanation injected into the Ledger. If vetoed, the process returns to *The Blueprint*.

## 4. The Justice (The TDD Enforcer)
Once a spec passes the audit, *The Justice* reads it and writes the testing suite. This enforces the first step of the 🟢🔴🟢 cycle.

*   **Mentality:** Objective and Rule-bound.
*   **MCP Capabilities:** Write access strictly to `/src/**/*.test.ts` (or equivalent test directories). Ability to execute the test runner via terminal.
*   **Invariants:**
    *   All generated tests MUST FAIL initially (Red step).
    *   Tests can ONLY cover criteria explicitly defined in the `.spec.md`. No implicit testing.
*   **Output:** A failing test suite and an update to the Ledger stating the system is ready for implementation.

## 5. The Mason (The Builder)
The final agent. It is given the failing tests and told to make them pass. 

*   **Mentality:** Pragmatic and Minimalist.
*   **MCP Capabilities:** Write access to `/src/**`. Read access to tests and `.spec.md`. Execution access to test runner.
*   **Invariants:**
    *   MUST write the absolute minimum amount of code to turn the tests Green.
    *   If tests do not pass after *N* attempts, it MUST trigger a `git rollback` and register a failure in the Ledger.
*   **Output:** Implementation code that successfully passes the test suite defined by *The Justice*.
