import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { generateJusticeTests } from "../src/core/justice-service/index.js";
import { applyMarkerImplementation, implementWithMason } from "../src/core/mason-service/index.js";
import { parseSpec } from "../src/core/spec-engine/index.js";

const repoRoot = process.cwd();
const tempDirs: string[] = [];

async function setupMasonRepo(repoFixture: string, specFixture: string): Promise<{ repoPath: string; specPath: string }> {
  const repoPath = await mkdtemp(path.join(os.tmpdir(), "axioma-mason-"));
  tempDirs.push(repoPath);
  await rm(repoPath, { recursive: true, force: true });
  await cp(path.join(repoRoot, "tests/fixtures/repos", repoFixture), repoPath, { recursive: true });
  await mkdir(path.join(repoPath, "docs/specs"), { recursive: true });
  const specPath = path.join(repoPath, "docs/specs", specFixture);
  await writeFile(specPath, await readFile(path.join(repoRoot, "tests/fixtures", specFixture), "utf8"), "utf8");
  await generateJusticeTests({ specPath });
  return { repoPath, specPath };
}

describe("mason-service", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("implements the vitest red suite inside context bounds", async () => {
    const { repoPath, specPath } = await setupMasonRepo("ts-vitest-app", "justice-vitest-approved.spec.md");
    const result = await implementWithMason({ specPath });
    const source = await readFile(path.join(repoPath, "src/greeting.ts"), "utf8");

    expect(result.attempts).toBe(1);
    expect(result.modifiedFiles).toEqual(["src/greeting.ts"]);
    expect(result.spec.frontmatter.status).toBe("done");
    expect(source).toContain("__axiomaJusticeMarkers");
  });

  it("implements the jest red suite inside context bounds", async () => {
    const { repoPath, specPath } = await setupMasonRepo("ts-jest-app", "justice-jest-approved.spec.md");
    const result = await implementWithMason({ specPath });
    const source = await readFile(path.join(repoPath, "lib/auth-service.ts"), "utf8");

    expect(result.attempts).toBe(1);
    expect(result.spec.frontmatter.status).toBe("done");
    expect(source).toContain("__axiomaJusticeMarkers");
  });

  it("rejects specs that are not in testing status", async () => {
    const repoPath = await mkdtemp(path.join(os.tmpdir(), "axioma-mason-invalid-"));
    tempDirs.push(repoPath);
    await cp(path.join(repoRoot, "tests/fixtures/repos/ts-vitest-app"), repoPath, { recursive: true });
    await mkdir(path.join(repoPath, "docs/specs"), { recursive: true });
    const specPath = path.join(repoPath, "docs/specs", "justice-not-approved.spec.md");
    await writeFile(specPath, await readFile(path.join(repoRoot, "tests/fixtures/justice-not-approved.spec.md"), "utf8"), "utf8");

    await expect(implementWithMason({ specPath })).rejects.toThrow('Mason requires a spec in testing status. Current status is "drafting".');
  });

  it("restores files and marks the spec failed after exhausting attempts", async () => {
    const { repoPath, specPath } = await setupMasonRepo("ts-vitest-app", "justice-vitest-approved.spec.md");
    const original = await readFile(path.join(repoPath, "src/greeting.ts"), "utf8");

    await expect(
      implementWithMason({
        specPath,
        maxAttempts: 2,
        runnerOverride: async () => ({
          exitCode: 1,
          output: "Still failing"
        })
      })
    ).rejects.toThrow("Mason failed after 2 attempts. Still failing");

    const restored = await readFile(path.join(repoPath, "src/greeting.ts"), "utf8");
    const specRaw = await readFile(specPath, "utf8");

    expect(restored).toBe(original);
    expect(specRaw).toContain("status: failed");
    expect(specRaw).toContain("| The Mason | FAILED |");
  });

  it("rejects testing specs when the detected runner is unsupported", async () => {
    const repoPath = await mkdtemp(path.join(os.tmpdir(), "axioma-mason-unsupported-"));
    tempDirs.push(repoPath);
    await cp(path.join(repoRoot, "tests/fixtures/repos/ts-unknown-runner"), repoPath, { recursive: true });
    await mkdir(path.join(repoPath, "docs/specs"), { recursive: true });
    const specPath = path.join(repoPath, "docs/specs", "mason-testing.spec.md");
    await writeFile(specPath, await readFile(path.join(repoRoot, "tests/fixtures/mason-testing.spec.md"), "utf8"), "utf8");

    await expect(implementWithMason({ specPath })).rejects.toThrow("Mason requires a supported test runner (vitest or jest).");
  });

  it("rejects specs with no context bounds", async () => {
    const repoPath = await mkdtemp(path.join(os.tmpdir(), "axioma-mason-no-context-"));
    tempDirs.push(repoPath);
    await cp(path.join(repoRoot, "tests/fixtures/repos/ts-vitest-app"), repoPath, { recursive: true });
    await mkdir(path.join(repoPath, "docs/specs"), { recursive: true });
    const specPath = path.join(repoPath, "docs/specs", "mason-no-context.spec.md");
    await writeFile(specPath, await readFile(path.join(repoRoot, "tests/fixtures/mason-no-context.spec.md"), "utf8"), "utf8");

    await expect(implementWithMason({ specPath })).rejects.toThrow("Mason requires at least one context bound.");
  });

  it("updates marker blocks idempotently instead of duplicating them", async () => {
    const { repoPath, specPath } = await setupMasonRepo("ts-vitest-app", "justice-vitest-approved.spec.md");
    const spec = parseSpec(await readFile(specPath, "utf8"), specPath);
    const targetFilePath = path.join(repoPath, "src/greeting.ts");

    await applyMarkerImplementation(targetFilePath, spec);
    await applyMarkerImplementation(targetFilePath, spec);

    const content = await readFile(targetFilePath, "utf8");
    expect(content.match(/AXIOMA-MASON-START/g)?.length).toBe(1);
  });
});
