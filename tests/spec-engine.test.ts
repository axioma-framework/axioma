import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseSpec, serializeSpec, updateLedgerSection, validateSpec } from "../src/core/spec-engine/index.js";

const repoRoot = process.cwd();

describe("spec-engine", () => {
  it("parses a valid spec", async () => {
    const raw = await readFile(path.join(repoRoot, "docs/specs/example.spec.md"), "utf8");
    const spec = parseSpec(raw);

    expect(spec.frontmatter.feature).toBe("add-greeting");
    expect(spec.acceptanceCriteria).toHaveLength(3);
    expect(spec.ledger).toHaveLength(5);
  });

  it("fails when frontmatter is missing", async () => {
    const raw = await readFile(path.join(repoRoot, "tests/fixtures/invalid-missing-frontmatter.spec.md"), "utf8");

    expect(() => parseSpec(raw)).toThrow("Spec is missing YAML frontmatter.");
  });

  it("returns an error when context_bounds is empty", async () => {
    const raw = await readFile(path.join(repoRoot, "docs/specs/example.spec.md"), "utf8");
    const spec = parseSpec(raw);
    spec.frontmatter.context_bounds = [];

    const result = validateSpec(spec);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Frontmatter context_bounds must contain at least one file path.");
  });

  it("fails when the ledger table is malformed", async () => {
    const raw = await readFile(path.join(repoRoot, "tests/fixtures/invalid-ledger.spec.md"), "utf8");

    expect(() => parseSpec(raw)).toThrow("Ledger table must have headers: Agent | Status | Timestamp | Notes");
  });

  it("reports invalid Given/When/Then criteria", async () => {
    const raw = await readFile(path.join(repoRoot, "tests/fixtures/invalid-contract.spec.md"), "utf8");
    const spec = parseSpec(raw);

    const result = validateSpec(spec);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Acceptance criterion AC-01 must use Given/When/Then format.");
  });

  it("reports duplicate ledger agents", async () => {
    const raw = await readFile(path.join(repoRoot, "tests/fixtures/invalid-duplicate-agent.spec.md"), "utf8");
    const spec = parseSpec(raw);

    const result = validateSpec(spec);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Ledger contains duplicate agent row "The Blueprint".');
  });

  it("warns when fixtures section is omitted", async () => {
    const raw = await readFile(path.join(repoRoot, "tests/fixtures/invalid-contract.spec.md"), "utf8");
    const spec = parseSpec(raw);

    const result = validateSpec(spec);

    expect(result.warnings).toContain("Spec does not declare a Fixtures section.");
  });

  it("reports invalid top-level status and missing required sections", async () => {
    const raw = await readFile(path.join(repoRoot, "tests/fixtures/invalid-status-and-sections.spec.md"), "utf8");
    const spec = parseSpec(raw);

    const result = validateSpec(spec);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid status "shipping".');
    expect(result.errors).toContain('Missing required section "Contract".');
    expect(result.errors).toContain("Contract section must define at least one acceptance criterion.");
  });

  it("updates only the ledger section when asked to rewrite ledger content", async () => {
    const raw = await readFile(path.join(repoRoot, "docs/specs/example.spec.md"), "utf8");
    const nextRaw = updateLedgerSection(raw, [
      {
        agent: "The Blueprint",
        status: "DONE",
        timestamp: "2026-04-04",
        notes: "Spec refreshed."
      }
    ]);

    expect(nextRaw).toContain("| The Blueprint | DONE | 2026-04-04 | Spec refreshed. |");
    expect(nextRaw).toContain("## Intent");
    expect(nextRaw).toContain("## Contract");
  });

  it("preserves semantics across parse -> serialize -> parse", async () => {
    const raw = await readFile(path.join(repoRoot, "docs/specs/example.spec.md"), "utf8");
    const original = parseSpec(raw);
    const reparsed = parseSpec(serializeSpec(original));

    expect(reparsed.frontmatter).toEqual(original.frontmatter);
    expect(reparsed.acceptanceCriteria).toEqual(original.acceptanceCriteria);
    expect(reparsed.ledger).toEqual(original.ledger);
  });
});
