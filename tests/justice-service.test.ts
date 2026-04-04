import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { executeJusticeRunner, generateJusticeTests, renderJusticeTests } from "../src/core/justice-service/index.js";

const repoRoot = process.cwd();
const tempDirs: string[] = [];

async function setupJusticeRepo(repoFixture: string, specFixture: string): Promise<{ repoPath: string; specPath: string }> {
  const repoPath = await mkdtemp(path.join(os.tmpdir(), "axioma-justice-"));
  tempDirs.push(repoPath);
  await rm(repoPath, { recursive: true, force: true });
  await cp(path.join(repoRoot, "tests/fixtures/repos", repoFixture), repoPath, { recursive: true });
  await mkdir(path.join(repoPath, "docs/specs"), { recursive: true });
  const specPath = path.join(repoPath, "docs/specs", specFixture);
  await writeFile(specPath, await readFile(path.join(repoRoot, "tests/fixtures", specFixture), "utf8"), "utf8");
  return { repoPath, specPath };
}

describe("justice-service", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("generates red tests and updates the ledger for vitest projects", async () => {
    const { specPath } = await setupJusticeRepo("ts-vitest-app", "justice-vitest-approved.spec.md");
    const result = await generateJusticeTests({ specPath });

    expect(result.testsGenerated).toBe(2);
    expect(result.testFilePath).toContain("src/greeting.justice.test.js");
    expect(result.output).toContain("FAIL");
    expect(result.spec.frontmatter.status).toBe("testing");
    expect(result.spec.ledger.find((row) => row.agent === "The Justice")?.status).toBe("DONE");
    expect(result.spec.ledger.find((row) => row.agent === "The Mason")?.status).toBe("PENDING");
  });

  it("generates red tests and updates the ledger for jest projects", async () => {
    const { specPath } = await setupJusticeRepo("ts-jest-app", "justice-jest-approved.spec.md");
    const result = await generateJusticeTests({ specPath });

    expect(result.testsGenerated).toBe(1);
    expect(result.testFilePath).toContain("tests/auth-service.justice.test.js");
    expect(result.output).toContain("FAIL");
  });

  it("rejects specs that are not approved", async () => {
    const { specPath } = await setupJusticeRepo("ts-vitest-app", "justice-not-approved.spec.md");

    await expect(generateJusticeTests({ specPath })).rejects.toThrow('Justice requires an approved spec. Current status is "drafting".');
  });

  it("rejects projects with unsupported runners", async () => {
    const { specPath } = await setupJusticeRepo("ts-unknown-runner", "justice-vitest-approved.spec.md");

    await expect(generateJusticeTests({ specPath })).rejects.toThrow("Justice requires a supported test runner (vitest or jest).");
  });

  it("rejects specs with no acceptance criteria", async () => {
    const { specPath } = await setupJusticeRepo("ts-vitest-app", "justice-empty-ac.spec.md");

    await expect(generateJusticeTests({ specPath })).rejects.toThrow("Justice cannot generate tests for a spec with no acceptance criteria.");
  });

  it("raises an anomaly if generated tests pass before implementation", async () => {
    const { specPath } = await setupJusticeRepo("ts-vitest-app", "justice-vitest-approved.spec.md");

    await expect(
      generateJusticeTests({
        specPath,
        runnerOverride: async () => ({
          exitCode: 0,
          output: "Tests unexpectedly passed."
        })
      })
    ).rejects.toThrow("Justice anomaly: generated tests passed before implementation. Red step was not achieved.");
  });

  it("renders runner-specific test syntax", () => {
    const vitestContent = renderJusticeTests(
      "greeting",
      [{ id: "AC-01", text: "Given a case, when it runs, then it fails.", raw: "", checked: false }],
      "vitest"
    );
    const jestContent = renderJusticeTests(
      "auth-service",
      [{ id: "AC-01", text: "Given a case, when it runs, then it fails.", raw: "", checked: false }],
      "jest"
    );

    expect(vitestContent).toContain('from "vitest"');
    expect(jestContent).toContain('require("@jest/globals")');
  });

  it("can execute a passing vitest file directly", async () => {
    const repoPath = await mkdtemp(path.join(os.tmpdir(), "axioma-run-vitest-"));
    tempDirs.push(repoPath);
    await writeFile(path.join(repoPath, "package.json"), '{"name":"pass-vitest","private":true}', "utf8");
    await mkdir(path.join(repoPath, "src"), { recursive: true });
    const testFilePath = path.join(repoPath, "src/pass.justice.test.js");
    await writeFile(
      testFilePath,
      'import { describe, expect, test } from "vitest"; describe("pass", () => { test("works", () => { expect(true).toBe(true); }); });',
      "utf8"
    );

    const result = await executeJusticeRunner("vitest", repoPath, testFilePath);

    expect(result.exitCode).toBe(0);
    expect(result.output.toLowerCase()).toContain("passed");
  });

  it("can execute a passing jest file directly", async () => {
    const repoPath = await mkdtemp(path.join(os.tmpdir(), "axioma-run-jest-"));
    tempDirs.push(repoPath);
    await writeFile(path.join(repoPath, "package.json"), '{"name":"pass-jest","private":true}', "utf8");
    await writeFile(path.join(repoPath, "jest.config.cjs"), 'module.exports = { testEnvironment: "node" };', "utf8");
    await mkdir(path.join(repoPath, "tests"), { recursive: true });
    const testFilePath = path.join(repoPath, "tests/pass.justice.test.js");
    await writeFile(
      testFilePath,
      'const { describe, test, expect } = require("@jest/globals"); describe("pass", () => { test("works", () => { expect(true).toBe(true); }); });',
      "utf8"
    );

    const result = await executeJusticeRunner("jest", repoPath, testFilePath);

    expect(result.exitCode).toBe(0);
    expect(result.output.toLowerCase()).toContain("passed");
  });
});
