# Model Context Protocol (MCP) Integration

Axioma relies heavily on the **Model Context Protocol (MCP)** to give AI Agents "hands and eyes" within the local environment. However, giving an LLM uncontrolled execution environments is a well-known security vector. 

This document outlines how Axioma implements MCP strategically to ensure safety, isolation, and exact tracing.

## 1. The Principle of Least Privilege

Instead of providing a single "Omnipotent" MCP Server with access to execute bash, read files, write files, and query APIs, Axioma strictly partitions MCP instances based on the active role (Agent).

| Agent | Active MCP Servers | Permissions |
| :--- | :--- | :--- |
| **The Archivist** | `mcp-filesystem-read`, `mcp-git-query` | Read-only. Cannot alter state. |
| **The Blueprint** | `mcp-spec-writer` | Write access ONLY bounded to `/docs/specs/` and `/docs/fixtures/`. |
| **The Censor** | None (Operates purely on NLP over the Spec) | No system access necessary. |
| **The Justice** | `mcp-tester`, `mcp-test-runner` | Write access ONLY to `**/*.test.(ts|js|py)`. Read-eval via test runner. |
| **The Mason** | `mcp-filesystem-write`, `mcp-test-runner` | Write access bounded to `src/`. Execution restricted to `npm test` or equivalent. |

## 2. Abstraction via Specialized Tools

We do not expose generic tools like `execute_bash_command`. Instead, MCP exposes highly intentional tools that encapsulate business logic:

### 🔴 Anti-pattern (Generic MCP)
```json
{
  "name": "run_command",
  "description": "Runs a command in the terminal",
  "arguments": { "cmd": "git commit -m 'wip'" }
}
```

### 🟢 Axioma Pattern (Intentional MCP)
```json
{
  "name": "axioma_rollback_state",
  "description": "Reverts the workspace to the last known good commit before The Mason started.",
  "arguments": { "spec_id": "oauth-login-12" }
}
```
*Note: In the Axioma pattern, the server handles the underlying Git mechanics safely, preventing the agent from misusing raw bash commands (like destructive `rm -rf`).*

## 3. The Ledger Tool

The most highly utilized MCP Tool across all agents is `ledger_update`. 

Since multiple agents run sequentially, the orchestration layer intercepts any attempt to move to the next step. Before transitioning from *Blueprint* to *Censor*, the `mcp-spec-writer` server exposes:

```typescript
function updateLedger(specPath: string, agentName: string, action: string, status: 'DONE' | 'VETO' | 'FAILED') {
  // 1. AST Parse Markdown
  // 2. Find Table
  // 3. Append Row
  // 4. Save
}
```

This structural limitation guarantees that no agent can proceed without leaving a cryptographic/hash-based footprint in the Specification document.
