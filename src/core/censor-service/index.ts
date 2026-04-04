import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { updateLedgerRow } from "../ledger-service/index.js";
import { parseSpec, serializeSpec, validateSpec } from "../spec-engine/index.js";
import type { AcceptanceCriterion, AuditResult, AxiomaSpec } from "../types/spec.js";

const BANNED_WORDS = [
  "fast",
  "slow",
  "user-friendly",
  "optimized",
  "efficient",
  "seamless",
  "intuitive",
  "performant",
  "clean",
  "simple",
  "good",
  "better",
  "improved"
] as const;

const AMBIGUOUS_PHRASES = ["should work", "might be", "or similar", "etc.", "tbd"] as const;

interface AuditSpecOptions {
  specPath: string;
  repoPath?: string;
}

export async function auditSpecFile(options: AuditSpecOptions): Promise<{ spec: AxiomaSpec; result: AuditResult }> {
  const specPath = path.resolve(options.specPath);
  const repoPath = path.resolve(options.repoPath ?? path.dirname(path.dirname(path.dirname(specPath))));
  const raw = await readFile(specPath, "utf8");
  const spec = parseSpec(raw, specPath);
  const result = await auditSpec(spec, repoPath);
  const updatedSpec = applyAuditOutcome(spec, result);

  await writeFile(specPath, serializeSpec(updatedSpec), "utf8");

  return {
    spec: updatedSpec,
    result
  };
}

export async function auditSpec(spec: AxiomaSpec, repoPath: string): Promise<AuditResult> {
  const reasons: string[] = [];
  const validation = validateSpec(spec);

  if (!validation.valid) {
    reasons.push(...validation.errors.map((error) => `Spec validation failed: ${error}`));
  }

  const domains = inferDomains(spec.frontmatter.context_bounds);
  if (domains.size > 3) {
    reasons.push(`Invariant 1 failed: context_bounds span ${domains.size} domains (${[...domains].join(", ")}).`);
  }

  for (const criterion of spec.acceptanceCriteria) {
    const subjectiveWord = findSubjectiveWord(criterion);
    if (subjectiveWord) {
      reasons.push(`Invariant 2 failed in ${criterion.id}: banned word "${subjectiveWord}" found.`);
    }

    const ambiguity = findAmbiguity(criterion, spec.frontmatter.context_bounds);
    if (ambiguity) {
      reasons.push(`Invariant 3 failed in ${criterion.id}: ${ambiguity}`);
    }

    const compoundAssertion = findCompoundAssertion(criterion);
    if (compoundAssertion) {
      reasons.push(`Invariant 4 failed in ${criterion.id}: ${compoundAssertion}`);
    }
  }

  for (const fixture of extractFixtureReferences(spec.sections.Fixtures ?? "")) {
    const fixturePath = path.join(repoPath, "docs/fixtures", fixture);
    if (!(await fileExists(fixturePath))) {
      reasons.push(`Invariant 3 failed: referenced fixture "${fixture}" does not exist in docs/fixtures.`);
    }
  }

  return {
    passed: reasons.length === 0,
    reasons
  };
}

function applyAuditOutcome(spec: AxiomaSpec, result: AuditResult): AxiomaSpec {
  if (result.passed) {
    const withCensor = updateLedgerRow(
      spec,
      "The Censor",
      {
        status: "DONE",
        timestamp: today(),
        notes: "PASS"
      },
      "approved"
    );

    return updateLedgerRow(withCensor, "The Justice", {
      status: "PENDING",
      timestamp: "-",
      notes: "Ready for test generation."
    });
  }

  return updateLedgerRow(
    spec,
    "The Censor",
    {
      status: "VETOED",
      timestamp: today(),
      notes: result.reasons.join(" | ")
    },
    "vetoed"
  );
}

function inferDomains(contextBounds: string[]): Set<string> {
  return new Set(
    contextBounds.map((entry) => {
      const parts = entry.split("/").filter(Boolean);
      return parts[1] ?? parts[0] ?? entry;
    })
  );
}

function findSubjectiveWord(criterion: AcceptanceCriterion): string | null {
  const normalized = criterion.text.toLowerCase();
  return BANNED_WORDS.find((word) => normalized.includes(word)) ?? null;
}

function findAmbiguity(criterion: AcceptanceCriterion, contextBounds: string[]): string | null {
  const normalized = criterion.text.toLowerCase();

  for (const phrase of AMBIGUOUS_PHRASES) {
    if (normalized.includes(phrase)) {
      return `ambiguous phrase "${phrase}" found`;
    }
  }

  const referencedFiles = criterion.text.match(/[A-Za-z0-9_./-]+\.(ts|tsx|js|jsx|json|md)/g) ?? [];
  for (const referencedFile of referencedFiles) {
    if (!contextBounds.includes(referencedFile)) {
      return `referenced file "${referencedFile}" is outside context_bounds`;
    }
  }

  return null;
}

function findCompoundAssertion(criterion: AcceptanceCriterion): string | null {
  const lower = criterion.text.toLowerCase();
  const thenIndex = lower.indexOf("then ");

  if (thenIndex === -1) {
    return null;
  }

  const thenClause = lower.slice(thenIndex + 5);
  if (thenClause.includes(" and ")) {
    return 'the "then" clause contains multiple assertions joined by "and"';
  }

  return null;
}

function extractFixtureReferences(fixturesSection: string): string[] {
  const matches = fixturesSection.match(/[A-Za-z0-9._-]+\.fixture\.json/g) ?? [];
  return [...new Set(matches)];
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
