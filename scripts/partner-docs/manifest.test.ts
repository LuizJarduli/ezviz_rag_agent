import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { EXPECTED_CHAPTER_PATHS, PARTNER_DOCS_ROOT } from "./expected-chapters.ts";
import {
  getChapterById,
  getDuplicateChapterIds,
  loadManifest,
  loadManifestFromFile,
  loadManifestFromRepo,
  manifestAbsolutePath,
  manifestPathsAlignWithExpected,
  findMissingChapterPaths,
  MANIFEST_RELATIVE_PATH,
  stripManifestAuthoringComment,
} from "./manifest.ts";
import { ManifestLoadError } from "./types.ts";
import { fileExists } from "./scaffold-structure.ts";

const REPO_ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../..");
const MANIFEST_PATH = manifestAbsolutePath(REPO_ROOT);

test("unit: stripManifestAuthoringComment removes leading HTML comment", () => {
  const raw = `<!-- note -->\n{"version":"1.0.0"}`;
  assert.equal(stripManifestAuthoringComment(raw), '{"version":"1.0.0"}');
});

test("unit: parsing manifest yields at least 20 chapters", () => {
  const manifest = loadManifestFromRepo(REPO_ROOT);
  assert.ok(manifest.chapters.length >= 20);
  assert.equal(manifest.chapters.length, 24);
  assert.equal(manifest.locale, "pt-BR");
  assert.equal(manifest.version, "1.0.0");
  assert.match(manifest.pdf.title, /EZOpen/);
  assert.equal(manifest.pdf.output, "dist/ezviz-ezopen-partner-ptbr.pdf");
});

test("unit: duplicate chapter ids are detected", () => {
  const manifest = loadManifestFromRepo(REPO_ROOT);
  assert.deepEqual(getDuplicateChapterIds(manifest.chapters), []);

  const duplicates = getDuplicateChapterIds([
    { id: "a", path: "a.md" } as never,
    { id: "a", path: "b.md" } as never,
    { id: "b", path: "c.md" } as never,
  ]);
  assert.deepEqual(duplicates, ["a"]);
});

test("unit: loadManifest throws ManifestLoadError for duplicate ids fixture", () => {
  const dupPath = join(
    REPO_ROOT,
    "scripts/partner-docs/fixtures/invalid-duplicate-id/partner-docs.manifest.json",
  );
  assert.throws(() => loadManifest(dupPath), ManifestLoadError);
});

test("unit: web-live-preview includes ezopen and mount guard patterns", () => {
  const manifest = loadManifestFromRepo(REPO_ROOT);
  const chapter = getChapterById(manifest, "web-live-preview");
  assert.ok(chapter);
  const patterns = chapter.guards?.mustMatchOne ?? [];
  assert.ok(patterns.some((p) => p.includes("ezopen://")));
  assert.ok(patterns.some((p) => p.includes(".live")));
  assert.ok(patterns.some((p) => /container|DOM|montar/i.test(p)));
  assert.deepEqual(chapter.mustLinkTo, ["part-01-shared-concepts/00-ezopen-protocol.md"]);
});

test("unit: web-playback includes rec stream and protocol link", () => {
  const manifest = loadManifestFromRepo(REPO_ROOT);
  const chapter = getChapterById(manifest, "web-playback");
  assert.ok(chapter);
  const patterns = chapter.guards?.mustMatchOne ?? [];
  assert.ok(patterns.some((p) => p.includes("ezopen://")));
  assert.ok(patterns.some((p) => p.includes(".rec")));
  assert.ok(patterns.some((p) => p.includes("accessToken")));
  assert.deepEqual(chapter.mustLinkTo, ["part-01-shared-concepts/00-ezopen-protocol.md"]);
});

test("unit: every chapter path resolves under partner docs root", () => {
  const manifest = loadManifestFromRepo(REPO_ROOT);
  for (const chapter of manifest.chapters) {
    assert.ok(
      !chapter.path.startsWith("/"),
      `path must be relative: ${chapter.path}`,
    );
    assert.equal(
      fileExists(REPO_ROOT, chapter.path),
      true,
      `missing ${PARTNER_DOCS_ROOT}/${chapter.path}`,
    );
  }
});

test("unit: manifest chapter paths match EXPECTED_CHAPTER_PATHS", () => {
  const manifest = loadManifestFromRepo(REPO_ROOT);
  assert.equal(manifestPathsAlignWithExpected(manifest), true);
  assert.deepEqual(
    manifest.chapters.map((c) => c.path),
    [...EXPECTED_CHAPTER_PATHS],
  );
});

test("unit: mosaic platform chapters link Part V best practices", () => {
  const manifest = loadManifestFromRepo(REPO_ROOT);
  for (const id of ["android-mosaic", "ios-mosaic", "web-mosaic"]) {
    const chapter = getChapterById(manifest, id);
    assert.ok(chapter, id);
    assert.deepEqual(chapter.mustLinkTo, [
      "part-05-best-practices/01-mosaic-performance.md",
    ]);
  }
});

test("unit: shared-ezopen guard patterns per ADR-004", () => {
  const manifest = loadManifestFromRepo(REPO_ROOT);
  const chapter = getChapterById(manifest, "shared-ezopen");
  assert.ok(chapter?.guards?.mustMatchOne?.includes("ezopen://"));
  assert.ok(chapter?.guards?.mustMatchOne?.some((p) => p.includes(".live")));
  assert.ok(chapter?.guards?.mustMatchOne?.some((p) => p.includes(".rec")));
});

test("unit: all chapters are required with unique ids", () => {
  const manifest = loadManifestFromRepo(REPO_ROOT);
  assert.ok(manifest.chapters.every((c) => c.required === true));
  assert.equal(getDuplicateChapterIds(manifest.chapters).length, 0);
  assert.equal(new Set(manifest.chapters.map((c) => c.id)).size, manifest.chapters.length);
});

test("integration: manifest load and filesystem walk has zero missing files", () => {
  const manifest = loadManifestFromRepo(REPO_ROOT);
  const missing = findMissingChapterPaths(REPO_ROOT, manifest);
  assert.deepEqual(missing, []);
});

test("integration: manifest file exists at documented relative path", () => {
  assert.equal(MANIFEST_RELATIVE_PATH, `${PARTNER_DOCS_ROOT}/partner-docs.manifest.json`);
  const raw = readFileSync(MANIFEST_PATH, "utf8");
  assert.match(raw, /^<!--/);
  const parsed = loadManifestFromFile(MANIFEST_PATH);
  assert.equal(parsed.chapters.length, EXPECTED_CHAPTER_PATHS.length);
});
