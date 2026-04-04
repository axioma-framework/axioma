import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

import type { ProjectInspectionResult } from "../types/spec.js";

interface PackageJsonShape {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const IGNORE_DIRECTORIES = new Set(["node_modules", "dist", "build", "coverage", ".git"]);

export async function inspectProject(repoPath: string): Promise<ProjectInspectionResult> {
  const resolvedRepoPath = path.resolve(repoPath);
  const packageJson = await readPackageJson(resolvedRepoPath);
  const packageManager = await detectPackageManager(resolvedRepoPath);
  const testRunner = detectTestRunner(packageJson);
  const sourceRoots = await detectSourceRoots(resolvedRepoPath);
  const candidateFiles = await listSourceFiles(resolvedRepoPath, sourceRoots);

  if (candidateFiles.length === 0) {
    throw new Error("Project inspection failed: no TypeScript source files were found in supported source roots.");
  }

  return {
    repoPath: resolvedRepoPath,
    language: "typescript",
    packageManager,
    testRunner,
    testPattern: inferTestPattern(candidateFiles),
    sourceRoots,
    candidateFiles
  };
}

export function suggestContextBounds(featureName: string, inspection: ProjectInspectionResult): string[] {
  const tokens = tokenizeFeatureName(featureName);

  if (tokens.length === 0) {
    throw new Error("Feature name must contain at least one alphanumeric token.");
  }

  const ranked = inspection.candidateFiles
    .map((filePath) => ({ filePath, score: scoreCandidate(filePath, tokens) }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.filePath.localeCompare(right.filePath));

  if (ranked.length === 0) {
    throw new Error(`Could not infer context bounds for feature "${featureName}" with enough confidence.`);
  }

  return ranked.slice(0, 3).map((candidate) => candidate.filePath);
}

async function readPackageJson(repoPath: string): Promise<PackageJsonShape> {
  const packageJsonPath = path.join(repoPath, "package.json");

  try {
    const raw = await readFile(packageJsonPath, "utf8");
    return JSON.parse(raw) as PackageJsonShape;
  } catch (error) {
    throw new Error(`Project inspection failed: package.json not found or invalid in ${repoPath}.`);
  }
}

async function detectPackageManager(repoPath: string): Promise<ProjectInspectionResult["packageManager"]> {
  if (await fileExists(path.join(repoPath, "package-lock.json"))) {
    return "npm";
  }

  if (await fileExists(path.join(repoPath, "pnpm-lock.yaml"))) {
    return "pnpm";
  }

  if (await fileExists(path.join(repoPath, "yarn.lock"))) {
    return "yarn";
  }

  return "unknown";
}

function detectTestRunner(packageJson: PackageJsonShape): ProjectInspectionResult["testRunner"] {
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };

  if (dependencies.vitest) {
    return "vitest";
  }

  if (dependencies.jest) {
    return "jest";
  }

  return "unknown";
}

async function detectSourceRoots(repoPath: string): Promise<string[]> {
  const preferredRoots = ["src", "lib"];
  const discoveredRoots: string[] = [];

  for (const root of preferredRoots) {
    if (await directoryExists(path.join(repoPath, root))) {
      discoveredRoots.push(root);
    }
  }

  if (discoveredRoots.length > 0) {
    return discoveredRoots;
  }

  throw new Error("Project inspection failed: no supported source roots were found (expected src/ or lib/).");
}

async function listSourceFiles(repoPath: string, sourceRoots: string[]): Promise<string[]> {
  const files = new Set<string>();

  for (const sourceRoot of sourceRoots) {
    const absoluteRoot = path.join(repoPath, sourceRoot);
    for (const file of await walkFiles(absoluteRoot, repoPath)) {
      if (SOURCE_EXTENSIONS.has(path.extname(file)) && !file.endsWith(".test.ts") && !file.endsWith(".spec.ts")) {
        files.add(file);
      }
    }
  }

  return [...files].sort();
}

async function walkFiles(currentPath: string, repoPath: string): Promise<string[]> {
  const entries = await readdir(currentPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (IGNORE_DIRECTORIES.has(entry.name)) {
      continue;
    }

    const absoluteEntryPath = path.join(currentPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(absoluteEntryPath, repoPath)));
      continue;
    }

    files.push(path.relative(repoPath, absoluteEntryPath));
  }

  return files;
}

function inferTestPattern(candidateFiles: string[]): string {
  if (candidateFiles.some((filePath) => filePath.startsWith("src/"))) {
    return "src/**/*.test.ts";
  }

  return "tests/**/*.test.ts";
}

function tokenizeFeatureName(featureName: string): string[] {
  return featureName
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length >= 2);
}

function scoreCandidate(filePath: string, tokens: string[]): number {
  const normalizedPath = filePath.toLowerCase();
  const basename = path.basename(normalizedPath, path.extname(normalizedPath));
  const segments = normalizedPath.split(/[/.\\_-]+/g);

  let score = 0;
  for (const token of tokens) {
    if (basename === token) {
      score += 5;
      continue;
    }

    if (basename.includes(token)) {
      score += 3;
      continue;
    }

    if (segments.includes(token)) {
      score += 2;
      continue;
    }

    if (normalizedPath.includes(token)) {
      score += 1;
    }
  }

  return score;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function directoryExists(directoryPath: string): Promise<boolean> {
  try {
    const stats = await readdir(directoryPath);
    return Array.isArray(stats);
  } catch {
    return false;
  }
}
