# Contributing to Axioma (RFC)

First off, thank you for taking the time to contribute! Axioma is currently in the **Request For Comments (RFC)** stage. This means we are primarily looking for conceptual contributions, architectural designs, and critical feedback before writing the core implementation.

## 🌟 How to Contribute Right Now

Since we are defining the standard, the best way to contribute is through **GitHub Discussions** rather than Pull Requests with code.

We are specifically looking for help in these areas:

1.  **The Manifest Standard (`.spec.md`)**
    *   How should the Ledger be structured?
    *   What metadata is strictly necessary in the YAML frontmatter?
2.  **The Auditor's Rules (The Censor)**
    *   What mathematical/logical invariants should trigger a Veto?
    *   How do we prevent "God Objects" or excessive scope in a single Spec?
3.  **MCP Security & Architecture**
    *   How do we safely give the agent write-access to the filesystem without risking destructive commands?
    *   What is the optimal git-rollback strategy for the Red-Green-Refactor loop?

### 👉 Opening a Discussion

If you have an idea or want to tackle one of the points above:
1.  Go to the [Discussions tab](https://github.com/axioma-framework/axioma/discussions).
2.  Choose the appropriate category (e.g., *Ideas*, *Q&A*).
3.  Be as rigorous as Axioma: State the problem, your proposed solution, and the trade-offs.

## 🛠️ Code Contributions (Future)

Once the RFC phase matures and the specifications are locked:

*   **Prompts:** Contributions to `.axioma/prompts/*.md` will be welcomed to refine the agent personas.
*   **MCP Servers:** We will need lightweight MCP servers to handle File System and Git operations.

### Ground Rules for Future PRs
1.  **No untested code:** Every PR must include tests that prove the fix or feature.
2.  **Spec-Driven:** If you are adding a feature, you must first propose the `.spec.md` in a Discussion or Issue.
3.  **Rigor over Speed:** We prefer a slow, well-thought-out PR over a quick hack.

Thank you for helping build a future where AI writes industrial-grade code!
