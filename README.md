# 📐 Axioma
> The Spec-Driven Development Framework for AI Agents.
> Rigor over speed. Engineering over impulsivity.
> 

Axioma is an architectural framework and methodology designed to transform AI agents into rigorous software engineers. It is built on the premise that ambiguity is a system failure and the Specification (Spec) is the only non-negotiable source of truth.

## 🌟 The Vision
AI-assisted development today suffers from "hyper-activity": agents write code before fully understanding the problem, leading to technical debt, hallucinations, and regressions.
Axioma enforces an engineering workflow based on contracts and the 🟢🔴🟢 cycle (TDD for Agents). No single line of code is allowed to be written without prior validation of logic, scope, and testability.

## 🎭 The Cast: Specialized Agents
Axioma operates through a hierarchy of agents with non-negotiable roles and honors:
 * The Archivist (The Context Guardian): Reduces uncertainty to zero. Interviews the user, analyzes the repository via MCP, and detects dependencies. It doesn't assume; it asks.
 * The Blueprint (The Architect): Translates intent into a structured .spec.md file and defines the fixtures (synthetic data).
 * The Censor (The Auditor): Holds veto power. Rejects the Spec if it is ambiguous, if the scope is too large, or if it breaks system invariants.
 * The Justice (The Judge): Creates the tests and ensures they fail (Red Step) before allowing any implementation. It is the guarantor of truth.
 * The Mason (The Builder): The artisan who implements the minimum code necessary to satisfy The Justice.

## 🔄 The Axiomatic Flow
Axioma doesn't just "chat" with code; it executes a trust protocol:
 * Inquiry Phase: File identification and ambiguity reduction.
 * Drafting: Generation of the Axioma Manifest (.spec.md).
 * Audit: Quality validation by The Censor.
 * The Trial: Generation of unit/integration tests that must fail initially.
 * Construction: Code implementation and automatic Git rollback if tests do not pass.

## 🛠️ Technical Stack
Axioma is designed to be agnostic but powered by a high-performance core:
 * Engine: Google Gen AI SDK (Gemini 2.0+).
 * Capability: Native Model Context Protocol (MCP) support to safely interact with Filesystem, Git, and Runtime.
 * Safety: State control via a Ledger injected into the Spec itself for total traceability.

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

## 🤝 Join the Discussion
Axioma is currently an RFC (Request For Comments). We are not just looking for code; we are looking for critical thinking. As the creator of the framework, I have opened technical debates in the Discussions tab regarding:
 * [ ] Defining the Manifest Standard (.spec.md).
 * [ ] Veto criteria for The Censor.
 * [ ] Security and permissions for write-access MCP servers.
Do you believe in a future where AI writes industrial-grade code? Help us define the standard.

## 📄 License
This project is licensed under the Apache License 2.0.
Would you like me to prepare the content for your first technical Discussion post now?
