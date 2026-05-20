import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { isAbsolute, resolve } from "node:path";

import { loadManifestFromFile, manifestAbsolutePath } from "./manifest.ts";
import {
  hasMermaidBlocks,
  installPuppeteerChromeHeadlessShell,
  isMermaidCliAvailable,
  resolveChromeExecutablePath,
  stageBuildInputsForPdf,
  type MmdcSpawnFn,
} from "./mermaid-preprocess.ts";
import { chapterAbsolutePath, partnerDocsDir } from "./scaffold-structure.ts";
import type { PartnerDocsManifest, ValidationResult } from "./types.ts";
import { runValidation } from "./validate.ts";

export const FRONT_MATTER_RELATIVE_PATH = "front-matter.md";

export interface PandocMetadata {
  title: string;
  docVersion: string;
  date: string;
}

export interface BuildResult {
  ok: boolean;
  exitCode: number;
  phase: "validate" | "prepare" | "mermaid" | "pandoc";
  errors?: ValidationResult["errors"];
  outputPath?: string;
  pandocStderr?: string;
  pdfEngine?: string;
  pdfEngineAutoSelected?: boolean;
}

export type PandocSpawnResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

export interface BuildOptions {
  repoRoot?: string;
  manifestPath?: string;
  runValidationFn?: (
    repoRoot: string,
    manifestPath?: string,
  ) => ValidationResult;
  spawnPandocFn?: (args: string[]) => PandocSpawnResult;
  spawnMmdcFn?: MmdcSpawnFn;
  pdfEngine?: string;
  skipMermaidPreprocess?: boolean;
  skipChromeInstall?: boolean;
}

export function orderedChapterRelativePaths(
  manifest: PartnerDocsManifest,
): string[] {
  return manifest.chapters.map((chapter) => chapter.path);
}

export function orderedBuildRelativePaths(
  manifest: PartnerDocsManifest,
): string[] {
  return [FRONT_MATTER_RELATIVE_PATH, ...orderedChapterRelativePaths(manifest)];
}

export function orderedBuildAbsolutePaths(
  repoRoot: string,
  manifest: PartnerDocsManifest,
): string[] {
  return orderedBuildRelativePaths(manifest).map((relativePath) =>
    chapterAbsolutePath(repoRoot, relativePath),
  );
}

export function resolvePdfOutputPath(
  repoRoot: string,
  manifest: PartnerDocsManifest,
): string {
  return chapterAbsolutePath(repoRoot, manifest.pdf.output);
}

export function parseFrontMatterMetadata(markdown: string): PandocMetadata {
  const block = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const yaml = block?.[1] ?? "";
  const title =
    yaml.match(/^title:\s*"(.*)"/m)?.[1] ??
    yaml.match(/^title:\s*(.+)$/m)?.[1]?.trim() ??
    "EZVIZ EZOpen — Guia de Integração para Parceiros";
  const docVersion =
    yaml.match(/^docVersion:\s*"(.*)"/m)?.[1] ??
    yaml.match(/^docVersion:\s*(.+)$/m)?.[1]?.trim() ??
    "0.0.0";
  const crawlDate =
    yaml.match(/^crawlDate:\s*"(.*)"/m)?.[1] ??
    yaml.match(/^crawlDate:\s*(.+)$/m)?.[1]?.trim() ??
    "";
  const date =
    crawlDate && !/^Y{2,}/.test(crawlDate)
      ? crawlDate
      : new Date().toISOString().slice(0, 10);

  return { title, docVersion, date };
}

export function buildPandocArgs(
  inputPaths: string[],
  outputPath: string,
  metadata: PandocMetadata,
  pdfEngine = "xelatex",
  resourcePath?: string,
): string[] {
  const args = [
    ...inputPaths,
    "-o",
    outputPath,
    "--metadata",
    `title=${metadata.title}`,
    "--metadata",
    `version=${metadata.docVersion}`,
    "--metadata",
    `date=${metadata.date}`,
    "-V",
    "lang=pt-BR",
    "--pdf-engine",
    pdfEngine,
    "-V",
    "geometry:margin=2.5cm",
    "-V",
    "documentclass=article",
    "--toc",
    "--toc-depth=2",
  ];
  if (resourcePath) {
    args.push("--resource-path", resourcePath);
  }
  return args;
}

export function defaultSpawnPandoc(args: string[]): PandocSpawnResult {
  const result = spawnSync("pandoc", args, { encoding: "utf8" });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

export function isPandocAvailable(
  spawnFn: (args: string[]) => PandocSpawnResult = defaultSpawnPandoc,
): boolean {
  return spawnFn(["--version"]).status === 0;
}

/** Order used when PARTNER_DOCS_PDF_ENGINE is unset (first match on PATH wins). */
export const PDF_ENGINE_CANDIDATES = ["xelatex", "tectonic", "lualatex"] as const;

export type PdfEngineResolution =
  | { ok: true; engine: string; autoSelected: boolean }
  | { ok: false; message: string };

export function isPdfEngineAvailable(engine: string): boolean {
  const result = spawnSync(engine, ["--version"], { encoding: "utf8" });
  return result.status === 0;
}

export function resolvePdfEngine(
  explicit?: string,
  isAvailable: (engine: string) => boolean = isPdfEngineAvailable,
): PdfEngineResolution {
  const trimmed = explicit?.trim();
  if (trimmed) {
    if (!isAvailable(trimmed)) {
      return {
        ok: false,
        message: `PDF engine "${trimmed}" is not on PATH (PARTNER_DOCS_PDF_ENGINE). Install it or unset the variable.`,
      };
    }
    return { ok: true, engine: trimmed, autoSelected: false };
  }

  for (const candidate of PDF_ENGINE_CANDIDATES) {
    if (isPdfEngineAvailable(candidate)) {
      return { ok: true, engine: candidate, autoSelected: true };
    }
  }

  return {
    ok: false,
    message:
      "No PDF engine found (tried xelatex, tectonic, lualatex). Install Tectonic: brew install tectonic — or TeX with xelatex. You can also set PARTNER_DOCS_PDF_ENGINE=tectonic.",
  };
}

export function runBuild(options: BuildOptions = {}): BuildResult {
  const repoRoot = options.repoRoot ?? process.cwd();
  const manifestPath =
    options.manifestPath ?? manifestAbsolutePath(repoRoot);
  const validate =
    options.runValidationFn ??
    ((root: string, path?: string) => runValidation(root, path));
  const spawnPandoc = options.spawnPandocFn ?? defaultSpawnPandoc;
  const pdfEngineResolution = resolvePdfEngine(
    options.pdfEngine ?? process.env.PARTNER_DOCS_PDF_ENGINE,
  );
  if (!pdfEngineResolution.ok) {
    return {
      ok: false,
      exitCode: 2,
      phase: "prepare",
      errors: [
        {
          chapterId: "build",
          rule: "pdf-engine-missing",
          message: pdfEngineResolution.message,
        },
      ],
    };
  }
  const pdfEngine = pdfEngineResolution.engine;

  const validation = validate(repoRoot, manifestPath);
  if (!validation.ok) {
    return {
      ok: false,
      exitCode: 1,
      phase: "validate",
      errors: validation.errors,
    };
  }

  const manifest = loadManifestFromFile(manifestPath);
  const frontMatterPath = chapterAbsolutePath(
    repoRoot,
    FRONT_MATTER_RELATIVE_PATH,
  );
  if (!existsSync(frontMatterPath)) {
    return {
      ok: false,
      exitCode: 1,
      phase: "prepare",
      errors: [
        {
          chapterId: "front-matter",
          rule: "missing-front-matter",
          message: `Missing ${FRONT_MATTER_RELATIVE_PATH} under partner docs root`,
        },
      ],
    };
  }

  const inputPaths = orderedBuildAbsolutePaths(repoRoot, manifest);
  for (const path of inputPaths) {
    if (!existsSync(path)) {
      return {
        ok: false,
        exitCode: 1,
        phase: "prepare",
        errors: [
          {
            chapterId: "build-input",
            rule: "missing-build-input",
            message: `Missing build input: ${path}`,
          },
        ],
      };
    }
  }

  const metadata = parseFrontMatterMetadata(
    readFileSync(frontMatterPath, "utf8"),
  );
  const outputPath = resolvePdfOutputPath(repoRoot, manifest);
  mkdirSync(dirname(outputPath), { recursive: true });

  const needsMermaid = !options.skipMermaidPreprocess && inputPaths.some((p) =>
    hasMermaidBlocks(readFileSync(p, "utf8")),
  );
  if (needsMermaid && !isMermaidCliAvailable(repoRoot)) {
    return {
      ok: false,
      exitCode: 2,
      phase: "mermaid",
      errors: [
        {
          chapterId: "build",
          rule: "mermaid-cli-missing",
          message:
            "@mermaid-js/mermaid-cli (mmdc) is not installed. Run pnpm install at repo root (see docs/partner-ezopen-ptbr/README.md).",
        },
      ],
    };
  }

  if (
    needsMermaid &&
    !options.skipChromeInstall &&
    !resolveChromeExecutablePath()
  ) {
    const chromeInstall = installPuppeteerChromeHeadlessShell(repoRoot);
    if (chromeInstall.status !== 0) {
      return {
        ok: false,
        exitCode: chromeInstall.status ?? 1,
        phase: "mermaid",
        pandocStderr: chromeInstall.stderr,
        errors: [
          {
            chapterId: "build",
            rule: "puppeteer-chrome-install",
            message:
              "Could not install headless Chrome for Mermaid. Run: pnpm exec puppeteer browsers install chrome-headless-shell",
          },
        ],
      };
    }
  }

  let pandocInputs = inputPaths;
  let resourcePath: string | undefined;
  if (!options.skipMermaidPreprocess) {
    try {
      const staged = stageBuildInputsForPdf({
        partnerDocsRoot: partnerDocsDir(repoRoot),
        repoRoot,
        inputPaths,
        spawnMmdc: options.spawnMmdcFn,
      });
      pandocInputs = staged.stagedPaths;
      resourcePath = staged.stagingRoot;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        exitCode: 1,
        phase: "mermaid",
        pandocStderr: message,
        errors: [
          {
            chapterId: "build",
            rule: "mermaid-render",
            message,
          },
        ],
      };
    }
  }

  const pandocArgs = buildPandocArgs(
    pandocInputs,
    outputPath,
    metadata,
    pdfEngine,
    resourcePath,
  );
  const pandocResult = spawnPandoc(pandocArgs);
  if (pandocResult.status !== 0) {
    return {
      ok: false,
      exitCode: pandocResult.status ?? 1,
      phase: "pandoc",
      outputPath,
      pandocStderr: pandocResult.stderr,
    };
  }

  if (!existsSync(outputPath)) {
    return {
      ok: false,
      exitCode: 1,
      phase: "pandoc",
      outputPath,
      pandocStderr: "Pandoc exited 0 but PDF was not created",
    };
  }

  return {
    ok: true,
    exitCode: 0,
    phase: "pandoc",
    outputPath,
    pdfEngine,
    pdfEngineAutoSelected: pdfEngineResolution.autoSelected,
  };
}

function resolveArg(pathArg: string): string {
  return isAbsolute(pathArg) ? pathArg : resolve(process.cwd(), pathArg);
}

export function main(argv: string[] = process.argv.slice(2)): number {
  const repoRoot = argv[0] ? resolveArg(argv[0]) : process.cwd();
  const manifestPath = argv[1]
    ? resolveArg(argv[1])
    : manifestAbsolutePath(repoRoot);

  if (!isPandocAvailable()) {
    console.error(
      "pandoc is not installed or not on PATH. Install Pandoc ≥ 2.19 (see docs/partner-ezopen-ptbr/README.md).",
    );
    return 2;
  }

  const result = runBuild({ repoRoot, manifestPath });
  if (!result.ok) {
    if (result.errors?.length) {
      for (const err of result.errors) {
        console.error(`[${err.chapterId}] ${err.rule}: ${err.message}`);
      }
    }
    if (result.pandocStderr) {
      console.error(result.pandocStderr);
    }
    return result.exitCode;
  }

  const engineNote =
    result.pdfEngine && result.pdfEngine !== "xelatex"
      ? ` (pdf-engine: ${result.pdfEngine})`
      : result.pdfEngineAutoSelected && result.pdfEngine === "tectonic"
        ? ` (pdf-engine: tectonic, auto-selected)`
        : "";
  console.log(`OK: PDF written to ${result.outputPath}${engineNote}`);
  return 0;
}

const isCliEntry =
  process.argv[1] &&
  (process.argv[1].endsWith("build.ts") || process.argv[1].endsWith("build.js"));

if (isCliEntry) {
  process.exit(main());
}
