import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { updateLedgerRow, validateStatusTransition } from "../src/core/ledger-service/index.js";
import { parseSpec, serializeSpec } from "../src/core/spec-engine/index.js";

const repoRoot = process.cwd();

describe("ledger-service", () => {
  it("updates a ledger row without altering unrelated sections", async () => {
    const raw = await readFile(path.join(repoRoot, "docs/specs/example.spec.md"), "utf8");
    const spec = parseSpec(raw);
    const updated = updateLedgerRow(
      spec,
      "The Censor",
      {
        status: "DONE",
        timestamp: "2026-04-04",
        notes: "PASS"
      }
    );

    const nextRaw = serializeSpec(updated);

    expect(nextRaw).toContain("| The Censor | DONE | 2026-04-04 | PASS |");
    expect(nextRaw).toContain("## Intent");
    expect(nextRaw).toContain("## Contract");
  });

  it("validates state transitions deterministically", () => {
    expect(validateStatusTransition("drafting", "auditing")).toBe(true);
    expect(validateStatusTransition("drafting", "done")).toBe(false);
  });

  it("fails when attempting to update an unknown agent", async () => {
    const raw = await readFile(path.join(repoRoot, "docs/specs/example.spec.md"), "utf8");
    const spec = parseSpec(raw);

    expect(() => updateLedgerRow(spec, "Unknown Agent", { status: "DONE" })).toThrow('Agent "Unknown Agent" not found in ledger.');
  });

  it("fails on invalid status transitions", async () => {
    const raw = await readFile(path.join(repoRoot, "docs/specs/example.spec.md"), "utf8");
    const spec = parseSpec(raw);

    expect(() => updateLedgerRow(spec, "The Mason", { status: "DONE" }, "drafting")).toThrow(
      'Invalid status transition from "done" to "drafting".'
    );
  });
});
