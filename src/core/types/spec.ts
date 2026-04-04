export const SPEC_STATUSES = [
  "drafting",
  "auditing",
  "approved",
  "testing",
  "implementing",
  "done",
  "failed",
  "vetoed"
] as const;

export type SpecStatus = (typeof SPEC_STATUSES)[number];

export type LedgerStatus = "PENDING" | "DONE" | "VETOED" | "FAILED" | "-";

export interface SpecFrontmatter {
  status: SpecStatus;
  feature?: string;
  author?: string;
  created?: string;
  context_bounds: string[];
  invariants?: string[];
  [key: string]: unknown;
}

export interface AcceptanceCriterion {
  raw: string;
  id: string;
  text: string;
  checked: boolean;
}

export interface LedgerRow {
  agent: string;
  status: LedgerStatus;
  timestamp: string;
  notes: string;
}

export interface AxiomaSpec {
  path?: string;
  raw: string;
  frontmatter: SpecFrontmatter;
  sections: Record<string, string>;
  acceptanceCriteria: AcceptanceCriterion[];
  ledger: LedgerRow[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ProjectInspectionResult {
  repoPath: string;
  language: "typescript";
  packageManager: "npm" | "pnpm" | "yarn" | "unknown";
  testRunner: "vitest" | "jest" | "unknown";
  testPattern: string;
  sourceRoots: string[];
  candidateFiles: string[];
}

export interface AuditResult {
  passed: boolean;
  reasons: string[];
}
