import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { EXPECTED_CHAPTER_PATHS, PARTNER_DOCS_ROOT } from "./expected-chapters.ts";
import {
  fileExists,
  hasH1Title,
  hasYouWillBeAbleToPlaceholder,
  partnerDocsDir,
  platformBasenamesAlign,
  validateScaffoldStructure,
} from "./scaffold-structure.ts";

const REPO_ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../..");

test("unit: shared protocol chapter exists", () => {
  assert.equal(
    fileExists(REPO_ROOT, "part-01-shared-concepts/00-ezopen-protocol.md"),
    true,
  );
});

test("unit: web live preview chapter exists", () => {
  assert.equal(fileExists(REPO_ROOT, "part-04-web/02-live-preview.md"), true);
});

test("unit: android and ios auth chapters share basename", () => {
  const android = "part-02-android/01-auth.md";
  const ios = "part-03-ios/01-auth.md";
  assert.equal(basename(android), basename(ios));
  assert.equal(fileExists(REPO_ROOT, android), true);
  assert.equal(fileExists(REPO_ROOT, ios), true);
});

test("unit: README mentions Pandoc", () => {
  const readme = readFileSync(join(partnerDocsDir(REPO_ROOT), "README.md"), "utf8");
  assert.match(readme, /Pandoc/);
});

test("integration: every TechSpec chapter path exists on disk", () => {
  for (const rel of EXPECTED_CHAPTER_PATHS) {
    assert.equal(
      fileExists(REPO_ROOT, rel),
      true,
      `expected chapter at ${PARTNER_DOCS_ROOT}/${rel}`,
    );
  }
});

test("integration: scaffold validation passes for committed tree", () => {
  const result = validateScaffoldStructure(REPO_ROOT);
  assert.equal(result.ok, true, result.errors.join("\n"));
});

test("unit: hasH1Title accepts valid stub", () => {
  assert.equal(hasH1Title("# Título\n\nYou will be able to…\n"), true);
  assert.equal(hasH1Title("no heading\n"), false);
});

test("unit: hasYouWillBeAbleToPlaceholder", () => {
  assert.equal(hasYouWillBeAbleToPlaceholder("You will be able to…"), true);
  assert.equal(
    hasYouWillBeAbleToPlaceholder(
      "Ao concluir este capítulo, você será capaz de montar URIs.",
    ),
    true,
  );
  assert.equal(hasYouWillBeAbleToPlaceholder("sem placeholder"), false);
});

test("unit: platformBasenamesAlign", () => {
  assert.equal(platformBasenamesAlign(), true);
});

test("unit: assets directory exists", () => {
  assert.equal(existsSync(join(partnerDocsDir(REPO_ROOT), "assets")), true);
});
