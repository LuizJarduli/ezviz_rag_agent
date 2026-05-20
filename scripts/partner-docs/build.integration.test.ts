import assert from "node:assert/strict";
import { existsSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { isPandocAvailable, resolvePdfOutputPath, runBuild } from "./build.ts";
import { loadManifestFromRepo } from "./manifest.ts";

const REPO_ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../..");
const SCRIPT_DIR = join(REPO_ROOT, "scripts/partner-docs");

function fixtureRepo(name: string): string {
  return join(SCRIPT_DIR, "fixtures", name);
}

function fixtureManifestPath(repoRoot: string): string {
  return join(repoRoot, "docs/partner-ezopen-ptbr/partner-docs.manifest.json");
}

test("integration: build exits non-zero on invalid fixture without creating PDF", () => {
  const repoRoot = fixtureRepo("invalid-tbd");
  const manifestPath = fixtureManifestPath(repoRoot);
  const manifest = loadManifestFromRepo(repoRoot);
  const outputPath = resolvePdfOutputPath(repoRoot, manifest);
  if (existsSync(outputPath)) {
    unlinkSync(outputPath);
  }

  const result = runBuild({
    repoRoot,
    manifestPath,
    spawnPandocFn: () => {
      throw new Error("Pandoc must not run when validation fails");
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.phase, "validate");
  assert.equal(existsSync(outputPath), false);
});

test("integration: build-pdf.sh runs validate before build module", () => {
  const script = join(SCRIPT_DIR, "build-pdf.sh");
  const result = spawnSync("bash", [script], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  const output = `${result.stdout}\n${result.stderr}`;
  if (!isPandocAvailable()) {
    assert.equal(result.status, 2);
    assert.match(output, /pandoc is not installed/i);
    return;
  }
  assert.ok(
    result.status === 0 || result.status === 1,
    `unexpected exit ${result.status}:\n${output}`,
  );
});

const skipPandocSmoke =
  process.env.PANDOC_AVAILABLE !== "1" || !isPandocAvailable();

test(
  "integration: pnpm partner-docs:build creates non-empty PDF when Pandoc is available",
  { skip: skipPandocSmoke },
  () => {
    const manifest = loadManifestFromRepo(REPO_ROOT);
    const outputPath = resolvePdfOutputPath(REPO_ROOT, manifest);
    if (existsSync(outputPath)) {
      unlinkSync(outputPath);
    }

    const result = spawnSync(
      "pnpm",
      ["partner-docs:build"],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        env: {
          ...process.env,
          PARTNER_DOCS_SUPPRESS_INTEGRATION: "1",
        },
      },
    );
    const output = `${result.stdout}\n${result.stderr}`;
    assert.equal(
      result.status,
      0,
      `partner-docs:build failed (exit ${result.status}):\n${output}`,
    );
    assert.ok(existsSync(outputPath), `PDF missing at ${outputPath}`);
    assert.ok(statSync(outputPath).size > 0);
  },
);
