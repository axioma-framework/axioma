# 📐 Axioma

> The Spec-Driven Development Framework for AI Agents. 
> Rigor over speed. Engineering over impulsivity.

[![Status](https://img.shields.io/badge/Status-RFC-orange.svg)](#-join-the-discussion)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Stack](https://img.shields.io/badge/Stack-AI_Agents_%7C_MCP-success.svg)](#%EF%B8%8F-technical-stack)
[![Lang](https://img.shields.io/badge/Version-English-yellow.svg)](README.md)
[![Lang](https://img.shields.io/badge/Versi%C3%B3n-Espa%C3%B1ol-yellow.svg)](README.es.md)

Axioma is an architectural framework and methodology designed to transform AI agents into rigorous software engineers. It is built on the premise that ambiguity is a system failure and the **Specification (Spec)** is the only non-negotiable source of truth.

---

## 💥 Why Axioma?

If you've iterated on a project using Vibe Coding, you've probably experienced this: you ask an AI agent to add a new feature, and it silently **modifies or breaks** features that were already working. The agent has no memory of the system's contracts — it sees code and charges forward.

**That is the problem Axioma was built to solve.**

With Axioma, you don't talk to code — you **talk to specifications**. In natural language. Your system's behavior is defined in `.spec.md` files, and you evolve them through a controlled pipeline where:

*   ✅ Each change is scoped to explicit file boundaries (`context_bounds`).
*   ✅ Every feature has acceptance criteria validated by tests **before** implementation.
*   ✅ An antagonistic auditor (*The Censor*) rejects vague or overreaching changes.
*   ✅ If implementation fails, the system **rolls back automatically**.

> **Axioma is the first step toward a future where complex systems are built by chatting with their specs — safely, incrementally, and without regressions.**

---

## 🌟 The Vision: Code Slaves vs. Software Engineers

AI-assisted development today suffers from "hyper-activity":
*   ❌ **Current State (Agents as Code Slaves):** Agents write code before fully understanding the problem, leading to technical debt, hallucinations, and regressions.
*   ✅ **Axioma (Agents as Software Engineers):** Enforces an engineering workflow based on contracts and the 🟢🔴🟢 cycle (TDD for Agents). **No single line of code is allowed to be written without prior validation of logic, scope, and testability.**

---

## 🔄 The Axiomatic Flow: Vibe Coding meets Autonomy

Axioma bridges the gap between conversational brainstorming ("Vibe Coding") and strict software engineering ("Fire and Forget"). It executes a strict trust protocol mediated by specialized agents and divided by a critical **Human Approval Boundary**:

```mermaid
graph TD
    User([User Request]) --> A
    
    subgraph Phase 1: Vibe Coding (Interactive Chatbot)
    A[The Archivist] -- MCP --> Repo[(Repository)]
    A -.->|Ask & Clarify| User
    A --> B[The Blueprint]
    B --> Spec[.spec.md / Ledger]
    B -.->|Draft & Refine| User
    end
    
    Spec ===>|Human Approval Boundary| C
    
    subgraph Phase 2: Fire and Forget (Autonomous Flow)
    C{The Censor} -->|Veto| A
    C -->|Approved| J[The Justice]
    J --> Tests((Tests))
    Tests -->|Must Fail 🔴| M
    M[The Mason] --> Src{src/}
    Src -->|Tests Pass 🟢| Done([Deployable Code])
    Src -->|Tests Fail 🔴| M
    end
```

### 🎭 The Cast: Specialized Agents

Axioma operates through a hierarchy of agents with non-negotiable roles and honors:

**🗣️ The Chatbot / Design Agents (Phase 1):**
1.  **The Archivist (The Context Guardian):** Reduces uncertainty to zero. Interviews the user, analyzes the repository via MCP, and detects dependencies. It doesn't assume; it asks.
2.  **The Blueprint (The Architect):** Translates intent into a structured `.spec.md` file and defines the fixtures (synthetic data).

**🤖 The Autonomous Builders (Phase 2):**
3.  **The Censor (The Auditor):** Holds veto power. Rejects the Spec if it is ambiguous, if the scope is too large, or if it breaks system invariants.
4.  **The Justice (The Judge):** Creates the tests and ensures they fail (Red Step) before allowing any implementation. It is the guarantor of truth.
5.  **The Mason (The Builder):** The artisan who implements the minimum code necessary to satisfy The Justice.

---

## 🛠️ Technical Stack

Axioma is designed to be agnostic but powered by a high-performance core:

*   **Engine:** Google Gen AI SDK (Gemini 2.0+).
*   **Capability:** Native **Model Context Protocol (MCP)** support to safely interact with Filesystem, Git, and Runtime.
*   **Safety:** State control via a **Ledger** injected into the Spec itself for total traceability.

---

## 🚀 Current v1

This repository now contains a working local CLI for a first end-to-end Axioma v1 focused on **Node + TypeScript + Vitest/Jest**.

Current commands:

*   `axioma init [repo]`
*   `axioma draft <feature> [--repo <path>]`
*   `axioma audit <spec>`
*   `axioma testgen <spec>`
*   `axioma implement <spec>`
*   `axioma run <spec>`
*   `axioma status <spec>`
*   `axioma spec validate <spec>`

Current scope:

*   Specs are the source of truth and ledger state is stored in the `.spec.md`.
*   The pipeline can run end-to-end on supported TypeScript repositories.
*   Justice and Mason currently use a **minimal contract loop** to guarantee a deterministic red/green cycle inside `context_bounds`.
*   This is a usable v1, but not yet a published package or a general multi-language solution.

---

## 📦 Manual Installation

Until Axioma is published as a package, install it manually from this repository:

```bash
git clone git@github.com:axioma-framework/axioma.git
cd axioma
npm install
npm run build
```

You can then use the CLI in one of these ways:

```bash
node dist/cli/index.js --help
node dist/cli/index.js init /path/to/target-repo
node dist/cli/index.js draft greeting --repo /path/to/target-repo
```

If you want a local command during experimentation:

```bash
npm link
axioma --help
```

---

## ▶️ Manual Usage

Minimal end-to-end flow on a supported target repo:

```bash
axioma init /path/to/target-repo
axioma draft greeting --repo /path/to/target-repo
axioma audit /path/to/target-repo/docs/specs/greeting.spec.md
axioma testgen /path/to/target-repo/docs/specs/greeting.spec.md
axioma implement /path/to/target-repo/docs/specs/greeting.spec.md
```

Or run the autonomous flow from an approved or draft spec:

```bash
axioma run /path/to/target-repo/docs/specs/greeting.spec.md
```

Recommended target repo shape for v1:

*   `package.json` present
*   TypeScript source rooted in `src/` or `lib/`
*   `vitest` or `jest` already present in the target repo contract

---

## 🤖 Agent Install Prompt

If you want another coding agent to install and configure Axioma in a repository where you plan to use it, you can give it this prompt:

```text
Install and configure Axioma v1 in this repository.

Requirements:
- Treat the current repository as the target repo where Axioma will be used.
- Clone or use the Axioma framework from git@github.com:axioma-framework/axioma.git.
- Build Axioma if needed.
- Initialize the target repo for Axioma usage.
- Verify whether this repo is compatible with the current Axioma v1 assumptions:
  - package.json exists
  - source code lives in src/ or lib/
  - vitest or jest is available
- Do not publish anything or modify unrelated code.
- At the end, report:
  - how Axioma was installed
  - which command should be used to invoke it locally
  - whether the repo is compatible right now
  - the exact first command to draft a spec in this repo
```

---

## 📂 Project Structure

Project structure overview:

```text
/your-project
├── .axioma/
│   └── prompts/       # Customizable Agent System Prompts
├── docs/specs/        # Source of Truth (.spec.md)
├── docs/fixtures/     # Synthetic data linked to specs
└── src/               # Implemented and validated code
```

---

## 📚 Deep Dive (Architecture)

If you want to understand the rigorous mechanics behind Axioma, read our core architectural documents:

1.  **[The Manifest Standard & Ledger](docs/architecture/01-the-manifest.md):** Why `.spec.md` is the only source of truth.
2.  **[The Cast of Agents](docs/architecture/02-the-agents.md):** Deep dive into the invariants of each specialized agent.
3.  **[MCP Integration & Security](docs/architecture/03-mcp-integration.md):** How we isolate access to prevent system destruction.
4.  **[The Red-Green-Refactor Loop](docs/architecture/04-the-red-green-refactor-loop.md):** The mandatory TDD flow and automatic `git rollback`.

---

## 🤝 Join the Discussion (RFC)

Axioma is currently an **RFC (Request For Comments)**. We are not just looking for code; we are looking for critical thinking and visionaries. 

**Who are we looking for?**
*   **Software Architects** to help define the `.spec.md` Manifest Standard.
*   **Prompt Engineers** to calibrate *The Censor* and its veto criteria.
*   **MCP Developers** to build secure write-access servers.

Do you believe in a future where AI writes industrial-grade code? Help us define the standard.

👉 **[Jump to GitHub Discussions](https://github.com/axioma-framework/axioma/discussions) to participate.**

---

## 📄 License
This project is licensed under the [Apache License 2.0](LICENSE).
