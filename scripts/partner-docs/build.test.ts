import assert from "node:assert/strict";
import { existsSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildPandocArgs,
  FRONT_MATTER_RELATIVE_PATH,
  orderedBuildRelativePaths,
  orderedChapterRelativePaths,
  parseFrontMatterMetadata,
  resolvePdfEngine,
  resolvePdfOutputPath,
  runBuild,
} from "./build.ts";
import { loadManifestFromFile, loadManifestFromRepo } from "./manifest.ts";
import { partnerDocsDir } from "./scaffold-structure.ts";

const REPO_ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../..");

test("unit: ordered chapter paths match manifest sequence length", () => {
  const manifest = loadManifestFromRepo(REPO_ROOT);
  const paths = orderedChapterRelativePaths(manifest);
  assert.equal(paths.length, manifest.chapters.length);
  assert.equal(paths.length, 24);
  assert.equal(paths[0], manifest.chapters[0].path);
  assert.equal(paths.at(-1), manifest.chapters.at(-1)?.path);
});

test("unit: ordered build paths prepend front matter", () => {
  const manifest = loadManifestFromRepo(REPO_ROOT);
  const paths = orderedBuildRelativePaths(manifest);
  assert.equal(paths[0], FRONT_MATTER_RELATIVE_PATH);
  assert.equal(paths.length, manifest.chapters.length + 1);
});

test("unit: resolvePdfOutputPath matches manifest pdf.output", () => {
  const manifest = loadManifestFromRepo(REPO_ROOT);
  const output = resolvePdfOutputPath(REPO_ROOT, manifest);
  assert.equal(
    output,
    join(partnerDocsDir(REPO_ROOT), "dist/ezviz-ezopen-partner-ptbr.pdf"),
  );
});

test("unit: parseFrontMatterMetadata reads YAML block", () => {
  const md = `---
title: "Título de teste"
docVersion: "1.2.3"
crawlDate: "2026-01-15"
---
# Body`;
  const meta = parseFrontMatterMetadata(md);
  assert.equal(meta.title, "Título de teste");
  assert.equal(meta.docVersion, "1.2.3");
  assert.equal(meta.date, "2026-01-15");
});

test("unit: parseFrontMatterMetadata uses today when crawlDate is placeholder", () => {
  const md = `---
title: "T"
docVersion: "0.1"
crawlDate: "YYYY-MM-DD"
---`;
  const meta = parseFrontMatterMetadata(md);
  assert.match(meta.date, /^\d{4}-\d{2}-\d{2}$/);
});

test("unit: buildPandocArgs includes metadata and pt-BR lang", () => {
  const args = buildPandocArgs(
    ["/tmp/front-matter.md", "/tmp/chapter.md"],
    "/tmp/out.pdf",
    { title: "Guia", docVersion: "1.0.0", date: "2026-05-19" },
  );
  assert.ok(args.includes("/tmp/front-matter.md"));
  assert.ok(args.includes("-o"));
  assert.ok(args.includes("/tmp/out.pdf"));
  const titleMeta = args[args.indexOf("--metadata") + 1];
  assert.equal(titleMeta, "title=Guia");
  assert.ok(args.includes("lang=pt-BR"));
  assert.ok(args.includes("xelatex"));
});

test("unit: resolvePdfEngine uses explicit engine when available", () => {
  const resolution = resolvePdfEngine(
    "tectonic",
    (engine) => engine === "tectonic",
  );
  assert.equal(resolution.ok, true);
  if (resolution.ok) {
    assert.equal(resolution.engine, "tectonic");
    assert.equal(resolution.autoSelected, false);
  }
});

test("unit: resolvePdfEngine auto-selects first available candidate", () => {
  const resolution = resolvePdfEngine(undefined, (engine) => engine === "tectonic");
  assert.equal(resolution.ok, true);
  if (resolution.ok) {
    assert.equal(resolution.engine, "tectonic");
    assert.equal(resolution.autoSelected, true);
  }
});

test("unit: resolvePdfEngine fails when explicit engine is missing", () => {
  const resolution = resolvePdfEngine(
    "definitely-not-a-pdf-engine-xyz",
    () => false,
  );
  assert.equal(resolution.ok, false);
  if (!resolution.ok) {
    assert.match(resolution.message, /definitely-not-a-pdf-engine-xyz/);
  }
});

test("unit: runBuild fails in prepare phase when no pdf engine is available", () => {
  const fixtureRoot = join(REPO_ROOT, "scripts/partner-docs/fixtures/valid");
  const manifestPath = join(
    fixtureRoot,
    "docs/partner-ezopen-ptbr/partner-docs.manifest.json",
  );
  const result = runBuild({
    repoRoot: fixtureRoot,
    manifestPath,
    pdfEngine: "definitely-not-a-pdf-engine-xyz",
    skipMermaidPreprocess: true,
    runValidationFn: () => ({ ok: true, errors: [] }),
    spawnPandocFn: () => {
      throw new Error("Pandoc must not run");
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.phase, "prepare");
  assert.ok(result.errors?.some((e) => e.rule === "pdf-engine-missing"));
});

test("unit: buildPandocArgs adds --resource-path when staging mermaid assets", () => {
  const args = buildPandocArgs(
    ["/tmp/staging/front-matter.md"],
    "/tmp/out.pdf",
    { title: "Guia", docVersion: "1.0.0", date: "2026-05-19" },
    "tectonic",
    "/tmp/staging",
  );
  assert.ok(args.includes("--resource-path"));
  assert.ok(args.includes("/tmp/staging"));
});

test("unit: runBuild aborts before Pandoc when validation fails", () => {
  let pandocCalled = false;
  const invalidRoot = join(REPO_ROOT, "scripts/partner-docs/fixtures/invalid-tbd");
  const result = runBuild({
    repoRoot: invalidRoot,
    manifestPath: join(
      invalidRoot,
      "docs/partner-ezopen-ptbr/partner-docs.manifest.json",
    ),
    spawnPandocFn: () => {
      pandocCalled = true;
      return { status: 0, stdout: "", stderr: "" };
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.phase, "validate");
  assert.equal(pandocCalled, false);
});

test("unit: runBuild invokes Pandoc with mocked success", () => {
  const fixtureRoot = join(REPO_ROOT, "scripts/partner-docs/fixtures/valid");
  const manifestPath = join(
    fixtureRoot,
    "docs/partner-ezopen-ptbr/partner-docs.manifest.json",
  );
  const manifest = loadManifestFromFile(manifestPath);
  const outputPath = resolvePdfOutputPath(fixtureRoot, manifest);
  if (existsSync(outputPath)) {
    unlinkSync(outputPath);
  }

  let capturedArgs: string[] = [];
  const result = runBuild({
    repoRoot: fixtureRoot,
    manifestPath,
    spawnPandocFn: (args) => {
      capturedArgs = args;
      const outIndex = args.indexOf("-o");
      const pdfPath = args[outIndex + 1];
      writeFileSync(pdfPath, "%PDF-1.4 mock");
      return { status: 0, stdout: "", stderr: "" };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.phase, "pandoc");
  assert.ok(capturedArgs.length > 0);
  assert.equal(
    capturedArgs.filter((a) => a.endsWith(".md")).length,
    orderedBuildRelativePaths(manifest).length,
  );
  assert.ok(existsSync(outputPath));
  unlinkSync(outputPath);
});

test("unit: runBuild fails in prepare phase when front matter is missing", () => {
  const fixtureRoot = join(REPO_ROOT, "scripts/partner-docs/fixtures/valid");
  const manifestPath = join(
    fixtureRoot,
    "docs/partner-ezopen-ptbr/partner-docs.manifest.json",
  );
  const frontPath = join(
    fixtureRoot,
    "docs/partner-ezopen-ptbr/front-matter.md",
  );
  const hiddenPath = `${frontPath}.off`;
  renameSync(frontPath, hiddenPath);
  try {
    const result = runBuild({
      repoRoot: fixtureRoot,
      manifestPath,
      runValidationFn: () => ({ ok: true, errors: [] }),
      spawnPandocFn: () => {
        throw new Error("Pandoc must not run");
      },
    });
    assert.equal(result.ok, false);
    assert.equal(result.phase, "prepare");
    assert.ok(
      result.errors?.some((e) => e.rule === "missing-front-matter"),
    );
  } finally {
    renameSync(hiddenPath, frontPath);
  }
});

test("unit: runBuild reports pandoc phase failure when engine returns non-zero", () => {
  const fixtureRoot = join(REPO_ROOT, "scripts/partner-docs/fixtures/valid");
  const manifestPath = join(
    fixtureRoot,
    "docs/partner-ezopen-ptbr/partner-docs.manifest.json",
  );
  const result = runBuild({
    repoRoot: fixtureRoot,
    manifestPath,
    spawnPandocFn: () => ({
      status: 1,
      stdout: "",
      stderr: "xelatex not found",
    }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.phase, "pandoc");
  assert.match(result.pandocStderr ?? "", /xelatex not found/);
});
