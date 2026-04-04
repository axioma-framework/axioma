import { readFile } from "node:fs/promises";
import path from "node:path";

import { auditSpecFile } from "../censor-service/index.js";
import { generateJusticeTests } from "../justice-service/index.js";
import { implementWithMason } from "../mason-service/index.js";
import { parseSpec } from "../spec-engine/index.js";
import type { SpecStatus } from "../types/spec.js";

export interface RunResult {
  finalStatus: SpecStatus;
  steps: string[];
}

export async function runAxiomaPipeline(specPathArg: string): Promise<RunResult> {
  const specPath = path.resolve(specPathArg);
  const steps: string[] = [];

  while (true) {
    const spec = await readSpec(specPath);

    switch (spec.frontmatter.status) {
      case "drafting":
      case "auditing": {
        const audit = await auditSpecFile({ specPath });
        steps.push(audit.result.passed ? "audit:passed" : "audit:vetoed");

        if (!audit.result.passed) {
          return {
            finalStatus: audit.spec.frontmatter.status,
            steps
          };
        }
        break;
      }

      case "approved": {
        const justice = await generateJusticeTests({ specPath });
        steps.push(`testgen:${justice.testsGenerated}`);
        break;
      }

      case "testing":
      case "implementing": {
        const mason = await implementWithMason({ specPath });
        steps.push(`implement:${mason.attempts}`);
        break;
      }

      case "done":
        steps.push("noop:done");
        return {
          finalStatus: "done",
          steps
        };

      case "vetoed":
        steps.push("stop:vetoed");
        return {
          finalStatus: "vetoed",
          steps
        };

      case "failed":
        steps.push("stop:failed");
        return {
          finalStatus: "failed",
          steps
        };

      default:
        throw new Error(`Unsupported pipeline status "${spec.frontmatter.status}".`);
    }
  }
}

async function readSpec(specPath: string) {
  return parseSpec(await readFile(specPath, "utf8"), specPath);
}
