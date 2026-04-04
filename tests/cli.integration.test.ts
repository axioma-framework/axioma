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
});
