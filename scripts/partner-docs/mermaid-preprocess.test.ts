import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  countMermaidBlocks,
  hasMermaidBlocks,
  preprocessMermaidInMarkdown,
  stageBuildInputsForPdf,
} from "./mermaid-preprocess.ts";

const REPO_ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../..");

test("unit: hasMermaidBlocks and countMermaidBlocks", () => {
  const md = "# T\n\n```mermaid\nsequenceDiagram\n  A->>B: hi\n```\n";
  assert.equal(hasMermaidBlocks(md), true);
  assert.equal(countMermaidBlocks(md), 1);
  assert.equal(hasMermaidBlocks("# plain\n"), false);
});

test("unit: preprocessMermaidInMarkdown replaces fence with image", () => {
  const dir = mkdtempSync(join(tmpdir(), "mermaid-test-"));
  const mermaidDir = join(dir, ".mermaid");
  const resourceBaseDir = dir;
  try {
    const md = "```mermaid\nsequenceDiagram\n  A->>B: x\n```";
    const { markdown, diagramCount } = preprocessMermaidInMarkdown(md, {
      sourceId: "part-04-web-01-auth",
      mermaidDir,
      resourceBaseDir,
      repoRoot: REPO_ROOT,
      spawnMmdc: (inputPath, outputPath) => {
        writeFileSync(outputPath, "PNG");
        return { status: 0, stderr: "" };
      },
    });
    assert.equal(diagramCount, 1);
    assert.match(
      markdown,
      /!\[Diagrama\]\(\.mermaid\/part-04-web-01-auth-0\.png\)/,
    );
    assert.doesNotMatch(markdown, /```mermaid/);
    assert.ok(existsSync(join(mermaidDir, "part-04-web-01-auth-0.png")));
    assert.ok(existsSync(join(mermaidDir, "part-04-web-01-auth-0.mmd")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("unit: stageBuildInputsForPdf copies chapter without mermaid unchanged", () => {
  const partnerRoot = mkdtempSync(join(tmpdir(), "partner-docs-"));
  const source = join(partnerRoot, "front-matter.md");
  writeFileSync(source, "# FM\n\nNo diagrams.\n", "utf8");
  try {
    const staged = stageBuildInputsForPdf({
      partnerDocsRoot: partnerRoot,
      repoRoot: REPO_ROOT,
      inputPaths: [source],
      spawnMmdc: () => {
        throw new Error("mmdc must not run");
      },
    });
    assert.equal(staged.stagedPaths.length, 1);
    assert.equal(
      readFileSync(staged.stagedPaths[0], "utf8"),
      "# FM\n\nNo diagrams.\n",
    );
  } finally {
    rmSync(partnerRoot, { recursive: true, force: true });
  }
});
