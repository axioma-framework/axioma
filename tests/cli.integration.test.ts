import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runCli } from "../src/cli/index.js";
import { parseSpec } from "../src/index.js";

class MemoryStream {
  private chunks: string[] = [];

  write(chunk: string): boolean {
    this.chunks.push(chunk);
    return true;
  }

  toString(): string {
    return this.chunks.join("");
  }
}

const tempDirs: string[] = [];
const repoRoot = process.cwd();

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "axioma-"));
  tempDirs.push(dir);
  return dir;
}

describe("cli integration", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("init creates the base workspace and is idempotent", async () => {
    const dir = await createTempDir();
    const stdout = new MemoryStream();
    const stderr = new MemoryStream();

    expect(await runCli(["init", dir], stdout as never, stderr as never)).toBe(0);
    expect(await runCli(["init", dir], stdout as never, stderr as never)).toBe(0);

    await expect(access(path.join(dir, ".axioma"))).resolves.toBeUndefined();
    await expect(access(path.join(dir, "docs/specs"))).resolves.toBeUndefined();
    await expect(access(path.join(dir, "docs/fixtures"))).resolves.toBeUndefined();
    expect(stdout.toString()).toContain("Initialized Axioma workspace");
  });

  it("spec validate succeeds for the example spec", async () => {
    const stdout = new MemoryStream();
    const stderr = new MemoryStream();
    const exitCode = await runCli(["spec", "validate", path.join(repoRoot, "docs/specs/example.spec.md")], stdout as never, stderr as never);

    expect(exitCode).toBe(0);
    expect(stdout.toString()).toContain("Spec valid: add-greeting");
  });

  it("spec validate prints warnings for valid specs with omitted fixtures", async () => {
    const stdout = new MemoryStream();
    const stderr = new MemoryStream();
    const exitCode = await runCli(["spec", "validate", path.join(repoRoot, "tests/fixtures/valid-with-warning.spec.md")], stdout as never, stderr as never);

    expect(exitCode).toBe(0);
    expect(stdout.toString()).toContain("Spec valid: warning-only");
    expect(stdout.toString()).toContain("Warnings: Spec does not declare a Fixtures section.");
    expect(stderr.toString()).toBe("");
  });

  it("status reports current spec state", async () => {
    const stdout = new MemoryStream();
    const stderr = new MemoryStream();
    const exitCode = await runCli(["status", path.join(repoRoot, "docs/specs/example.spec.md")], stdout as never, stderr as never);

    expect(exitCode).toBe(0);
    expect(stdout.toString()).toContain("Status: done");
    expect(stdout.toString()).toContain("- The Mason: DONE");
  });

  it("ledger touch preserves unrelated content", async () => {
    const dir = await createTempDir();
    const source = await readFile(path.join(repoRoot, "docs/specs/example.spec.md"), "utf8");
    const target = path.join(dir, "example.spec.md");
    await writeFile(target, source, "utf8");

    const stdout = new MemoryStream();
    const stderr = new MemoryStream();
    const exitCode = await runCli(
      ["ledger", "touch", target, "The Justice", "DONE", "2026-04-04", "Red", "step", "validated"],
      stdout as never,
      stderr as never
    );

    expect(exitCode).toBe(0);
    expect(stdout.toString()).toContain("## Intent");
    expect(stdout.toString()).toContain("| The Justice | DONE | 2026-04-04 | Red step validated |");
    expect(stdout.toString()).toContain("## Contract");
  });

  it("invalid specs fail with repeatable explicit errors", async () => {
    const stdout = new MemoryStream();
    const stderr = new MemoryStream();
    const specPath = path.join(repoRoot, "tests/fixtures/invalid-missing-frontmatter.spec.md");

    expect(await runCli(["spec", "validate", specPath], stdout as never, stderr as never)).toBe(1);
    expect(await runCli(["spec", "validate", specPath], stdout as never, stderr as never)).toBe(1);
    expect(stderr.toString()).toContain("Spec is missing YAML frontmatter.");
  });

  it("returns usage information on unknown commands", async () => {
    const stdout = new MemoryStream();
    const stderr = new MemoryStream();

    const exitCode = await runCli(["unknown"], stdout as never, stderr as never);

    expect(exitCode).toBe(1);
    expect(stderr.toString()).toContain("Unknown command: unknown");
    expect(stderr.toString()).toContain("Usage:");
  });

  it("fails explicitly when status is called without a spec path", async () => {
    const stdout = new MemoryStream();
    const stderr = new MemoryStream();

    const exitCode = await runCli(["status"], stdout as never, stderr as never);

    expect(exitCode).toBe(1);
    expect(stderr.toString()).toContain("Missing spec path for `axioma status`.");
  });

  it("prints help and exits cleanly", async () => {
    const stdout = new MemoryStream();
    const stderr = new MemoryStream();

    const exitCode = await runCli(["--help"], stdout as never, stderr as never);

    expect(exitCode).toBe(0);
    expect(stdout.toString()).toContain("Usage:");
    expect(stderr.toString()).toBe("");
  });

  it("surfaces validation warnings for specs without fixtures", async () => {
    const stdout = new MemoryStream();
    const stderr = new MemoryStream();
    const exitCode = await runCli(["spec", "validate", path.join(repoRoot, "tests/fixtures/invalid-contract.spec.md")], stdout as never, stderr as never);

    expect(exitCode).toBe(1);
    expect(stderr.toString()).toContain("Acceptance criterion AC-01 must use Given/When/Then format.");
  });

  it("fails explicitly when ledger touch is called without required arguments", async () => {
    const stdout = new MemoryStream();
    const stderr = new MemoryStream();

    const exitCode = await runCli(["ledger", "touch"], stdout as never, stderr as never);

    expect(exitCode).toBe(1);
    expect(stderr.toString()).toContain("Missing spec path for `axioma ledger touch`.");
  });

  it("exports the public parser entrypoint through the package barrel", async () => {
    const raw = await readFile(path.join(repoRoot, "docs/specs/example.spec.md"), "utf8");
    const spec = parseSpec(raw);

    expect(spec.frontmatter.feature).toBe("add-greeting");
  });

  it("creates a draft spec from an inspected repository", async () => {
    const fixtureRepo = path.join(repoRoot, "tests/fixtures/repos/ts-vitest-app");
    const dir = await createTempDir();
    await import("node:fs/promises").then(({ cp, mkdir }) =>
      Promise.all([
        cp(fixtureRepo, dir, { recursive: true }),
        mkdir(path.join(dir, "docs/specs"), { recursive: true })
      ])
    );

    const stdout = new MemoryStream();
    const stderr = new MemoryStream();
    const exitCode = await runCli(["draft", "greeting", "--repo", dir], stdout as never, stderr as never);

    expect(exitCode).toBe(0);
    expect(stdout.toString()).toContain("Draft created:");
    expect(stdout.toString()).toContain("Test runner: vitest");
    expect(stdout.toString()).toContain("Context bounds: src/greeting.ts");
    expect(await readFile(path.join(dir, "docs/specs/greeting.spec.md"), "utf8")).toContain('feature: "greeting"');
  });

  it("fails explicitly when draft is missing a feature name", async () => {
    const stdout = new MemoryStream();
    const stderr = new MemoryStream();

    const exitCode = await runCli(["draft"], stdout as never, stderr as never);

    expect(exitCode).toBe(1);
    expect(stderr.toString()).toContain("Missing feature name for `axioma draft`.");
  });

  it("fails explicitly when draft --repo has no value", async () => {
    const stdout = new MemoryStream();
    const stderr = new MemoryStream();

    const exitCode = await runCli(["draft", "greeting", "--repo"], stdout as never, stderr as never);

    expect(exitCode).toBe(1);
    expect(stderr.toString()).toContain("Missing repo path after `--repo`.");
  });

  it("audits a valid spec and updates it to approved", async () => {
    const dir = await createTempDir();
    const specPath = path.join(dir, "audit-pass.spec.md");
    const source = await readFile(path.join(repoRoot, "tests/fixtures/audit-pass.spec.md"), "utf8");
    await writeFile(specPath, source, "utf8");

    const stdout = new MemoryStream();
    const stderr = new MemoryStream();
    const exitCode = await runCli(["audit", specPath], stdout as never, stderr as never);

    expect(exitCode).toBe(0);
    expect(stdout.toString()).toContain("Audit passed:");
    expect((await readFile(specPath, "utf8"))).toContain("status: approved");
  });

  it("audits an invalid spec and returns a veto", async () => {
    const dir = await createTempDir();
    const specPath = path.join(dir, "audit-subjective.spec.md");
    const source = await readFile(path.join(repoRoot, "tests/fixtures/audit-subjective.spec.md"), "utf8");
    await writeFile(specPath, source, "utf8");

    const stdout = new MemoryStream();
    const stderr = new MemoryStream();
    const exitCode = await runCli(["audit", specPath], stdout as never, stderr as never);

    expect(exitCode).toBe(1);
    expect(stderr.toString()).toContain("Audit vetoed:");
    expect((await readFile(specPath, "utf8"))).toContain("status: vetoed");
  });

  it("fails explicitly when audit is called without a spec path", async () => {
    const stdout = new MemoryStream();
    const stderr = new MemoryStream();

    const exitCode = await runCli(["audit"], stdout as never, stderr as never);

    expect(exitCode).toBe(1);
    expect(stderr.toString()).toContain("Missing spec path for `axioma audit`.");
  });

  it("generates red tests from an approved spec", async () => {
    const fixtureRepo = path.join(repoRoot, "tests/fixtures/repos/ts-vitest-app");
    const dir = await createTempDir();
    await import("node:fs/promises").then(async ({ cp, mkdir }) => {
      await cp(fixtureRepo, dir, { recursive: true });
      await mkdir(path.join(dir, "docs/specs"), { recursive: true });
      await writeFile(
        path.join(dir, "docs/specs/justice-vitest-approved.spec.md"),
        await readFile(path.join(repoRoot, "tests/fixtures/justice-vitest-approved.spec.md"), "utf8"),
        "utf8"
      );
    });

    const stdout = new MemoryStream();
    const stderr = new MemoryStream();
    const exitCode = await runCli(["testgen", path.join(dir, "docs/specs/justice-vitest-approved.spec.md")], stdout as never, stderr as never);

    expect(exitCode).toBe(0);
    expect(stdout.toString()).toContain("Tests generated:");
    expect(stdout.toString()).toContain("Red output:");
    expect((await readFile(path.join(dir, "docs/specs/justice-vitest-approved.spec.md"), "utf8"))).toContain("status: testing");
  });

  it("fails explicitly when testgen is called without a spec path", async () => {
    const stdout = new MemoryStream();
    const stderr = new MemoryStream();

    const exitCode = await runCli(["testgen"], stdout as never, stderr as never);

    expect(exitCode).toBe(1);
    expect(stderr.toString()).toContain("Missing spec path for `axioma testgen`.");
  });

  it("implements a generated red suite and marks the spec done", async () => {
    const fixtureRepo = path.join(repoRoot, "tests/fixtures/repos/ts-vitest-app");
    const dir = await createTempDir();
    await import("node:fs/promises").then(async ({ cp, mkdir }) => {
      await cp(fixtureRepo, dir, { recursive: true });
      await mkdir(path.join(dir, "docs/specs"), { recursive: true });
      await writeFile(
        path.join(dir, "docs/specs/justice-vitest-approved.spec.md"),
        await readFile(path.join(repoRoot, "tests/fixtures/justice-vitest-approved.spec.md"), "utf8"),
        "utf8"
      );
    });

    await runCli(["testgen", path.join(dir, "docs/specs/justice-vitest-approved.spec.md")], new MemoryStream() as never, new MemoryStream() as never);

    const stdout = new MemoryStream();
    const stderr = new MemoryStream();
    const exitCode = await runCli(["implement", path.join(dir, "docs/specs/justice-vitest-approved.spec.md")], stdout as never, stderr as never);

    expect(exitCode).toBe(0);
    expect(stdout.toString()).toContain("Implementation completed in 1 attempt(s)");
    expect((await readFile(path.join(dir, "docs/specs/justice-vitest-approved.spec.md"), "utf8"))).toContain("status: done");
  });

  it("fails explicitly when implement is called without a spec path", async () => {
    const stdout = new MemoryStream();
    const stderr = new MemoryStream();

    const exitCode = await runCli(["implement"], stdout as never, stderr as never);

    expect(exitCode).toBe(1);
    expect(stderr.toString()).toContain("Missing spec path for `axioma implement`.");
  });

  it("runs the whole pipeline to done from an approved spec", async () => {
    const fixtureRepo = path.join(repoRoot, "tests/fixtures/repos/ts-vitest-app");
    const dir = await createTempDir();
    await import("node:fs/promises").then(async ({ cp, mkdir }) => {
      await cp(fixtureRepo, dir, { recursive: true });
      await mkdir(path.join(dir, "docs/specs"), { recursive: true });
      await writeFile(
        path.join(dir, "docs/specs/justice-vitest-approved.spec.md"),
        await readFile(path.join(repoRoot, "tests/fixtures/justice-vitest-approved.spec.md"), "utf8"),
        "utf8"
      );
    });

    const stdout = new MemoryStream();
    const stderr = new MemoryStream();
    const exitCode = await runCli(["run", path.join(dir, "docs/specs/justice-vitest-approved.spec.md")], stdout as never, stderr as never);

    expect(exitCode).toBe(0);
    expect(stdout.toString()).toContain("Pipeline completed with status done");
    expect(stdout.toString()).toContain("testgen:2");
    expect(stdout.toString()).toContain("implement:1");
  });

  it("stops the pipeline when audit vetoes the spec", async () => {
    const dir = await createTempDir();
    const specPath = path.join(dir, "audit-subjective.spec.md");
    await writeFile(specPath, await readFile(path.join(repoRoot, "tests/fixtures/audit-subjective.spec.md"), "utf8"), "utf8");

    const stdout = new MemoryStream();
    const stderr = new MemoryStream();
    const exitCode = await runCli(["run", specPath], stdout as never, stderr as never);

    expect(exitCode).toBe(1);
    expect(stderr.toString()).toContain("Pipeline stopped with veto.");
  });

  it("fails explicitly when run is called without a spec path", async () => {
    const stdout = new MemoryStream();
    const stderr = new MemoryStream();

    const exitCode = await runCli(["run"], stdout as never, stderr as never);

    expect(exitCode).toBe(1);
    expect(stderr.toString()).toContain("Missing spec path for `axioma run`.");
  });
});
