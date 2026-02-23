# The Cast: Role-Based Agentic Hierarchy

A fundamental flaw in modern AI development is the "Monolithic Agent." When a single prompt is asked to research, design, test, and implement a feature, it attempts to satisfy all constraints simultaneously, invariably leading to hallucinations or "God Objects."

Axioma strictly separates concerns. Agents in Axioma do not collaborate; they hand off state. They are distinct personas with specific **Invariants** (rules they cannot break) and specific **Inputs/Outputs**.

> 📂 All system prompts live in [`.axioma/prompts/`](../../.axioma/prompts/). The [Manifest Template](../../.axioma/templates/manifest.template.md) defines the `.spec.md` contract format shared by all agents.

---

## 1. The Archivist (The Context Guardian)
> 📄 System Prompt: [archivist.md](../../.axioma/prompts/archivist.md)

The first agent in the chain. Its sole purpose is to gather context and destroy ambiguity.

*   **Phase:** 1 — Vibe Coding (Interactive)
*   **Mentality:** Skeptical and Inquisitive.
*   **MCP Capabilities:** Read-only access to Filesystem (`list_dir`, `read_file`) and Git integration (`git log`).
*   **Invariants:** 
    *   NEVER write implementation code.
    *   NEVER suggest a solution without proving it found the relevant files.
    *   NEVER pass the task forward while any Pending Definition remains unanswered.
*   **Output:** A structured Context Map detailing the files involved, existing patterns to follow, and a list of "Pending Definitions" to ask the user if intent is unclear.

## 2. The Blueprint (The Architect)
> 📄 System Prompt: [blueprint.md](../../.axioma/prompts/blueprint.md)

Takes the Context Map from The Archivist and the user's intent to draft the initial `.spec.md`.

*   **Phase:** 1 — Vibe Coding (Interactive)
*   **Mentality:** Structural and Contractual.
*   **MCP Capabilities:** Write access limited to `/docs/specs/` and `/docs/fixtures/`.
*   **Invariants:**
    *   MUST explicitly list system boundaries in the YAML Frontmatter (`context_bounds`).
    *   MUST define Acceptance Criteria as discrete, testable steps in Given/When/Then format.
    *   MUST NOT exceed 3 distinct domains per spec.
*   **Output:** The first iteration of the Manifest (`.spec.md`). See the [Manifest Template](../../.axioma/templates/manifest.template.md) for the required structure.

## 3. The Censor (The Quality Gate)
> 📄 System Prompt: [censor.md](../../.axioma/prompts/censor.md)

The most critical agent in Axioma. It is designed to be antagonistic to *The Blueprint*. Its job is to find a reason to **VETO** the specification.

*   **Phase:** 2 — Fire and Forget (Autonomous)
*   **Mentality:** Critical, Strict, and Pessimistic.
*   **MCP Capabilities:** Read access to the `.spec.md`. Write access only to the Ledger section.
*   **Invariants:**
    *   MUST veto if the specification touches more than 3 distinct core domains (Scope Creep).
    *   MUST veto if the Acceptance Criteria are subjective (banned words: fast, user-friendly, optimized, seamless, efficient, etc.).
    *   MUST veto if grey areas exist (undefined variables, missing fixtures, vague AC steps).
    *   MUST veto if AC steps are not independently testable.
*   **Output:** Either a `PASS` or a `VETO` with a detailed explanation injected into the Ledger. If vetoed, the process returns to *The Blueprint*.

## 4. The Justice (The TDD Enforcer)
> 📄 System Prompt: [justice.md](../../.axioma/prompts/justice.md)

Once a spec passes the audit, *The Justice* reads it and writes the testing suite. This enforces the first step of the 🟢🔴🟢 cycle.

*   **Phase:** 2 — Fire and Forget (Autonomous)
*   **Mentality:** Objective and Rule-bound.
*   **MCP Capabilities:** Write access strictly to test directories (e.g., `/src/**/*.test.ts`). Ability to execute the test runner via terminal.
*   **Invariants:**
    *   All generated tests MUST FAIL initially (Red step).
    *   Tests can ONLY cover criteria explicitly defined in the `.spec.md`. No implicit testing.
    *   MUST detect the project's test framework before writing any tests.
*   **Output:** A failing test suite and an update to the Ledger stating the system is ready for implementation.

## 5. The Mason (The Builder)
> 📄 System Prompt: [mason.md](../../.axioma/prompts/mason.md)

The final agent. It is given the failing tests and told to make them pass. 

*   **Phase:** 2 — Fire and Forget (Autonomous)
*   **Mentality:** Pragmatic and Minimalist.
*   **MCP Capabilities:** Write access to `/src/**` (restricted to `context_bounds`). Read access to tests and `.spec.md`. Execution access to test runner.
*   **Invariants:**
    *   MUST write the absolute minimum amount of code to turn the tests Green.
    *   MUST NOT modify test files to make them pass.
    *   If tests do not pass after 3 attempts, MUST trigger a `git rollback` and register a failure in the Ledger.
    *   MUST NOT touch files outside of the spec's `context_bounds`.
*   **Output:** Implementation code that successfully passes the test suite defined by *The Justice*.

---

## Reference
*   [Example Spec (add-greeting)](../specs/example.spec.md) — A complete end-to-end example showing all 5 agents in action.
*   [Manifest Template](../../.axioma/templates/manifest.template.md) — The base contract format.
