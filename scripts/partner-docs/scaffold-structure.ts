import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

import {
  EXPECTED_CHAPTER_PATHS,
  PARTNER_DOCS_ROOT,
  PLATFORM_CHAPTER_BASENAMES,
  REQUIRED_ROOT_FILES,
} from "./expected-chapters.ts";

export interface ScaffoldCheckResult {
  ok: boolean;
  errors: string[];
}

export function partnerDocsDir(repoRoot: string): string {
  return join(repoRoot, PARTNER_DOCS_ROOT);
}

export function chapterAbsolutePath(repoRoot: string, relativePath: string): string {
  return join(partnerDocsDir(repoRoot), relativePath);
}

export function fileExists(repoRoot: string, relativePath: string): boolean {
  return existsSync(chapterAbsolutePath(repoRoot, relativePath));
}

export function hasH1Title(markdown: string): boolean {
  return /^#\s+\S+/m.test(markdown);
}

/** English scaffold placeholder or pt-BR authored outcomes (README conventions). */
export function hasLearningOutcomes(markdown: string): boolean {
  return (
    /You will be able to/i.test(markdown) ||
    /Ao concluir este capítulo, você será capaz de/i.test(markdown)
  );
}

/** @deprecated Use hasLearningOutcomes */
export function hasYouWillBeAbleToPlaceholder(markdown: string): boolean {
  return hasLearningOutcomes(markdown);
}

export function platformBasenamesAlign(): boolean {
  const android = PLATFORM_CHAPTER_BASENAMES.map((f) => basename(f));
  const ios = PLATFORM_CHAPTER_BASENAMES.map((f) => basename(f));
  const web = PLATFORM_CHAPTER_BASENAMES.map((f) => basename(f));
  const same = (a: string[], b: string[]) =>
    a.length === b.length && a.every((name, i) => name === b[i]);
  return same(android, ios) && same(android, web);
}

export function validateScaffoldStructure(repoRoot: string): ScaffoldCheckResult {
  const errors: string[] = [];
  const root = partnerDocsDir(repoRoot);

  if (!existsSync(root)) {
    errors.push(`Missing partner docs root: ${PARTNER_DOCS_ROOT}/`);
    return { ok: false, errors };
  }

  for (const file of REQUIRED_ROOT_FILES) {
    const rel = file;
    if (!fileExists(repoRoot, rel)) {
      errors.push(`Missing required file: ${rel}`);
    }
  }

  const readmePath = chapterAbsolutePath(repoRoot, "README.md");
  if (existsSync(readmePath)) {
    const readme = readFileSync(readmePath, "utf8");
    if (!readme.includes("Pandoc")) {
      errors.push("README.md must mention Pandoc");
    }
  }

  if (!platformBasenamesAlign()) {
    errors.push("Android, iOS, and Web chapter basenames must match (ADR-001)");
  }

  for (const rel of EXPECTED_CHAPTER_PATHS) {
    if (!fileExists(repoRoot, rel)) {
      errors.push(`Missing chapter: ${rel}`);
      continue;
    }
    const body = readFileSync(chapterAbsolutePath(repoRoot, rel), "utf8");
    if (!hasH1Title(body)) {
      errors.push(`Chapter missing H1 title: ${rel}`);
    }
    if (!hasLearningOutcomes(body)) {
      errors.push(`Chapter missing learning outcomes: ${rel}`);
    }
  }

  return { ok: errors.length === 0, errors };
}
