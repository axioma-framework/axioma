import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { auditSpec, auditSpecFile } from "../src/core/censor-service/index.js";
import { parseSpec } from "../src/core/spec-engine/index.js";

const repoRoot = process.cwd();
const tempDirs: string[] = [];

async function makeTempSpec(fixtureName: string): Promise<{ repoPath: string; specPath: string }> {
  const repoPath = await mkdtemp(path.join(os.tmpdir(), "axioma-audit-"));
  tempDirs.push(repoPath);
  await mkdir(path.join(repoPath, "docs/specs"), { recursive: true });
  await mkdir(path.join(repoPath, "docs/fixtures"), { recursive: true });
  const source = await readFile(path.join(repoRoot, "tests/fixtures", fixtureName), "utf8");
  const specPath = path.join(repoPath, "docs/specs", fixtureName);
  await writeFile(specPath, source, "utf8");
  return { repoPath, specPath };
}

describe("censor-service", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("passes a narrow and measurable spec", async () => {
    const { repoPath, specPath } = await makeTempSpec("audit-pass.spec.md");
    const spec = parseSpec(await readFile(specPath, "utf8"), specPath);

    const result = await auditSpec(spec, repoPath);

    expect(result.passed).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it("vetoes subjective language", async () => {
    const { repoPath, specPath } = await makeTempSpec("audit-subjective.spec.md");
    const spec = parseSpec(await readFile(specPath, "utf8"), specPath);
    const result = await auditSpec(spec, repoPath);

    expect(result.passed).toBe(false);
    expect(result.reasons.join(" ")).toContain("Invariant 2 failed");
    expect(result.reasons.join(" ")).toContain('banned word "fast"');
  });

  it("vetoes scope creep across more than three domains", async () => {
    const { repoPath, specPath } = await makeTempSpec("audit-scope.spec.md");
    const spec = parseSpec(await readFile(specPath, "utf8"), specPath);
    const result = await auditSpec(spec, repoPath);

    expect(result.passed).toBe(false);
    expect(result.reasons[0]).toContain("Invariant 1 failed");
  });

  it("vetoes ambiguity and out-of-bounds file references", async () => {
    const { repoPath, specPath } = await makeTempSpec("audit-ambiguity.spec.md");
    const spec = parseSpec(await readFile(specPath, "utf8"), specPath);
    const result = await auditSpec(spec, repoPath);

    expect(result.passed).toBe(false);
    expect(result.reasons.join(" ")).toContain("Invariant 3 failed");
  });

  it("vetoes compound assertions", async () => {
    const { repoPath, specPath } = await makeTempSpec("audit-compound.spec.md");
    const spec = parseSpec(await readFile(specPath, "utf8"), specPath);
    const result = await auditSpec(spec, repoPath);

    expect(result.passed).toBe(false);
    expect(result.reasons.join(" ")).toContain("Invariant 4 failed");
  });

  it("vetoes missing fixture files", async () => {
    const { repoPath, specPath } = await makeTempSpec("audit-missing-fixture.spec.md");
    const spec = parseSpec(await readFile(specPath, "utf8"), specPath);
    const result = await auditSpec(spec, repoPath);

    expect(result.passed).toBe(false);
    expect(result.reasons.join(" ")).toContain('referenced fixture "fixture-missing.fixture.json" does not exist');
  });

  it("accepts specs when referenced fixtures exist", async () => {
    const { repoPath, specPath } = await makeTempSpec("audit-existing-fixture.spec.md");
    await writeFile(path.join(repoPath, "docs/fixtures", "fixture-present.fixture.json"), "{}", "utf8");
    const spec = parseSpec(await readFile(specPath, "utf8"), specPath);
    const result = await auditSpec(spec, repoPath);

    expect(result.passed).toBe(true);
  });

  it("surfaces base spec validation failures through the auditor", async () => {
    const { repoPath, specPath } = await makeTempSpec("invalid-contract.spec.md");
    const spec = parseSpec(await readFile(specPath, "utf8"), specPath);
    const result = await auditSpec(spec, repoPath);

    expect(result.passed).toBe(false);
    expect(result.reasons.join(" ")).toContain("Spec validation failed");
    expect(result.reasons.join(" ")).toContain("Acceptance criterion AC-01 must use Given/When/Then format.");
  });

  it("writes PASS outcome into the ledger and advances the spec", async () => {
    const { specPath } = await makeTempSpec("audit-pass.spec.md");
    const output = await auditSpecFile({ specPath });

    expect(output.result.passed).toBe(true);
    expect(output.spec.frontmatter.status).toBe("approved");
    expect(output.spec.ledger.find((row) => row.agent === "The Censor")?.status).toBe("DONE");
    expect(output.spec.ledger.find((row) => row.agent === "The Justice")?.status).toBe("PENDING");
  });

  it("writes VETOED outcome into the ledger on failure", async () => {
    const { specPath } = await makeTempSpec("audit-subjective.spec.md");
    const output = await auditSpecFile({ specPath });

    expect(output.result.passed).toBe(false);
    expect(output.spec.frontmatter.status).toBe("vetoed");
    expect(output.spec.ledger.find((row) => row.agent === "The Censor")?.status).toBe("VETOED");
  });
});
