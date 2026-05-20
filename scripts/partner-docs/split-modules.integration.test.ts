import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { EXPECTED_CHAPTER_PATHS } from "./expected-chapters.ts";
import { loadManifestFromRepo } from "./manifest.ts";
import { DOC_MODULE_VALUES, modulesRootAbsolutePath, runSplit } from "./split-modules.ts";
import { validatePartnerDocs } from "./validate.ts";

const REPO_ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../..");
const MODULES_ROOT = modulesRootAbsolutePath(REPO_ROOT);

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function listMarkdownFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir).filter((name) => name.endsWith(".md"));
}

test("integration: split output chapter count matches manifest", () => {
  const manifest = loadManifestFromRepo(REPO_ROOT);
  const result = runSplit(REPO_ROOT);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  const chapterBasenames = new Set(
    manifest.chapters.map((c) => c.path.replace(/^.*\//, "")),
  );
  const chapterOutputs = result.filesWritten.filter(
    (p) =>
      p.includes("/modules/") &&
      p.endsWith(".md") &&
      chapterBasenames.has(p.replace(/^.*\//, "")),
  );
  assert.equal(chapterOutputs.length, manifest.chapters.length);
});

test("integration: modules/web/02-live-preview.md byte-matches source", () => {
  runSplit(REPO_ROOT);
  const source = join(
    REPO_ROOT,
    "docs/partner-ezopen-ptbr/part-04-web/02-live-preview.md",
  );
  const moduleCopy = join(
    REPO_ROOT,
    "docs/partner-ezopen-ptbr/modules/web/02-live-preview.md",
  );
  assert.ok(existsSync(moduleCopy));
  assert.equal(sha256File(source), sha256File(moduleCopy));
});

test("integration: all five module directories exist and are non-empty", () => {
  runSplit(REPO_ROOT);
  for (const module of DOC_MODULE_VALUES) {
    const dir = join(MODULES_ROOT, module);
    assert.ok(existsSync(dir), `missing module dir: ${module}`);
    const files = listMarkdownFiles(dir);
    assert.ok(files.length > 0, `module ${module} has no markdown files`);
  }
});

test("integration: module layout matches ADR-001 part boundaries", () => {
  const manifest = loadManifestFromRepo(REPO_ROOT);
  runSplit(REPO_ROOT);
  const expectedCounts: Record<string, number> = {
    shared: 0,
    android: 0,
    ios: 0,
    web: 0,
    "best-practices": 0,
  };
  for (const chapter of manifest.chapters) {
    expectedCounts[chapter.module] = (expectedCounts[chapter.module] ?? 0) + 1;
  }
  for (const module of DOC_MODULE_VALUES) {
    const dir = join(MODULES_ROOT, module);
    const mdCount = listMarkdownFiles(dir).filter((f) => f !== "front-matter.md").length;
    assert.equal(
      mdCount,
      expectedCounts[module],
      `module ${module} file count vs manifest`,
    );
  }
  assert.equal(manifest.chapters.length, EXPECTED_CHAPTER_PATHS.length);
});

test("integration: validate still passes on primary source tree after split", () => {
  runSplit(REPO_ROOT);
  const manifest = loadManifestFromRepo(REPO_ROOT);
  const validation = validatePartnerDocs(REPO_ROOT, manifest);
  assert.equal(validation.ok, true, JSON.stringify(validation.errors));
});

const skipPnpmIntegration =
  process.env.PARTNER_DOCS_SUPPRESS_INTEGRATION === "1";

test(
  "integration: pnpm partner-docs:split exits 0 and writes modules",
  { skip: skipPnpmIntegration },
  () => {
    const result = spawnSync("pnpm", ["partner-docs:split"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: {
        ...process.env,
        PARTNER_DOCS_SUPPRESS_INTEGRATION: "1",
      },
    });
    const output = `${result.stdout}\n${result.stderr}`;
    assert.equal(
      result.status,
      0,
      `partner-docs:split failed (exit ${result.status}):\n${output}`,
    );
    const webLive = join(MODULES_ROOT, "web", "02-live-preview.md");
    assert.ok(existsSync(webLive));
    assert.ok(statSync(webLive).size > 0);
  },
);
