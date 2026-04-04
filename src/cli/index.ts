#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

import { auditSpecFile } from "../core/censor-service/index.js";
import { draftSpec } from "../core/draft-service/index.js";
import { generateJusticeTests } from "../core/justice-service/index.js";
import { updateLedgerRow } from "../core/ledger-service/index.js";
import { implementWithMason } from "../core/mason-service/index.js";
import { runAxiomaPipeline } from "../core/run-service/index.js";
import { parseSpec, serializeSpec, validateSpec } from "../core/spec-engine/index.js";
import { initializeWorkspace } from "../core/workspace/init.js";

interface OutputWriter {
  write(chunk: string): boolean;
}

type CommandResult = Promise<number>;

export async function runCli(argv: string[], stdout: OutputWriter = process.stdout, stderr: OutputWriter = process.stderr): Promise<number> {
  const [command, subcommand, ...rest] = argv;

  try {
    if (!command || command === "--help" || command === "-h") {
      printHelp(stdout);
      return 0;
    }

    if (command === "init") {
      return await handleInit(subcommand, stdout);
    }

    if (command === "spec" && subcommand === "validate") {
      return await handleSpecValidate(rest[0], stdout, stderr);
    }

    if (command === "draft") {
      return await handleDraft(subcommand, rest, stdout);
    }

    if (command === "audit") {
      return await handleAudit(subcommand, stdout, stderr);
    }

    if (command === "testgen") {
      return await handleTestgen(subcommand, stdout, stderr);
    }

    if (command === "implement") {
      return await handleImplement(subcommand, stdout, stderr);
    }

    if (command === "run") {
      return await handleRun(subcommand, stdout, stderr);
    }

    if (command === "status") {
      return await handleStatus(subcommand, stdout);
    }

    if (command === "ledger" && subcommand === "touch") {
      return await handleLedgerTouch(rest, stdout);
    }

    stderr.write(`Unknown command: ${[command, subcommand].filter(Boolean).join(" ")}\n`);
    printHelp(stderr);
    return 1;
  } catch (error) {
    stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

async function handleInit(targetPath: string | undefined, stdout: OutputWriter): CommandResult {
  const targetDir = targetPath ? path.resolve(targetPath) : process.cwd();
  const created = await initializeWorkspace(targetDir);
  stdout.write(`Initialized Axioma workspace in ${targetDir}\n`);
  stdout.write(`Directories: ${created.join(", ")}\n`);
  return 0;
}

async function handleSpecValidate(specPathArg: string | undefined, stdout: OutputWriter, stderr: OutputWriter): CommandResult {
  const specPath = ensureArgument(specPathArg, "Missing spec path for `axioma spec validate`.");
  const spec = await readSpec(specPath);
  const result = validateSpec(spec);

  if (!result.valid) {
    stderr.write(`Spec invalid: ${result.errors.join("; ")}\n`);
    return 1;
  }

  stdout.write(`Spec valid: ${spec.frontmatter.feature ?? path.basename(specPath)}\n`);
  if (result.warnings.length > 0) {
    stdout.write(`Warnings: ${result.warnings.join("; ")}\n`);
  }
  return 0;
}

async function handleStatus(specPathArg: string | undefined, stdout: OutputWriter): CommandResult {
  const specPath = ensureArgument(specPathArg, "Missing spec path for `axioma status`.");
  const spec = await readSpec(specPath);
  stdout.write(`Feature: ${spec.frontmatter.feature ?? "unknown"}\n`);
  stdout.write(`Status: ${spec.frontmatter.status}\n`);
  stdout.write("Ledger:\n");
  for (const row of spec.ledger) {
    stdout.write(`- ${row.agent}: ${row.status} (${row.timestamp}) ${row.notes}\n`);
  }
  return 0;
}

async function handleDraft(featureArg: string | undefined, args: string[], stdout: OutputWriter): CommandResult {
  const featureName = ensureArgument(featureArg, "Missing feature name for `axioma draft`.");
  const repoIndex = args.findIndex((value) => value === "--repo");
  const repoPath = repoIndex >= 0 ? ensureArgument(args[repoIndex + 1], "Missing repo path after `--repo`.") : process.cwd();
  const result = await draftSpec({
    repoPath,
    featureName
  });

  stdout.write(`Draft created: ${result.specPath}\n`);
  stdout.write(`Test runner: ${result.inspection.testRunner}\n`);
  stdout.write(`Context bounds: ${result.contextBounds.join(", ")}\n`);
  return 0;
}

async function handleAudit(specPathArg: string | undefined, stdout: OutputWriter, stderr: OutputWriter): CommandResult {
  const specPath = ensureArgument(specPathArg, "Missing spec path for `axioma audit`.");
  const result = await auditSpecFile({ specPath });

  if (!result.result.passed) {
    stderr.write(`Audit vetoed: ${result.result.reasons.join("; ")}\n`);
    return 1;
  }

  stdout.write(`Audit passed: ${result.spec.path ?? specPath}\n`);
  return 0;
}

async function handleTestgen(specPathArg: string | undefined, stdout: OutputWriter, stderr: OutputWriter): CommandResult {
  const specPath = ensureArgument(specPathArg, "Missing spec path for `axioma testgen`.");
  const result = await generateJusticeTests({ specPath });

  stdout.write(`Tests generated: ${result.testFilePath}\n`);
  stdout.write(`Red output:\n${result.output}\n`);
  stderr.write("");
  return 0;
}

async function handleImplement(specPathArg: string | undefined, stdout: OutputWriter, stderr: OutputWriter): CommandResult {
  const specPath = ensureArgument(specPathArg, "Missing spec path for `axioma implement`.");
  const result = await implementWithMason({ specPath });

  stdout.write(`Implementation completed in ${result.attempts} attempt(s)\n`);
  stdout.write(`Modified files: ${result.modifiedFiles.join(", ")}\n`);
  stdout.write(`Green output:\n${result.output}\n`);
  stderr.write("");
  return 0;
}

async function handleRun(specPathArg: string | undefined, stdout: OutputWriter, stderr: OutputWriter): CommandResult {
  const specPath = ensureArgument(specPathArg, "Missing spec path for `axioma run`.");
  const result = await runAxiomaPipeline(specPath);

  if (result.finalStatus === "vetoed") {
    stderr.write(`Pipeline stopped with veto. Steps: ${result.steps.join(" -> ")}\n`);
    return 1;
  }

  if (result.finalStatus === "failed") {
    stderr.write(`Pipeline failed. Steps: ${result.steps.join(" -> ")}\n`);
    return 1;
  }

  stdout.write(`Pipeline completed with status ${result.finalStatus}\n`);
  stdout.write(`Steps: ${result.steps.join(" -> ")}\n`);
  return 0;
}

async function handleLedgerTouch(args: string[], stdout: OutputWriter): CommandResult {
  const [specPathArg, agentArg, statusArg, timestampArg, ...noteParts] = args;
  const specPath = ensureArgument(specPathArg, "Missing spec path for `axioma ledger touch`.");
  const agent = ensureArgument(agentArg, "Missing agent for `axioma ledger touch`.");
  const status = ensureArgument(statusArg, "Missing status for `axioma ledger touch`.");
  const timestamp = ensureArgument(timestampArg, "Missing timestamp for `axioma ledger touch`.");
  const notes = noteParts.join(" ").trim();
  const spec = await readSpec(specPath);
  const updated = updateLedgerRow(spec, agent, {
    status: status as never,
    timestamp,
    notes
  });
  stdout.write(serializeSpec(updated));
  return 0;
}

async function readSpec(specPathArg: string) {
  const resolvedPath = path.resolve(specPathArg);
  return parseSpec(await readFile(resolvedPath, "utf8"), resolvedPath);
}

function ensureArgument(value: string | undefined, message: string): string {
  if (!value) {
    throw new Error(message);
  }

  return value;
}

function printHelp(stream: OutputWriter): void {
  stream.write("Usage:\n");
  stream.write("  axioma init [repo]\n");
  stream.write("  axioma draft <feature> [--repo <path>]\n");
  stream.write("  axioma audit <spec>\n");
  stream.write("  axioma testgen <spec>\n");
  stream.write("  axioma implement <spec>\n");
  stream.write("  axioma run <spec>\n");
  stream.write("  axioma spec validate <spec>\n");
  stream.write("  axioma status <spec>\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const exitCode = await runCli(process.argv.slice(2));
  process.exit(exitCode);
}
