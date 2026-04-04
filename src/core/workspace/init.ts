import { mkdir } from "node:fs/promises";
import path from "node:path";

const REQUIRED_DIRECTORIES = [".axioma", "docs/specs", "docs/fixtures"];

export async function initializeWorkspace(rootDir: string): Promise<string[]> {
  const created: string[] = [];

  for (const relativeDir of REQUIRED_DIRECTORIES) {
    const absoluteDir = path.join(rootDir, relativeDir);
    await mkdir(absoluteDir, { recursive: true });
    created.push(relativeDir);
  }

  return created;
}
