import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { inspectProject, suggestContextBounds } from "../project-inspector/index.js";

interface DraftSpecOptions {
  repoPath: string;
  featureName: string;
}

interface DraftSpecResult {
  specPath: string;
  inspection: Awaited<ReturnType<typeof inspectProject>>;
  contextBounds: string[];
}

const TEMPLATE_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../.axioma/templates/manifest.template.md"
);

export async function draftSpec(options: DraftSpecOptions): Promise<DraftSpecResult> {
  const repoPath = path.resolve(options.repoPath);
  const featureSlug = slugifyFeatureName(options.featureName);
  const inspection = await inspectProject(repoPath);
  const contextBounds = suggestContextBounds(featureSlug, inspection);
  const specPath = path.join(repoPath, "docs/specs", `${featureSlug}.spec.md`);
  const template = await readFile(TEMPLATE_PATH, "utf8");
  const content = renderSpec(template, {
    featureName: featureSlug,
    createdAt: new Date().toISOString().slice(0, 10),
    contextBounds,
    testRunner: inspection.testRunner
  });

  await writeFile(specPath, content, "utf8");

  return {
    specPath,
    inspection,
    contextBounds
  };
}

export function slugifyFeatureName(featureName: string): string {
  const slug = featureName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    throw new Error("Feature name must contain at least one alphanumeric character.");
  }

  return slug;
}

function renderSpec(
  template: string,
  input: {
    featureName: string;
    createdAt: string;
    contextBounds: string[];
    testRunner: string;
  }
): string {
  void template;

  return `---
status: drafting
feature: "${input.featureName}"
author: "The Blueprint"
created: "${input.createdAt}"
context_bounds:
${input.contextBounds.map((entry) => `  - "${entry}"`).join("\n")}
invariants:
  - "The implementation MUST stay within context_bounds."
  - "The acceptance criteria MUST remain independently testable with ${input.testRunner}."
---

## Intent
Define the ${input.featureName} feature for a TypeScript project and capture the required behavior before implementation.

## Contract (Acceptance Criteria)
- [ ] **AC-01:** Given the ${input.featureName} workflow is triggered, when the implementation is executed, then the expected behavior is produced in a measurable way.
- [ ] **AC-02:** Given invalid or missing input for ${input.featureName}, when the implementation is executed, then the system responds with an explicit failure condition.
- [ ] **AC-03:** Given the feature touches existing project files, when changes are implemented, then only files inside context_bounds are modified.

## Fixtures (Optional)
> No fixtures defined yet.

## Ledger
| Agent | Status | Timestamp | Notes |
|---|---|---|---|
| The Archivist | DONE | ${input.createdAt} | Stack inspected and candidate files identified. |
| The Blueprint | DONE | ${input.createdAt} | Spec drafted from template. |
| The Censor | PENDING | - | Awaiting audit. |
| The Justice | - | - | - |
| The Mason | - | - | - |
`;
}
