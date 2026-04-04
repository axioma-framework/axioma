import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { inspectProject } from "../project-inspector/index.js";
import { JUSTICE_MARKER_EXPORT, executeJusticeRunner, resolveJusticeTestFilePath } from "../justice-service/index.js";
import { updateLedgerRow } from "../ledger-service/index.js";
import { parseSpec, serializeSpec } from "../spec-engine/index.js";
import type { AxiomaSpec } from "../types/spec.js";

const MASON_MARKER_START = "// AXIOMA-MASON-START";
const MASON_MARKER_END = "// AXIOMA-MASON-END";

interface ImplementWithMasonOptions {
  specPath: string;
  repoPath?: string;
  maxAttempts?: number;
  runnerOverride?: (testRunner: "vitest" | "jest", repoPath: string, testFilePath: string) => Promise<{ exitCode: number; output: string }>;
}

export interface MasonResult {
  spec: AxiomaSpec;
  modifiedFiles: string[];
  attempts: number;
  output: string;
}

interface FileSnapshot {
  exists: boolean;
  content: string;
}

export async function implementWithMason(options: ImplementWithMasonOptions): Promise<MasonResult> {
  const specPath = path.resolve(options.specPath);
  const repoPath = path.resolve(options.repoPath ?? path.dirname(path.dirname(path.dirname(specPath))));
  const rawSpec = await readFile(specPath, "utf8");
  const spec = parseSpec(rawSpec, specPath);
  const inspection = await inspectProject(repoPath);

  if (spec.frontmatter.status !== "testing") {
    throw new Error(`Mason requires a spec in testing status. Current status is "${spec.frontmatter.status}".`);
  }

  if (inspection.testRunner === "unknown") {
    throw new Error("Mason requires a supported test runner (vitest or jest).");
  }

  const primaryContextBound = spec.frontmatter.context_bounds[0];
  if (!primaryContextBound) {
    throw new Error("Mason requires at least one context bound.");
  }

  const targetFilePath = path.join(repoPath, primaryContextBound);
  const testFilePath = resolveJusticeTestFilePath(repoPath, spec, inspection.testPattern);
  const snapshot = await snapshotFiles([targetFilePath, testFilePath]);
  const maxAttempts = options.maxAttempts ?? 3;
  let lastOutput = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    await applyMarkerImplementation(targetFilePath, spec);
    const runResult = await (options.runnerOverride ?? executeJusticeRunner)(inspection.testRunner, repoPath, testFilePath);
    lastOutput = runResult.output;

    if (runResult.exitCode === 0) {
      const completedSpec = updateLedgerRow(
        spec,
        "The Mason",
        {
          status: "DONE",
          timestamp: today(),
          notes: `All ${spec.acceptanceCriteria.length} tests passing. Green Step complete on attempt ${attempt}.`
        },
        "done"
      );
      await writeFile(specPath, serializeSpec(completedSpec), "utf8");

      return {
        spec: completedSpec,
        modifiedFiles: [primaryContextBound],
        attempts: attempt,
        output: runResult.output
      };
    }
  }

  await restoreFiles(snapshot);
  const failedSpec = updateLedgerRow(
    spec,
    "The Mason",
    {
      status: "FAILED",
      timestamp: today(),
      notes: `Failed after ${maxAttempts} attempts. ${lastOutput}`.trim()
    },
    "failed"
  );
  await writeFile(specPath, serializeSpec(failedSpec), "utf8");

  throw new Error(`Mason failed after ${maxAttempts} attempts. ${lastOutput}`.trim());
}

export async function applyMarkerImplementation(targetFilePath: string, spec: AxiomaSpec): Promise<void> {
  await mkdir(path.dirname(targetFilePath), { recursive: true });
  const existing = await readFile(targetFilePath, "utf8");
  const markerEntries = spec.acceptanceCriteria.map((criterion) => `  ${JSON.stringify(criterion.id)}: true`).join(",\n");
  const markerBlock = `${MASON_MARKER_START}
export const ${JUSTICE_MARKER_EXPORT} = {
${markerEntries}
} as const;
${MASON_MARKER_END}`;

  await writeFile(targetFilePath, upsertMarkerBlock(existing, markerBlock), "utf8");
}

function upsertMarkerBlock(content: string, markerBlock: string): string {
  const startIndex = content.indexOf(MASON_MARKER_START);
  const endIndex = content.indexOf(MASON_MARKER_END);

  if (startIndex >= 0 && endIndex >= 0) {
    const endMarkerOffset = endIndex + MASON_MARKER_END.length;
    return `${content.slice(0, startIndex)}${markerBlock}${content.slice(endMarkerOffset)}`;
  }

  const suffix = content.endsWith("\n") ? "" : "\n";
  return `${content}${suffix}\n${markerBlock}\n`;
}

async function snapshotFiles(paths: string[]): Promise<Map<string, FileSnapshot>> {
  const snapshot = new Map<string, FileSnapshot>();

  for (const filePath of paths) {
    try {
      snapshot.set(filePath, {
        exists: true,
        content: await readFile(filePath, "utf8")
      });
    } catch {
      snapshot.set(filePath, {
        exists: false,
        content: ""
      });
    }
  }

  return snapshot;
}

async function restoreFiles(snapshot: Map<string, FileSnapshot>): Promise<void> {
  for (const [filePath, state] of snapshot.entries()) {
    if (state.exists) {
      await writeFile(filePath, state.content, "utf8");
      continue;
    }

    await rm(filePath, { force: true });
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
