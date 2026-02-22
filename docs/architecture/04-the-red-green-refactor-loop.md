# The Axiomatic Red-Green-Refactor Loop

At the heart of Axioma is a distrust of generated implementation code. Current workflows allow an agent to write 300 lines of code, and then the user runs the app to see if it works. This is essentially "Compile-Driven Development," leading to high context windows and debugging nightmares.

Axioma enforces strict Test-Driven Development (TDD) natively in the flow.

## 1. The Justice: Enforcing the Red Step

In Axioma, **implementation cannot exist without validation.**

1.  After *The Censor* approves a `.spec.md`, the orchestrator awakens **The Justice**.
2.  *The Justice* reads the "Contract / Acceptance Criteria" from the Spec.
3.  *The Justice* generates a test file (e.g., `github-auth.test.ts`).
4.  *The Justice* uses MCP to run the test suite. 
5.  **Critical Invariant:** If the tests pass at this stage, *The Justice* has failed. A test written for new functionality MUST fail because the implementation doesn't exist yet (The "Red" step).
6.  Only when the tests fail does the Ledger update, passing the baton to *The Mason*.

## 2. The Mason: The Green Step

**The Mason** is the most constrained agent in the framework. It is not allowed to be creative.

1.  *The Mason* reads the failing tests written by *The Justice*.
2.  Its system prompt is strictly programmed to write the **minimum code imaginable** to make the tests pass.
3.  It runs the tests via MCP.
    *   If **Green**: It registers success in the Ledger.
    *   If **Red**: It analyzes the stdout, modifies its approach, and tries again.

## 3. The Rollback Mechanism

What happens if *The Mason* gets stuck in an infinite loop of failing tests? This is where the framework proves its rigor.

Unlike standard agents that just keep overwriting files until the user intervenes, Axioma implements an automated safety net based on Git.

1.  Before *The Mason* writes its first line of code, the MCP orchestrator commits the current state: `git commit -m "chore(axioma): snapshot pre-mason [spec: oauth-12]"`
2.  *The Mason* has a maximum threshold of $N$ attempts (configurable in the orchestrator, usually 3).
3.  If attempt $N$ fails, the Orchestrator interrupts *The Mason*.
4.  The Orchestrator executes a hard rollback: `git reset --hard HEAD` and `git clean -fd`.
5.  The Ledger is updated with a `FAILED` status, logging the specific error that couldn't be resolved.

**Why?** Because a failed implementation leaves the workspace in a dirty state with broken imports, half-written interfaces, and leftover logic. By rolling back automatically, Axioma ensures the workspace is always pristine, allowing a Human Developer to intervene cleanely.
