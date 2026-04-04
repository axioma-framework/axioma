import path from "node:path";

import { describe, expect, it } from "vitest";

import { inspectProject, suggestContextBounds } from "../src/core/project-inspector/index.js";

const repoRoot = process.cwd();

describe("project-inspector", () => {
  it("detects vitest TypeScript repositories", async () => {
    const inspection = await inspectProject(path.join(repoRoot, "tests/fixtures/repos/ts-vitest-app"));

    expect(inspection.language).toBe("typescript");
    expect(inspection.packageManager).toBe("npm");
    expect(inspection.testRunner).toBe("vitest");
    expect(inspection.sourceRoots).toEqual(["src"]);
    expect(inspection.candidateFiles).toContain("src/greeting.ts");
  });

  it("detects jest projects in lib roots", async () => {
    const inspection = await inspectProject(path.join(repoRoot, "tests/fixtures/repos/ts-jest-app"));

    expect(inspection.packageManager).toBe("yarn");
    expect(inspection.testRunner).toBe("jest");
    expect(inspection.sourceRoots).toEqual(["lib"]);
    expect(inspection.testPattern).toBe("tests/**/*.test.ts");
  });

  it("ranks context bounds using feature tokens", async () => {
    const inspection = await inspectProject(path.join(repoRoot, "tests/fixtures/repos/ts-vitest-app"));
    const contextBounds = suggestContextBounds("greeting", inspection);

    expect(contextBounds[0]).toBe("src/greeting.ts");
  });

  it("supports projects with unknown package manager and unknown test runner", async () => {
    const inspection = await inspectProject(path.join(repoRoot, "tests/fixtures/repos/ts-unknown-runner"));

    expect(inspection.packageManager).toBe("unknown");
    expect(inspection.testRunner).toBe("unknown");
    expect(inspection.testPattern).toBe("src/**/*.test.ts");
  });

  it("fails when it cannot infer relevant context bounds", async () => {
    const inspection = await inspectProject(path.join(repoRoot, "tests/fixtures/repos/ts-vitest-app"));

    expect(() => suggestContextBounds("payments", inspection)).toThrow(
      'Could not infer context bounds for feature "payments" with enough confidence.'
    );
  });

  it("fails when the feature name has no usable tokens", async () => {
    const inspection = await inspectProject(path.join(repoRoot, "tests/fixtures/repos/ts-vitest-app"));

    expect(() => suggestContextBounds("a", inspection)).toThrow("Feature name must contain at least one alphanumeric token.");
  });

  it("fails when package.json is missing", async () => {
    await expect(inspectProject(path.join(repoRoot, "tests/fixtures/repos/missing-package"))).rejects.toThrow(
      "Project inspection failed: package.json not found or invalid"
    );
  });

  it("fails when no supported source roots exist", async () => {
    await expect(inspectProject(path.join(repoRoot, "tests/fixtures/repos/no-source-roots"))).rejects.toThrow(
      "Project inspection failed: no supported source roots were found"
    );
  });

  it("fails when supported roots exist but no TypeScript source files are present", async () => {
    await expect(inspectProject(path.join(repoRoot, "tests/fixtures/repos/no-typescript-files"))).rejects.toThrow(
      "Project inspection failed: no TypeScript source files were found in supported source roots."
    );
  });
});
