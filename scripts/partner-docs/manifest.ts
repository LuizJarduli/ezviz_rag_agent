import { readFileSync } from "node:fs";
import { join } from "node:path";

import { EXPECTED_CHAPTER_PATHS, PARTNER_DOCS_ROOT } from "./expected-chapters.ts";
import { chapterAbsolutePath, fileExists } from "./scaffold-structure.ts";
import type { PartnerDocChapter, PartnerDocsManifest } from "./types.ts";
import { ManifestLoadError } from "./types.ts";

export type {
  ContentGuard,
  DocModule,
  DocPart,
  PartnerDocChapter,
  PartnerDocsManifest,
} from "./types.ts";

export { ManifestLoadError } from "./types.ts";

export const MANIFEST_RELATIVE_PATH = `${PARTNER_DOCS_ROOT}/partner-docs.manifest.json`;

const AUTHORING_COMMENT_RE = /^\s*<!--[\s\S]*?-->\s*/;

export function stripManifestAuthoringComment(raw: string): string {
  return raw.replace(AUTHORING_COMMENT_RE, "");
}

export function manifestAbsolutePath(repoRoot: string): string {
  return join(repoRoot, MANIFEST_RELATIVE_PATH);
}

export function getDuplicateChapterIds(chapters: PartnerDocChapter[]): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const chapter of chapters) {
    if (seen.has(chapter.id)) {
      duplicates.push(chapter.id);
    } else {
      seen.add(chapter.id);
    }
  }
  return duplicates;
}

export function loadManifestFromFile(manifestPath: string): PartnerDocsManifest {
  const raw = readFileSync(manifestPath, "utf8");
  const json = stripManifestAuthoringComment(raw);
  const manifest = JSON.parse(json) as PartnerDocsManifest;
  const duplicates = getDuplicateChapterIds(manifest.chapters);
  if (duplicates.length > 0) {
    throw new ManifestLoadError(
      `Manifest has duplicate chapter ids: ${duplicates.join(", ")}`,
      duplicates.map((id) => ({
        chapterId: id,
        rule: "duplicate-chapter-id",
        message: `Duplicate chapter id: ${id}`,
      })),
    );
  }
  return manifest;
}

/** Loads manifest from absolute or repo-relative path (TechSpec public API). */
export function loadManifest(manifestPath: string): PartnerDocsManifest {
  return loadManifestFromFile(manifestPath);
}

/** Loads the canonical partner-docs manifest under `repoRoot`. */
export function loadManifestFromRepo(repoRoot: string): PartnerDocsManifest {
  return loadManifest(manifestAbsolutePath(repoRoot));
}

export function findMissingChapterPaths(
  repoRoot: string,
  manifest: PartnerDocsManifest,
): string[] {
  const missing: string[] = [];
  for (const chapter of manifest.chapters) {
    if (!fileExists(repoRoot, chapter.path)) {
      missing.push(chapter.path);
    }
  }
  return missing;
}

export function manifestPathsAlignWithExpected(manifest: PartnerDocsManifest): boolean {
  const manifestPaths = manifest.chapters.map((c) => c.path).sort();
  const expected = [...EXPECTED_CHAPTER_PATHS].sort();
  if (manifestPaths.length !== expected.length) {
    return false;
  }
  return manifestPaths.every((path, index) => path === expected[index]);
}

export function getChapterById(
  manifest: PartnerDocsManifest,
  id: string,
): PartnerDocChapter | undefined {
  return manifest.chapters.find((chapter) => chapter.id === id);
}

export function resolveChapterPath(repoRoot: string, relativePath: string): string {
  return chapterAbsolutePath(repoRoot, relativePath);
}
