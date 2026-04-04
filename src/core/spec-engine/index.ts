import matter from "gray-matter";

import {
  SPEC_STATUSES,
  type AcceptanceCriterion,
  type AxiomaSpec,
  type LedgerRow,
  type SpecFrontmatter,
  type ValidationResult
} from "../types/spec.js";

const SECTION_TITLES = ["Intent", "Contract", "Fixtures", "Ledger"] as const;
const REQUIRED_SECTIONS = ["Intent", "Contract", "Ledger"] as const;

function canonicalizeSectionTitle(title: string): string {
  const normalized = title.trim();

  if (normalized.startsWith("Intent")) {
    return "Intent";
  }

  if (normalized.startsWith("Contract")) {
    return "Contract";
  }

  if (normalized.startsWith("Fixtures")) {
    return "Fixtures";
  }

  if (normalized.startsWith("Ledger")) {
    return "Ledger";
  }

  return normalized;
}

function extractSections(markdown: string): Record<string, string> {
  const headings = [...markdown.matchAll(/^##\s+(.+?)\s*$/gm)];
  const sections: Record<string, string> = {};

  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    const title = canonicalizeSectionTitle(heading[1]);
    const start = (heading.index ?? 0) + heading[0].length;
    const end = index + 1 < headings.length ? headings[index + 1].index ?? markdown.length : markdown.length;
    sections[title] = markdown.slice(start, end).trim();
  }

  return sections;
}

function parseAcceptanceCriteria(contractSection: string): AcceptanceCriterion[] {
  return contractSection
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^-\s+\[[ xX]\]\s+\*\*AC-\d{2,}:\*\*/.test(line))
    .map((line) => {
      const match = line.match(/^-\s+\[([ xX])\]\s+\*\*(AC-\d{2,}):\*\*\s+(.+)$/);

      if (!match) {
        throw new Error(`Invalid acceptance criterion format: "${line}"`);
      }

      return {
        raw: line,
        checked: match[1].toLowerCase() === "x",
        id: match[2],
        text: match[3].trim()
      };
    });
}

function parseLedger(ledgerSection: string): LedgerRow[] {
  const lines = ledgerSection
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const tableLines = lines.filter((line) => line.startsWith("|"));

  if (tableLines.length < 3) {
    throw new Error("Ledger section must include a Markdown table with at least one data row.");
  }

  const headers = splitMarkdownRow(tableLines[0]);

  if (headers.length !== 4 || headers[0] !== "Agent" || headers[1] !== "Status" || headers[2] !== "Timestamp" || headers[3] !== "Notes") {
    throw new Error("Ledger table must have headers: Agent | Status | Timestamp | Notes");
  }

  return tableLines.slice(2).map((line) => {
    const cells = splitMarkdownRow(line);

    if (cells.length !== 4) {
      throw new Error(`Ledger row must contain exactly 4 cells: "${line}"`);
    }

    return {
      agent: cells[0],
      status: cells[1] as LedgerRow["status"],
      timestamp: cells[2],
      notes: cells[3]
    };
  });
}

function splitMarkdownRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function serializeLedger(ledger: LedgerRow[]): string {
  const rows = [
    "| Agent | Status | Timestamp | Notes |",
    "|---|---|---|---|",
    ...ledger.map((row) => `| ${row.agent} | ${row.status} | ${row.timestamp} | ${row.notes} |`)
  ];

  return rows.join("\n");
}

function replaceSection(markdown: string, title: string, content: string): string {
  const headings = [...markdown.matchAll(/^##\s+(.+?)\s*$/gm)];
  const targetIndex = headings.findIndex((heading) => canonicalizeSectionTitle(heading[1]) === title);

  if (targetIndex === -1) {
    throw new Error(`Section "${title}" not found.`);
  }

  const heading = headings[targetIndex];
  const start = heading.index ?? 0;
  const end = targetIndex + 1 < headings.length ? headings[targetIndex + 1].index ?? markdown.length : markdown.length;
  const normalizedContent = content.trim();

  return `${markdown.slice(0, start)}## ${title}\n${normalizedContent}\n\n${markdown.slice(end).replace(/^\s+/, "")}`;
}

export function parseSpec(raw: string, path?: string): AxiomaSpec {
  const parsed = matter(raw);

  if (Object.keys(parsed.data).length === 0) {
    throw new Error("Spec is missing YAML frontmatter.");
  }

  const sections = extractSections(parsed.content);
  const contractSection = sections.Contract ?? "";
  const ledgerSection = sections.Ledger ?? "";

  return {
    path,
    raw,
    frontmatter: parsed.data as SpecFrontmatter,
    sections,
    acceptanceCriteria: parseAcceptanceCriteria(contractSection),
    ledger: parseLedger(ledgerSection)
  };
}

export function serializeSpec(spec: AxiomaSpec): string {
  const parsed = matter(spec.raw);
  parsed.data = spec.frontmatter;

  let content = parsed.content;

  if (spec.sections.Ledger) {
    content = replaceSection(content, "Ledger", serializeLedger(spec.ledger));
  }

  for (const title of SECTION_TITLES) {
    if (title !== "Ledger" && spec.sections[title]) {
      content = replaceSection(content, title, spec.sections[title]);
    }
  }

  return matter.stringify(content, parsed.data);
}

export function validateSpec(spec: AxiomaSpec): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!SPEC_STATUSES.includes(spec.frontmatter.status)) {
    errors.push(`Invalid status "${String(spec.frontmatter.status)}".`);
  }

  if (!Array.isArray(spec.frontmatter.context_bounds) || spec.frontmatter.context_bounds.length === 0) {
    errors.push("Frontmatter context_bounds must contain at least one file path.");
  }

  for (const section of REQUIRED_SECTIONS) {
    if (!spec.sections[section] || spec.sections[section].trim().length === 0) {
      errors.push(`Missing required section "${section}".`);
    }
  }

  if (spec.acceptanceCriteria.length === 0) {
    errors.push("Contract section must define at least one acceptance criterion.");
  }

  for (const criterion of spec.acceptanceCriteria) {
    if (!/Given .+, when .+, then .+/i.test(criterion.text)) {
      errors.push(`Acceptance criterion ${criterion.id} must use Given/When/Then format.`);
    }
  }

  if (spec.ledger.length === 0) {
    errors.push("Ledger table must include at least one row.");
  }

  const duplicateAgents = new Set<string>();
  for (const row of spec.ledger) {
    const key = row.agent.toLowerCase();
    if (duplicateAgents.has(key)) {
      errors.push(`Ledger contains duplicate agent row "${row.agent}".`);
    }
    duplicateAgents.add(key);
  }

  if (!spec.sections.Fixtures) {
    warnings.push("Spec does not declare a Fixtures section.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function updateLedgerSection(raw: string, ledger: LedgerRow[]): string {
  const parsed = parseSpec(raw);
  return serializeSpec({
    ...parsed,
    ledger,
    sections: {
      ...parsed.sections,
      Ledger: serializeLedger(ledger)
    }
  });
}
