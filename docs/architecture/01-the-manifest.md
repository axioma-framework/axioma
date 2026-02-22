# The Manifest Standard (`.spec.md`) & The Ledger

In Axioma, the Specification is the absolute Source of Truth. If it is not in the `.spec.md`, it does not exist. If the code does not match the `.spec.md`, the code is wrong. 

Our framework relies on two critical components merged into a single file: **The YAML Frontmatter (Metadata)** and **The Ledger (State)**.

## 1. Why Markdown + YAML?

During the design phase, several formats were evaluated to act as the contract between the Human (Intent) and the AI Agents (Execution):

*   **JSON/TOML:** Excellent for machines but hostile to human readers, especially for long-form narrative explanations of business logic.
*   **Plain Markdown:** Excellent for humans, but hard for a state machine to parse properties reliably.

**The Decision:** We adopted a Hybrid approach. 
1.  **YAML Frontmatter** sits at the top of the file, holding strictly typed metadata (Status, Context Bounds, API versions) that the MCP Orchestrator parses to boot the agent.
2.  **Markdown Body** contains the narrative, the constraints, and the *Ledger*.

## 2. Anatomy of a `.spec.md`

A minimal Axioma specification file looks like this:

```markdown
---
status: drafting | auditing | testing | implementing | completed
version: 1.0.0
context_bounds:
  - "src/auth/*.ts"
  - "package.json"
invariants:
  - "Must use existing JWT decoding service, DO NOT write a new one."
  - "Coverage for new functions must hit 100%."
---

# Feature: OAuth GitHub Login

## The Intent
Briefly describe what the user wants to achieve.

## The Contract (Acceptance Criteria)
1. System receives code from GitHub.
2. System exchanges code for token using `GitHubService`.
3. System creates or updates User in the Database.

## The Ledger (State Machine)
| Agent | Action | Status | Hash / Detail |
| :--- | :--- | :--- | :--- |
| Archivist | Context Discovery | ✅ DONE | `ctx-88fa2b` |
| Blueprint | Draft Spec | ✅ DONE | `draft-1102` |
| Censor | Audit | 🔴 VETO | "Scope includes Database migration. Too broad." |
| Blueprint | Re-Draft Spec | ✅ DONE | Removed migration. |
| Censor | Audit | ✅ PASS | `audit-ok` |
| Justice | Write Tests | ⏳ PENDING | ... |
```

## 3. The Ledger: In-file State Management

Most Agentic Frameworks (like LangChain or AutoGen) store execution state in memory, in a Redis database, or in SQLite. This creates a disconnect between the code being written and the memory of the agent doing the writing.

**Axioma solves this by storing the state in the file itself.**

### Why the Ledger is Revolutionary:
1.  **Zero-Setup Persistence:** You can close your laptop during an agent execution, open it tomorrow, point the agent to the `/docs/specs/login.spec.md`, and the agent knows exactly where it left off by reading the Markdown table.
2.  **Human Debugging:** If the agent gets stuck in a loop, a human can literally edit the Ledger table, change a "status" from `FAILED` to `PENDING`, and restart the process.
3.  **Traceability:** Every veto, every test failure, and every successful build is documented chronologically alongside the requirements.

### The Ledger Interface
The MCP server interacts with the `.spec.md` using AST (Abstract Syntax Tree) parsing for Markdown. When an agent (e.g., *The Justice*) finishes its task, it executes an MCP tool `update_ledger(step, status)`. The server finds the table in the Markdown file, appends the row, and saves the file. 

This guarantees that the Source of Truth and the State of Execution are always perfectly synchronized in version control (Git).
