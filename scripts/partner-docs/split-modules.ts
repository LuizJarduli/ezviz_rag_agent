import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { basename, isAbsolute, join, resolve } from "node:path";

import { FRONT_MATTER_RELATIVE_PATH } from "./build.ts";
import { PARTNER_DOCS_ROOT } from "./expected-chapters.ts";
import { loadManifestFromFile, manifestAbsolutePath } from "./manifest.ts";
import { chapterAbsolutePath, partnerDocsDir } from "./scaffold-structure.ts";
import type { DocModule, PartnerDocChapter, PartnerDocsManifest } from "./types.ts";
import type { ValidationResult } from "./types.ts";
import { runValidation } from "./validate.ts";

export const MODULES_OUTPUT_DIR = "modules";

/** Flat module pack layout: `modules/{module}/{chapter-basename}.md` */
export const DOC_MODULE_VALUES: readonly DocModule[] = [
  "shared",
  "android",
  "ios",
  "web",
  "best-practices",
] as const;

export class SplitModulesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SplitModulesError";
  }
}

export function modulesRootRelativePath(): string {
  return `${PARTNER_DOCS_ROOT}/${MODULES_OUTPUT_DIR}`;
}

export function modulesRootAbsolutePath(repoRoot: string): string {
  return join(repoRoot, modulesRootRelativePath());
}

export function moduleOutputRelativePath(
  module: DocModule,
  chapterPath: string,
): string {
  return `${modulesRootRelativePath()}/${module}/${basename(chapterPath)}`;
}

export function moduleOutputAbsolutePath(
  repoRoot: string,
  module: DocModule,
  chapterPath: string,
): string {
  return join(repoRoot, moduleOutputRelativePath(module, chapterPath));
}

export function assertValidModule(module: string): asserts module is DocModule {
  if (!(DOC_MODULE_VALUES as readonly string[]).includes(module)) {
    throw new SplitModulesError(
      `Unknown module "${module}". Expected one of: ${DOC_MODULE_VALUES.join(", ")}`,
    );
  }
}

export function groupChaptersByModule(
  manifest: PartnerDocsManifest,
): Map<DocModule, PartnerDocChapter[]> {
  const groups = new Map<DocModule, PartnerDocChapter[]>();
  for (const module of DOC_MODULE_VALUES) {
    groups.set(module, []);
  }
  for (const chapter of manifest.chapters) {
    assertValidModule(chapter.module);
    groups.get(chapter.module)!.push(chapter);
  }
  return groups;
}

export interface SplitModulesOptions {
  repoRoot: string;
  manifestPath?: string;
  /** When false, skip wiping `modules/` before export (default: true). */
  cleanOutput?: boolean;
}

export interface SplitModulesResult {
  ok: boolean;
  phase: "validate" | "split";
  errors?: ValidationResult["errors"];
  filesWritten: string[];
}

function ensureParentDir(filePath: string): void {
  mkdirSync(join(filePath, ".."), { recursive: true });
}

function copyChapterByteIdentical(
  repoRoot: string,
  chapter: PartnerDocChapter,
): string {
  const source = chapterAbsolutePath(repoRoot, chapter.path);
  const dest = moduleOutputAbsolutePath(repoRoot, chapter.module, chapter.path);
  ensureParentDir(dest);
  copyFileSync(source, dest);
  return dest;
}

function copyFrontMatterToShared(repoRoot: string): string | undefined {
  const source = chapterAbsolutePath(repoRoot, FRONT_MATTER_RELATIVE_PATH);
  if (!existsSync(source)) {
    return undefined;
  }
  const dest = join(
    modulesRootAbsolutePath(repoRoot),
    "shared",
    basename(FRONT_MATTER_RELATIVE_PATH),
  );
  ensureParentDir(dest);
  copyFileSync(source, dest);
  return dest;
}

function copyAssetsToShared(repoRoot: string): string[] {
  const assetsSource = join(partnerDocsDir(repoRoot), "assets");
  if (!existsSync(assetsSource)) {
    return [];
  }
  const assetsDest = join(modulesRootAbsolutePath(repoRoot), "shared", "assets");
  cpSync(assetsSource, assetsDest, { recursive: true });
  return listFilesRecursive(assetsDest).map((abs) =>
    abs.slice(repoRoot.length + 1),
  );
}

function listFilesRecursive(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

function cleanModulesOutput(repoRoot: string): void {
  const root = modulesRootAbsolutePath(repoRoot);
  if (existsSync(root)) {
    rmSync(root, { recursive: true, force: true });
  }
}

export function splitModules(options: SplitModulesOptions): SplitModulesResult {
  const repoRoot = options.repoRoot;
  const manifestPath = options.manifestPath ?? manifestAbsolutePath(repoRoot);
  const manifest = loadManifestFromFile(manifestPath);
  const cleanOutput = options.cleanOutput !== false;

  if (cleanOutput) {
    cleanModulesOutput(repoRoot);
  }

  const filesWritten: string[] = [];

  for (const chapter of manifest.chapters) {
    assertValidModule(chapter.module);
    const dest = copyChapterByteIdentical(repoRoot, chapter);
    filesWritten.push(dest.slice(repoRoot.length + 1));
  }

  const frontMatterDest = copyFrontMatterToShared(repoRoot);
  if (frontMatterDest) {
    filesWritten.push(frontMatterDest.slice(repoRoot.length + 1));
  }

  filesWritten.push(...copyAssetsToShared(repoRoot));

  return { ok: true, phase: "split", filesWritten };
}

export function runSplit(
  repoRoot: string,
  manifestPath?: string,
  runValidationFn: typeof runValidation = runValidation,
): SplitModulesResult {
  const validation = runValidationFn(repoRoot, manifestPath);
  if (!validation.ok) {
    return { ok: false, phase: "validate", errors: validation.errors, filesWritten: [] };
  }
  return splitModules({ repoRoot, manifestPath });
}

function resolveArg(pathArg: string): string {
  return isAbsolute(pathArg) ? pathArg : resolve(process.cwd(), pathArg);
}

export function main(argv: string[] = process.argv.slice(2)): number {
  const repoRoot = argv[0] ? resolveArg(argv[0]) : process.cwd();
  const manifestPath = argv[1] ? resolveArg(argv[1]) : manifestAbsolutePath(repoRoot);

  let result: SplitModulesResult;
  try {
    result = runSplit(repoRoot, manifestPath);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    return 1;
  }

  if (!result.ok) {
    for (const err of result.errors ?? []) {
      console.error(`[${err.chapterId}] ${err.rule}: ${err.message}`);
    }
    return 1;
  }

  console.log(
    `OK: split ${result.filesWritten.length} paths under ${repoRoot}/${modulesRootRelativePath()}`,
  );
  return 0;
}

const isCliEntry =
  process.argv[1] &&
  (process.argv[1].endsWith("split-modules.ts") ||
    process.argv[1].endsWith("split-modules.js"));

if (isCliEntry) {
  process.exit(main());
}
