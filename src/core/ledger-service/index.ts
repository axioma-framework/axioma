import type { AxiomaSpec, LedgerRow, SpecStatus } from "../types/spec.js";

const STATUS_TRANSITIONS: Record<SpecStatus, SpecStatus[]> = {
  drafting: ["auditing", "failed", "vetoed"],
  auditing: ["approved", "vetoed", "failed"],
  approved: ["testing", "failed"],
  testing: ["implementing", "failed"],
  implementing: ["done", "failed"],
  done: [],
  failed: [],
  vetoed: ["drafting", "auditing"]
};

export function validateStatusTransition(current: SpecStatus, next: SpecStatus): boolean {
  return STATUS_TRANSITIONS[current].includes(next);
}

export function updateLedgerRow(
  spec: AxiomaSpec,
  agent: string,
  updates: Partial<LedgerRow>,
  nextSpecStatus?: SpecStatus
): AxiomaSpec {
  const rowIndex = spec.ledger.findIndex((row) => row.agent === agent);

  if (rowIndex === -1) {
    throw new Error(`Agent "${agent}" not found in ledger.`);
  }

  if (nextSpecStatus && !validateStatusTransition(spec.frontmatter.status, nextSpecStatus)) {
    throw new Error(`Invalid status transition from "${spec.frontmatter.status}" to "${nextSpecStatus}".`);
  }

  const nextLedger = spec.ledger.map((row, index) => (index === rowIndex ? { ...row, ...updates } : row));

  return {
    ...spec,
    frontmatter: {
      ...spec.frontmatter,
      status: nextSpecStatus ?? spec.frontmatter.status
    },
    ledger: nextLedger
  };
}
