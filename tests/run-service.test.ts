import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runAxiomaPipeline } from "../src/core/run-service/index.js";

const repoRoot = process.cwd();
const tempDirs: string[] = [];

async function setupRunRepo(repoFixture: string, specFixture: string): Promise<{ repoPath: string; specPath: string }> {
  const repoPath = await mkdtemp(path.join(os.tmpdir(), "axioma-run-"));
  tempDirs.push(repoPath);
  await rm(repoPath, { recursive: true, force: true });
  await cp(path.join(repoRoot, "tests/fixtures/repos", repoFixture), repoPath, { recursive: true });
  await mkdir(path.join(repoPath, "docs/specs"), { recursive: true });
  const specPath = path.join(repoPath, "docs/specs", specFixture);
  await writeFile(specPath, await readFile(path.join(repoRoot, "tests/fixtures", specFixture), "utf8"), "utf8");
  return { repoPath, specPath };
}

async function setupRunRepoWithDocSpec(repoFixture: string, specSourcePath: string, targetName: string): Promise<{ repoPath: string; specPath: string }> {
  const repoPath = await mkdtemp(path.join(os.tmpdir(), "axioma-run-"));
  tempDirs.push(repoPath);
  await rm(repoPath, { recursive: true, force: true });
  await cp(path.join(repoRoot, "tests/fixtures/repos", repoFixture), repoPath, { recursive: true });
  await mkdir(path.join(repoPath, "docs/specs"), { recursive: true });
  const specPath = path.join(repoPath, "docs/specs", targetName);
  await writeFile(specPath, await readFile(path.join(repoRoot, specSourcePath), "utf8"), "utf8");
  return { repoPath, specPath };
}

describe("run-service", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("runs the full pipeline from approved to done", async () => {
    const { specPath } = await setupRunRepo("ts-vitest-app", "justice-vitest-approved.spec.md");
    const result = await runAxiomaPipeline(specPath);

    expect(result.finalStatus).toBe("done");
    expect(result.steps).toEqual(["testgen:2", "implement:1", "noop:done"]);
  });

  it("runs the full pipeline from drafting to done", async () => {
    const { specPath } = await setupRunRepo("ts-vitest-app", "run-drafting.spec.md");
    const result = await runAxiomaPipeline(specPath);

    expect(result.finalStatus).toBe("done");
    expect(result.steps).toEqual(["audit:passed", "testgen:2", "implement:1", "noop:done"]);
  });

  it("resumes from testing directly into implement", async () => {
    const { specPath } = await setupRunRepo("ts-vitest-app", "justice-vitest-approved.spec.md");
    await import("../src/core/justice-service/index.js").then(({ generateJusticeTests }) => generateJusticeTests({ specPath }));

    const result = await runAxiomaPipeline(specPath);

    expect(result.finalStatus).toBe("done");
    expect(result.steps).toEqual(["implement:1", "noop:done"]);
  });

  it("stops when audit vetoes the spec", async () => {
    const { specPath } = await setupRunRepo("ts-vitest-app", "audit-subjective.spec.md");
    const result = await runAxiomaPipeline(specPath);

    expect(result.finalStatus).toBe("vetoed");
    expect(result.steps).toEqual(["audit:vetoed"]);
  });

  it("returns done without mutating when the spec is already complete", async () => {
    const { specPath } = await setupRunRepoWithDocSpec("ts-vitest-app", "docs/specs/example.spec.md", "example.spec.md");
    const result = await runAxiomaPipeline(specPath);

    expect(result.finalStatus).toBe("done");
    expect(result.steps).toEqual(["noop:done"]);
  });

  it("stops explicitly when the spec is already failed", async () => {
    const { specPath } = await setupRunRepo("ts-vitest-app", "run-failed.spec.md");
    const result = await runAxiomaPipeline(specPath);

    expect(result.finalStatus).toBe("failed");
    expect(result.steps).toEqual(["stop:failed"]);
  });

  it("throws on unsupported statuses", async () => {
    const { specPath } = await setupRunRepo("ts-vitest-app", "invalid-status-and-sections.spec.md");

    await expect(runAxiomaPipeline(specPath)).rejects.toThrow('Unsupported pipeline status "shipping".');
  });
});
