import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { draftSpec, slugifyFeatureName } from "../src/core/draft-service/index.js";

const repoRoot = process.cwd();
const tempDirs: string[] = [];

async function copyFixtureRepo(name: string): Promise<string> {
  const source = path.join(repoRoot, "tests/fixtures/repos", name);
  const target = await mkdtemp(path.join(os.tmpdir(), `axioma-${name}-`));
  tempDirs.push(target);
  await rm(target, { recursive: true, force: true });
  await import("node:fs/promises").then(({ cp }) => cp(source, target, { recursive: true }));
  return target;
}

describe("draft-service", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("slugifies feature names consistently", () => {
    expect(slugifyFeatureName("Greeting Flow")).toBe("greeting-flow");
  });

  it("creates a draft spec for a detected project", async () => {
    const repoPath = await copyFixtureRepo("ts-vitest-app");
    await import("node:fs/promises").then(({ mkdir }) => mkdir(path.join(repoPath, "docs/specs"), { recursive: true }));

    const result = await draftSpec({
      repoPath,
      featureName: "greeting"
    });

    const specContents = await readFile(result.specPath, "utf8");
    expect(result.inspection.testRunner).toBe("vitest");
    expect(result.contextBounds).toEqual(["src/greeting.ts"]);
    expect(specContents).toContain('feature: "greeting"');
    expect(specContents).toContain('  - "src/greeting.ts"');
    expect(specContents).toContain("| The Censor | PENDING | - | Awaiting audit. |");
  });

  it("fails when the feature name cannot be turned into a valid slug", () => {
    expect(() => slugifyFeatureName("!!!")).toThrow("Feature name must contain at least one alphanumeric character.");
  });
});
