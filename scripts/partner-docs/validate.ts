import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, normalize, relative, resolve } from "node:path";

import { PARTNER_DOCS_ROOT } from "./expected-chapters.ts";
import {
  getDuplicateChapterIds,
  loadManifestFromFile,
  manifestAbsolutePath,
} from "./manifest.ts";
import { chapterAbsolutePath, partnerDocsDir } from "./scaffold-structure.ts";
import type {
  ContentGuard,
  PartnerDocChapter,
  PartnerDocsManifest,
  ValidationError,
  ValidationResult,
} from "./types.ts";

const MARKDOWN_LINK_RE = /\[([^\]]*)\]\(([^)]+)\)/g;
const TBD_RE = /\bTBD\b/;

export function compileGuardPattern(pattern: string): RegExp {
  if (pattern.startsWith("(?i)")) {
    return new RegExp(pattern.slice(4), "i");
  }
  return new RegExp(pattern);
}

export function validateContentGuards(
  chapter: PartnerDocChapter,
  body: string,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const guards = chapter.guards;
  if (!guards) {
    return errors;
  }

  for (const pattern of guards.mustMatchOne ?? []) {
    try {
      if (!compileGuardPattern(pattern).test(body)) {
        errors.push({
          chapterId: chapter.id,
          rule: "content-guard-must-match-one",
          message: `Body must match guard pattern: ${pattern}`,
        });
      }
    } catch {
      errors.push({
        chapterId: chapter.id,
        rule: "invalid-guard-pattern",
        message: `Invalid mustMatchOne regex: ${pattern}`,
      });
    }
  }

  for (const pattern of guards.mustNotMatch ?? []) {
    try {
      if (compileGuardPattern(pattern).test(body)) {
        errors.push({
          chapterId: chapter.id,
          rule: "content-guard-must-not-match",
          message: `Body must not match: ${pattern}`,
        });
      }
    } catch {
      errors.push({
        chapterId: chapter.id,
        rule: "invalid-guard-pattern",
        message: `Invalid mustNotMatch regex: ${pattern}`,
      });
    }
  }

  return errors;
}

export function validateMustLinkTo(
  chapter: PartnerDocChapter,
  body: string,
): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const target of chapter.mustLinkTo ?? []) {
    const linked =
      body.includes(`](${target})`) ||
      body.includes(`](${target}#`) ||
      body.includes(target);
    if (!linked) {
      errors.push({
        chapterId: chapter.id,
        rule: "must-link-to",
        message: `Chapter must link to ${target}`,
      });
    }
  }
  return errors;
}

function isExternalLink(href: string): boolean {
  return (
    /^[a-z][a-z0-9+.-]*:/i.test(href) ||
    href.startsWith("#") ||
    href.startsWith("mailto:")
  );
}

export function extractRelativeMarkdownLinks(body: string): string[] {
  const links: string[] = [];
  for (const match of body.matchAll(MARKDOWN_LINK_RE)) {
    const href = match[2]?.trim();
    if (href && !isExternalLink(href)) {
      links.push(href.split("#")[0] ?? href);
    }
  }
  return links;
}

export function resolveLinkTarget(
  repoRoot: string,
  chapterRelativePath: string,
  linkHref: string,
): string {
  const chapterDir = dirname(chapterRelativePath);
  const resolved = normalize(join(chapterDir, linkHref));
  return join(partnerDocsDir(repoRoot), resolved);
}

export function validateRelativeLinks(
  repoRoot: string,
  chapter: PartnerDocChapter,
  body: string,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const docsRoot = partnerDocsDir(repoRoot);

  for (const href of extractRelativeMarkdownLinks(body)) {
    const absolute = resolveLinkTarget(repoRoot, chapter.path, href);
    if (!absolute.startsWith(docsRoot)) {
      errors.push({
        chapterId: chapter.id,
        rule: "link-outside-docs-root",
        message: `Link escapes partner docs root: ${href}`,
      });
      continue;
    }
    if (!existsSync(absolute)) {
      const fromDocs = relative(docsRoot, absolute);
      errors.push({
        chapterId: chapter.id,
        rule: "broken-relative-link",
        message: `Broken relative link: ${href} (resolved to ${fromDocs})`,
      });
    }
  }

  return errors;
}

export function validateChapterBody(
  repoRoot: string,
  chapter: PartnerDocChapter,
  body: string,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (TBD_RE.test(body)) {
    errors.push({
      chapterId: chapter.id,
      rule: "placeholder-tbd",
      message: "Chapter body must not contain TBD placeholder",
    });
  }

  errors.push(...validateContentGuards(chapter, body));
  errors.push(...validateMustLinkTo(chapter, body));
  errors.push(...validateRelativeLinks(repoRoot, chapter, body));

  return errors;
}

export function validatePartnerDocs(
  repoRoot: string,
  manifest: PartnerDocsManifest,
): ValidationResult {
  const errors: ValidationError[] = [];

  for (const chapter of manifest.chapters) {
    if (!chapter.required) {
      continue;
    }

    const absPath = chapterAbsolutePath(repoRoot, chapter.path);
    if (!existsSync(absPath)) {
      errors.push({
        chapterId: chapter.id,
        rule: "missing-file",
        message: `Missing required chapter file: ${PARTNER_DOCS_ROOT}/${chapter.path}`,
      });
      continue;
    }

    const body = readFileSync(absPath, "utf8");
    errors.push(...validateChapterBody(repoRoot, chapter, body));
  }

  return { ok: errors.length === 0, errors };
}

export function runValidation(
  repoRoot: string,
  manifestPath?: string,
): ValidationResult {
  const path = manifestPath ?? manifestAbsolutePath(repoRoot);
  const manifest = loadManifestFromFile(path);
  const duplicates = getDuplicateChapterIds(manifest.chapters);
  if (duplicates.length > 0) {
    return {
      ok: false,
      errors: duplicates.map((id) => ({
        chapterId: id,
        rule: "duplicate-chapter-id",
        message: `Duplicate chapter id in manifest: ${id}`,
      })),
    };
  }
  return validatePartnerDocs(repoRoot, manifest);
}

function printErrors(errors: ValidationError[]): void {
  for (const err of errors) {
    console.error(`[${err.chapterId}] ${err.rule}: ${err.message}`);
  }
}

function resolveArg(pathArg: string): string {
  return isAbsolute(pathArg) ? pathArg : resolve(process.cwd(), pathArg);
}

export function main(argv: string[] = process.argv.slice(2)): number {
  const repoRoot = argv[0] ? resolveArg(argv[0]) : process.cwd();
  const manifestPath = argv[1]
    ? resolveArg(argv[1])
    : manifestAbsolutePath(repoRoot);

  let result: ValidationResult;
  try {
    result = runValidation(repoRoot, manifestPath);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    return 1;
  }

  if (!result.ok) {
    printErrors(result.errors);
    return 1;
  }

  console.log(`OK: partner docs validated under ${repoRoot}`);
  return 0;
}

const isCliEntry =
  process.argv[1] &&
  (process.argv[1].endsWith("validate.ts") ||
    process.argv[1].endsWith("validate.js"));

if (isCliEntry) {
  process.exit(main());
}