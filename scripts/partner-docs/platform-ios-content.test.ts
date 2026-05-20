import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { PARTNER_DOCS_ROOT } from "./expected-chapters.ts";
import { loadManifest } from "./manifest.ts";
import { partnerDocsDir } from "./scaffold-structure.ts";
import { validatePartnerDocs } from "./validate.ts";

const REPO_ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../..");
const IOS_PART = "part-03-ios";
const ANDROID_PART = "part-02-android";
const MOSAIC_BEST_PRACTICES =
  "part-05-best-practices/01-mosaic-performance.md";

const IOS_CHAPTER_IDS = [
  "ios-auth",
  "ios-live-preview",
  "ios-playback",
  "ios-device-control",
  "ios-mosaic",
  "ios-wifi-config",
] as const;

function listChapterBasenames(partDir: string): string[] {
  const dir = join(partnerDocsDir(REPO_ROOT), partDir);
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => basename(f))
    .sort();
}

function readChapter(partDir: string, file: string): string {
  return readFileSync(
    join(partnerDocsDir(REPO_ROOT), partDir, file),
    "utf8",
  );
}

test("unit: part-03-ios basenames match part-02-android", () => {
  const android = listChapterBasenames(ANDROID_PART);
  const ios = listChapterBasenames(IOS_PART);
  assert.deepEqual(ios, android);
});

test("unit: ios 05-mosaic.md links to mosaic best practices", () => {
  const body = readChapter(IOS_PART, "05-mosaic.md");
  assert.match(body, new RegExp(MOSAIC_BEST_PRACTICES.replace(/\./g, "\\.")));
});

test("unit: no part-03-ios file contains TBD", () => {
  for (const file of listChapterBasenames(IOS_PART)) {
    const body = readChapter(IOS_PART, file);
    assert.equal(
      /\bTBD\b/.test(body),
      false,
      `${file} must not contain TBD`,
    );
  }
});

test("integration: production manifest has zero errors for ios chapter ids", () => {
  const manifestPath = join(
    REPO_ROOT,
    PARTNER_DOCS_ROOT,
    "partner-docs.manifest.json",
  );
  const manifest = loadManifest(manifestPath);
  const result = validatePartnerDocs(REPO_ROOT, manifest);
  const iosErrors = result.errors.filter((e) =>
    IOS_CHAPTER_IDS.includes(e.chapterId as (typeof IOS_CHAPTER_IDS)[number]),
  );
  assert.deepEqual(
    iosErrors,
    [],
    iosErrors.map((e) => `[${e.chapterId}] ${e.rule}: ${e.message}`).join("\n"),
  );
});
