import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { PARTNER_DOCS_ROOT } from "./expected-chapters.ts";
import { validateContentGuards, validateMustLinkTo } from "./validate.ts";
import { loadManifest, getChapterById } from "./manifest.ts";
import { partnerDocsDir } from "./scaffold-structure.ts";
import { validatePartnerDocs } from "./validate.ts";

const REPO_ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../..");
const WEB_PART = "part-04-web";
const ANDROID_PART = "part-02-android";
const MOSAIC_BEST_PRACTICES =
  "part-05-best-practices/01-mosaic-performance.md";
const EZOPEN_PROTOCOL = "part-01-shared-concepts/00-ezopen-protocol.md";
const ANDROID_WIFI = "part-02-android/06-wifi-config.md";
const IOS_WIFI = "part-03-ios/06-wifi-config.md";

const WEB_CHAPTER_IDS = [
  "web-auth",
  "web-live-preview",
  "web-playback",
  "web-device-control",
  "web-mosaic",
  "web-wifi-config",
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

test("unit: part-04-web basenames match part-02-android", () => {
  const android = listChapterBasenames(ANDROID_PART);
  const web = listChapterBasenames(WEB_PART);
  assert.deepEqual(web, android);
});

test("unit: web 02-live-preview.md matches web-live-preview manifest guards", () => {
  const manifest = loadManifest(
    join(REPO_ROOT, PARTNER_DOCS_ROOT, "partner-docs.manifest.json"),
  );
  const chapter = getChapterById(manifest, "web-live-preview");
  assert.ok(chapter);
  const body = readChapter(WEB_PART, "02-live-preview.md");
  const errors = [
    ...validateContentGuards(chapter, body),
    ...validateMustLinkTo(chapter, body),
  ];
  assert.deepEqual(errors, []);
  assert.match(body, new RegExp(EZOPEN_PROTOCOL.replace(/\./g, "\\.")));
});

test("unit: web 03-playback.md matches web-playback guards including .rec and accessToken", () => {
  const manifest = loadManifest(
    join(REPO_ROOT, PARTNER_DOCS_ROOT, "partner-docs.manifest.json"),
  );
  const chapter = getChapterById(manifest, "web-playback");
  assert.ok(chapter);
  const body = readChapter(WEB_PART, "03-playback.md");
  const errors = [
    ...validateContentGuards(chapter, body),
    ...validateMustLinkTo(chapter, body),
  ];
  assert.deepEqual(errors, []);
  assert.match(body, /\.rec/);
  assert.match(body, /accessToken/);
});

test("unit: web 05-mosaic.md links to mosaic best practices", () => {
  const body = readChapter(WEB_PART, "05-mosaic.md");
  assert.match(body, new RegExp(MOSAIC_BEST_PRACTICES.replace(/\./g, "\\.")));
});

test("unit: web 06-wifi-config.md states native-only and links Android/iOS wifi chapters", () => {
  const body = readChapter(WEB_PART, "06-wifi-config.md");
  assert.match(body, /nativ/i);
  assert.match(body, new RegExp(ANDROID_WIFI.replace(/\./g, "\\.")));
  assert.match(body, new RegExp(IOS_WIFI.replace(/\./g, "\\.")));
});

test("unit: no part-04-web file contains TBD", () => {
  for (const file of listChapterBasenames(WEB_PART)) {
    const body = readChapter(WEB_PART, file);
    assert.equal(
      /\bTBD\b/.test(body),
      false,
      `${file} must not contain TBD`,
    );
  }
});

test("integration: production manifest has zero errors for web chapter ids", () => {
  const manifestPath = join(
    REPO_ROOT,
    PARTNER_DOCS_ROOT,
    "partner-docs.manifest.json",
  );
  const manifest = loadManifest(manifestPath);
  const result = validatePartnerDocs(REPO_ROOT, manifest);
  const webErrors = result.errors.filter((e) =>
    WEB_CHAPTER_IDS.includes(e.chapterId as (typeof WEB_CHAPTER_IDS)[number]),
  );
  assert.deepEqual(
    webErrors,
    [],
    webErrors.map((e) => `[${e.chapterId}] ${e.rule}: ${e.message}`).join("\n"),
  );
});
