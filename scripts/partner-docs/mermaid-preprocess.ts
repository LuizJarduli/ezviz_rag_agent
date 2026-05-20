import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { spawnSync } from "node:child_process";

/** Matches ```mermaid fenced blocks (same shape as GitHub / VS Code preview). */
export const MERMAID_FENCE_RE = /```mermaid\s*\r?\n([\s\S]*?)```/g;

export type MmdcSpawnResult = {
  status: number | null;
  stderr: string;
};

export type MmdcSpawnFn = (
  inputPath: string,
  outputPath: string,
) => MmdcSpawnResult;

export function hasMermaidBlocks(markdown: string): boolean {
  return markdown.includes("```mermaid");
}

export function countMermaidBlocks(markdown: string): number {
  return [...markdown.matchAll(MERMAID_FENCE_RE)].length;
}

export function resolveMmdcCommand(repoRoot: string): string {
  const binName = process.platform === "win32" ? "mmdc.cmd" : "mmdc";
  const localBin = join(repoRoot, "node_modules", ".bin", binName);
  return existsSync(localBin) ? localBin : "mmdc";
}

/** Prefer explicit env, then common system Chrome/Chromium installs. */
export function resolveChromeExecutablePath(): string | undefined {
  if (process.env.PUPPETEER_EXECUTABLE_PATH?.trim()) {
    return process.env.PUPPETEER_EXECUTABLE_PATH.trim();
  }
  const candidates =
    process.platform === "darwin"
      ? [
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/Applications/Chromium.app/Contents/MacOS/Chromium",
        ]
      : process.platform === "win32"
        ? [
            join(
              process.env.PROGRAMFILES ?? "C:\\Program Files",
              "Google",
              "Chrome",
              "Application",
              "chrome.exe",
            ),
          ]
        : [
            "/usr/bin/google-chrome",
            "/usr/bin/google-chrome-stable",
            "/usr/bin/chromium",
            "/usr/bin/chromium-browser",
          ];
  return candidates.find((path) => existsSync(path));
}

export function mmdcSpawnEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  const chrome = resolveChromeExecutablePath();
  if (chrome) {
    env.PUPPETEER_EXECUTABLE_PATH = chrome;
  }
  return env;
}

export function defaultMmdcSpawn(
  repoRoot: string,
  inputPath: string,
  outputPath: string,
): MmdcSpawnResult {
  const mmdc = resolveMmdcCommand(repoRoot);
  const result = spawnSync(
    mmdc,
    ["-i", inputPath, "-o", outputPath, "-b", "white", "-w", "1200"],
    { encoding: "utf8", env: mmdcSpawnEnv() },
  );
  return {
    status: result.status,
    stderr: [result.stderr, result.stdout].filter(Boolean).join("\n"),
  };
}

/** Installs Puppeteer's headless Chrome when no system browser is found. */
export function installPuppeteerChromeHeadlessShell(
  repoRoot: string,
): MmdcSpawnResult {
  const result = spawnSync(
    "pnpm",
    ["exec", "puppeteer", "browsers", "install", "chrome-headless-shell"],
    { cwd: repoRoot, encoding: "utf8", env: process.env },
  );
  return {
    status: result.status,
    stderr: [result.stderr, result.stdout].filter(Boolean).join("\n"),
  };
}

export function isMermaidCliAvailable(repoRoot: string): boolean {
  const mmdc = resolveMmdcCommand(repoRoot);
  if (mmdc === "mmdc" && !existsSync(mmdc)) {
    const probe = spawnSync("mmdc", ["--version"], { encoding: "utf8" });
    return probe.status === 0;
  }
  return spawnSync(mmdc, ["--version"], { encoding: "utf8" }).status === 0;
}

export interface PreprocessMermaidOptions {
  sourceId: string;
  mermaidDir: string;
  /** Pandoc resource base (staging root); image paths are relative to this directory. */
  resourceBaseDir: string;
  repoRoot: string;
  spawnMmdc?: MmdcSpawnFn;
}

/**
 * Replaces ```mermaid blocks with PNG figures for Pandoc PDF output.
 * Image paths are relative to `resourceBaseDir` (Pandoc `--resource-path`).
 */
export function preprocessMermaidInMarkdown(
  markdown: string,
  options: PreprocessMermaidOptions,
): { markdown: string; diagramCount: number } {
  const spawnMmdc =
    options.spawnMmdc ??
    ((inputPath, outputPath) =>
      defaultMmdcSpawn(options.repoRoot, inputPath, outputPath));

  mkdirSync(options.mermaidDir, { recursive: true });

  let diagramIndex = 0;
  const processed = markdown.replace(
    MERMAID_FENCE_RE,
    (_match, diagramSource: string) => {
      const imageName = `${options.sourceId}-${diagramIndex}.png`;
      const imageAbs = join(options.mermaidDir, imageName);
      const mmdPath = join(options.mermaidDir, `${options.sourceId}-${diagramIndex}.mmd`);
      writeFileSync(mmdPath, diagramSource.trimEnd() + "\n", "utf8");

      const result = spawnMmdc(mmdPath, imageAbs);
      if (result.status !== 0) {
        throw new Error(
          `mmdc failed for ${options.sourceId} diagram ${diagramIndex}: ${result.stderr}`,
        );
      }
      if (!existsSync(imageAbs)) {
        throw new Error(
          `mmdc exited 0 but PNG missing: ${imageAbs} (${options.sourceId} #${diagramIndex})`,
        );
      }

      const imageRel = relative(options.resourceBaseDir, imageAbs).replace(
        /\\/g,
        "/",
      );
      diagramIndex += 1;
      return `![Diagrama](${imageRel}){ width=95% }`;
    },
  );

  return { markdown: processed, diagramCount: diagramIndex };
}

export const BUILD_STAGING_DIRNAME = ".build-staging";

export function buildStagingRoot(partnerDocsRoot: string): string {
  return join(partnerDocsRoot, "dist", BUILD_STAGING_DIRNAME);
}

export interface StageBuildInputsOptions {
  partnerDocsRoot: string;
  repoRoot: string;
  inputPaths: string[];
  spawnMmdc?: MmdcSpawnFn;
}

export interface StageBuildInputsResult {
  stagedPaths: string[];
  stagingRoot: string;
}

/**
 * Copies manifest-ordered sources into dist/.build-staging with Mermaid → PNG.
 */
export function stageBuildInputsForPdf(
  options: StageBuildInputsOptions,
): StageBuildInputsResult {
  const stagingRoot = buildStagingRoot(options.partnerDocsRoot);
  const mermaidDir = join(stagingRoot, ".mermaid");

  if (existsSync(stagingRoot)) {
    rmSync(stagingRoot, { recursive: true, force: true });
  }
  mkdirSync(mermaidDir, { recursive: true });

  const stagedPaths: string[] = [];

  for (const sourcePath of options.inputPaths) {
    const rel = relative(options.partnerDocsRoot, sourcePath);
    const destPath = join(stagingRoot, rel);
    mkdirSync(dirname(destPath), { recursive: true });

    const raw = readFileSync(sourcePath, "utf8");
    const sourceId = rel.replace(/\.md$/i, "").replace(/\//g, "-");

    let body = raw;
    if (hasMermaidBlocks(raw)) {
      const result = preprocessMermaidInMarkdown(raw, {
        sourceId,
        mermaidDir,
        resourceBaseDir: stagingRoot,
        repoRoot: options.repoRoot,
        spawnMmdc: options.spawnMmdc,
      });
      body = result.markdown;
    }

    writeFileSync(destPath, body, "utf8");
    stagedPaths.push(destPath);
  }

  return { stagedPaths, stagingRoot };
}
