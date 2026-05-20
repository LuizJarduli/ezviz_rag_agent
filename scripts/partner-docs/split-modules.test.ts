import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { loadManifest } from "./manifest.ts";
import {
  DOC_MODULE_VALUES,
  groupChaptersByModule,
  moduleOutputRelativePath,
  runSplit,
  splitModules,
  SplitModulesError,
  assertValidModule,
} from "./split-modules.ts";
import type { PartnerDocsManifest } from "./types.ts";

const SCRIPT_DIR = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, "../..");

function fixtureRepo(name: string): string {
  return join(SCRIPT_DIR, "fixtures", name);
}

function fixtureManifestPath(name: string): string {
  return join(
    fixtureRepo(name),
    "docs/partner-ezopen-ptbr/partner-docs.manifest.json",
  );
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function makeTempRepoFromFixture(name: string): string {
  const tempRoot = mkdtempSync(join(tmpdir(), "partner-docs-split-"));
  cpSync(fixtureRepo(name), tempRoot, { recursive: true });
  return tempRoot;
}

test("unit: groupChaptersByModule places chapters in manifest module folders", () => {
  const manifest = loadManifest(fixtureManifestPath("valid"));
  const groups = groupChaptersByModule(manifest);
  assert.equal(groups.get("shared")?.length, 1);
  assert.equal(groups.get("web")?.length, 2);
  assert.equal(groups.get("best-practices")?.length, 1);
  assert.equal(groups.get("android")?.length, 0);
});

test("unit: moduleOutputRelativePath uses flat basename per module", () => {
  assert.equal(
    moduleOutputRelativePath("web", "part-04-web/02-live-preview.md"),
    "docs/partner-ezopen-ptbr/modules/web/02-live-preview.md",
  );
});

test("unit: unknown module throws SplitModulesError", () => {
  assert.throws(
    () => assertValidModule("windows-phone"),
    (err: unknown) => {
      assert.ok(err instanceof SplitModulesError);
      assert.match((err as Error).message, /Unknown module/);
      return true;
    },
  );
});

test("unit: split on fixture groups files under modules/{module}/", () => {
  const repoRoot = makeTempRepoFromFixture("valid");
  try {
    const manifestPath = join(
      repoRoot,
      "docs/partner-ezopen-ptbr/partner-docs.manifest.json",
    );
    const result = splitModules({ repoRoot, manifestPath });
    assert.equal(result.ok, true);
    assert.ok(
      existsSync(join(repoRoot, "docs/partner-ezopen-ptbr/modules/web/02-live-preview.md")),
    );
    assert.ok(
      existsSync(
        join(repoRoot, "docs/partner-ezopen-ptbr/modules/shared/00-ezopen-protocol.md"),
      ),
    );
    assert.ok(
      existsSync(
        join(repoRoot, "docs/partner-ezopen-ptbr/modules/shared/front-matter.md"),
      ),
    );
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("unit: running split twice yields identical file contents", () => {
  const repoRoot = makeTempRepoFromFixture("valid");
  try {
    const manifestPath = join(
      repoRoot,
      "docs/partner-ezopen-ptbr/partner-docs.manifest.json",
    );
    splitModules({ repoRoot, manifestPath });
    const target = join(
      repoRoot,
      "docs/partner-ezopen-ptbr/modules/web/02-live-preview.md",
    );
    const firstHash = sha256File(target);
    splitModules({ repoRoot, manifestPath });
    const secondHash = sha256File(target);
    assert.equal(firstHash, secondHash);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("unit: invalid module in manifest fails during split", () => {
  const repoRoot = makeTempRepoFromFixture("valid");
  try {
    const manifestPath = join(
      repoRoot,
      "docs/partner-ezopen-ptbr/partner-docs.manifest.json",
    );
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as PartnerDocsManifest;
    manifest.chapters[0] = { ...manifest.chapters[0]!, module: "legacy" as never };
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    assert.throws(
      () => splitModules({ repoRoot, manifestPath }),
      (err: unknown) => err instanceof SplitModulesError,
    );
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("unit: runSplit returns validate phase when validation fails", () => {
  const repoRoot = fixtureRepo("invalid-tbd");
  const manifestPath = fixtureManifestPath("invalid-tbd");
  const result = runSplit(repoRoot, manifestPath, () => ({
    ok: false,
    errors: [{ chapterId: "x", rule: "stub", message: "fail" }],
  }));
  assert.equal(result.ok, false);
  assert.equal(result.phase, "validate");
  assert.equal(result.filesWritten.length, 0);
});

test("unit: DOC_MODULE_VALUES lists all five ADR-001 modules", () => {
  assert.deepEqual([...DOC_MODULE_VALUES], [
    "shared",
    "android",
    "ios",
    "web",
    "best-practices",
  ]);
});
