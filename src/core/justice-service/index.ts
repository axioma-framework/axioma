import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { inspectProject } from "../project-inspector/index.js";
import { updateLedgerRow } from "../ledger-service/index.js";
import { parseSpec, serializeSpec } from "../spec-engine/index.js";
import type { AcceptanceCriterion, AxiomaSpec } from "../types/spec.js";

const execFileAsync = promisify(execFile);
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

interface GenerateJusticeTestsOptions {
  specPath: string;
  repoPath?: string;
  runnerOverride?: (testRunner: "vitest" | "jest", repoPath: string, testFilePath: string) => Promise<{ exitCode: number; output: string }>;
}

export interface JusticeResult {
  spec: AxiomaSpec;
  testFilePath: string;
  testsGenerated: number;
  output: string;
}

export const JUSTICE_MARKER_EXPORT = "__axiomaJusticeMarkers";

export async function generateJusticeTests(options: GenerateJusticeTestsOptions): Promise<JusticeResult> {
  const specPath = path.resolve(options.specPath);
  const repoPath = path.resolve(options.repoPath ?? path.dirname(path.dirname(path.dirname(specPath))));
  const rawSpec = await readFile(specPath, "utf8");
  const spec = parseSpec(rawSpec, specPath);
  const inspection = await inspectProject(repoPath);

  if (spec.frontmatter.status !== "approved") {
    throw new Error(`Justice requires an approved spec. Current status is "${spec.frontmatter.status}".`);
  }

  if (inspection.testRunner === "unknown") {
    throw new Error("Justice requires a supported test runner (vitest or jest).");
  }

  const testFilePath = resolveTestFilePath(repoPath, spec, inspection.testPattern);
  await mkdir(path.dirname(testFilePath), { recursive: true });
  const testContent = renderJusticeTests(
    spec.frontmatter.feature ?? "feature",
    spec.acceptanceCriteria,
    inspection.testRunner,
    buildContextImportPath(repoPath, testFilePath, spec.frontmatter.context_bounds[0])
  );
  await writeFile(testFilePath, testContent, "utf8");

  const runResult = await (options.runnerOverride ?? executeJusticeRunner)(inspection.testRunner, repoPath, testFilePath);
  if (runResult.exitCode === 0) {
    throw new Error("Justice anomaly: generated tests passed before implementation. Red step was not achieved.");
  }

  const withJustice = updateLedgerRow(
    spec,
    "The Justice",
    {
      status: "DONE",
      timestamp: today(),
      notes: `${spec.acceptanceCriteria.length} tests generated. All failing (Red Step confirmed).`
    },
    "testing"
  );
  const updatedSpec = updateLedgerRow(withJustice, "The Mason", {
    status: "PENDING",
    timestamp: "-",
    notes: "Ready for implementation."
  });

  await writeFile(specPath, serializeSpec(updatedSpec), "utf8");

  return {
    spec: updatedSpec,
    testFilePath,
    testsGenerated: spec.acceptanceCriteria.length,
    output: runResult.output
  };
}

function resolveTestFilePath(repoPath: string, spec: AxiomaSpec, testPattern: string): string {
  const featureName = spec.frontmatter.feature ?? "feature";
  const sourceRoot = testPattern.startsWith("src/") ? "src" : "tests";
  const fileName = `${featureName}.justice.test.js`;
  return path.join(repoPath, sourceRoot, fileName);
}

export function resolveJusticeTestFilePath(repoPath: string, spec: AxiomaSpec, testPattern: string): string {
  return resolveTestFilePath(repoPath, spec, testPattern);
}

function buildContextImportPath(repoPath: string, testFilePath: string, contextBound: string | undefined): string {
  if (!contextBound) {
    throw new Error("Justice requires at least one context bound.");
  }

  const absoluteTarget = path.join(repoPath, contextBound);
  const relativePath = path.relative(path.dirname(testFilePath), absoluteTarget).replaceAll(path.sep, "/");
  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
}

function buildCriterionAssertion(
  criterion: AcceptanceCriterion,
  importPath: string,
  testRunner: "vitest" | "jest"
): string {
  if (testRunner === "vitest") {
    return `test(${JSON.stringify(`${criterion.id}: ${criterion.text}`)}, async () => {
  const module = await import(${JSON.stringify(importPath)});
  expect(module.${JUSTICE_MARKER_EXPORT}?.[${JSON.stringify(criterion.id)}]).toBe(true);
});`;
  }

  return `test(${JSON.stringify(`${criterion.id}: ${criterion.text}`)}, () => {
  const module = require(${JSON.stringify(importPath)});
  expect(module.${JUSTICE_MARKER_EXPORT}?.[${JSON.stringify(criterion.id)}]).toBe(true);
});`;
}

export function renderJusticeTests(
  featureName: string,
  criteria: AcceptanceCriterion[],
  testRunner: "vitest" | "jest",
  importPath: string
): string {
  if (criteria.length === 0) {
    throw new Error("Justice cannot generate tests for a spec with no acceptance criteria.");
  }

  const importLine =
    testRunner === "vitest"
      ? 'import { describe, expect, test } from "vitest";'
      : 'const { describe, test, expect } = require("@jest/globals");';

  const tests = criteria.map((criterion) => buildCriterionAssertion(criterion, importPath, testRunner)).join("\n\n");

  return `${importLine}

describe(${JSON.stringify(`Justice red tests for ${featureName}`)}, () => {
${indentBlock(tests, 2)}
});
`;
}

function indentBlock(input: string, spaces: number): string {
  const prefix = " ".repeat(spaces);
  return input
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
}

export async function executeJusticeRunner(
  testRunner: "vitest" | "jest",
  repoPath: string,
  testFilePath: string
): Promise<{ exitCode: number; output: string }> {
  if (testRunner === "vitest") {
    return runVitest(repoPath, testFilePath);
  }

  return runJest(repoPath, testFilePath);
}

async function runVitest(repoPath: string, testFilePath: string): Promise<{ exitCode: number; output: string }> {
  const vitestEntrypoint = path.join(REPO_ROOT, "node_modules/vitest/vitest.mjs");

  try {
    const result = await execFileAsync(process.execPath, [vitestEntrypoint, "run", path.relative(repoPath, testFilePath), "--root", repoPath], {
      cwd: REPO_ROOT
    });
    return {
      exitCode: 0,
      output: `${result.stdout}\n${result.stderr}`.trim()
    };
  } catch (error) {
    return {
      exitCode: (error as { code?: number }).code ?? 1,
      output: `${String((error as { stdout?: string }).stdout ?? "")}\n${String((error as { stderr?: string }).stderr ?? "")}`.trim()
    };
  }
}

async function runJest(repoPath: string, testFilePath: string): Promise<{ exitCode: number; output: string }> {
  const jestEntrypoint = path.join(REPO_ROOT, "node_modules/jest/bin/jest.js");
  const relativeTestPath = path.relative(repoPath, testFilePath);
  const nodePath = [path.join(REPO_ROOT, "node_modules"), process.env.NODE_PATH].filter(Boolean).join(path.delimiter);

  try {
    const result = await execFileAsync(
      process.execPath,
      [jestEntrypoint, "--runTestsByPath", relativeTestPath, "--config", path.join(repoPath, "jest.config.cjs")],
      {
        cwd: repoPath,
        env: {
          ...process.env,
          NODE_PATH: nodePath
        }
      }
    );
    return {
      exitCode: 0,
      output: `${result.stdout}\n${result.stderr}`.trim()
    };
  } catch (error) {
    return {
      exitCode: (error as { code?: number }).code ?? 1,
      output: `${String((error as { stdout?: string }).stdout ?? "")}\n${String((error as { stderr?: string }).stderr ?? "")}`.trim()
    };
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
