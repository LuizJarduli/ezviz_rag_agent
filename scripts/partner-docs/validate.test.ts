import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { loadManifest, loadManifestFromFile } from "./manifest.ts";
import { ManifestLoadError } from "./types.ts";
import {
  extractRelativeMarkdownLinks,
  validateContentGuards,
  validatePartnerDocs,
} from "./validate.ts";

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

test("unit: valid fixture corpus returns ok true", () => {
  const repoRoot = fixtureRepo("valid");
  const manifest = loadManifest(fixtureManifestPath("valid"));
  const result = validatePartnerDocs(repoRoot, manifest);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test("unit: missing required fixture file reports chapterId", () => {
  const repoRoot = fixtureRepo("invalid-missing-file");
  const manifest = loadManifest(fixtureManifestPath("invalid-missing-file"));
  const result = validatePartnerDocs(repoRoot, manifest);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.chapterId === "missing-chapter"));
  assert.ok(result.errors.some((e) => e.rule === "missing-file"));
});

test("unit: TBD placeholder reports placeholder-tbd rule", () => {
  const repoRoot = fixtureRepo("invalid-tbd");
  const manifest = loadManifest(fixtureManifestPath("invalid-tbd"));
  const result = validatePartnerDocs(repoRoot, manifest);
  assert.equal(result.ok, false);
  const err = result.errors.find((e) => e.rule === "placeholder-tbd");
  assert.ok(err);
  assert.equal(err.chapterId, "tbd-chapter");
});

test("unit: web live preview without ezopen fails content guard", () => {
  const repoRoot = fixtureRepo("invalid-web-guard");
  const manifest = loadManifest(fixtureManifestPath("invalid-web-guard"));
  const result = validatePartnerDocs(repoRoot, manifest);
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some(
      (e) =>
        e.chapterId === "web-live-preview" &&
        e.rule === "content-guard-must-match-one",
    ),
  );
});

test("unit: broken relative link between fixture chapters", () => {
  const repoRoot = fixtureRepo("invalid-broken-link");
  const manifest = loadManifest(fixtureManifestPath("invalid-broken-link"));
  const result = validatePartnerDocs(repoRoot, manifest);
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some(
      (e) => e.chapterId === "linker" && e.rule === "broken-relative-link",
    ),
  );
});

test("unit: manifest loader rejects duplicate chapter ids", () => {
  const dupPath = join(
    SCRIPT_DIR,
    "fixtures/invalid-duplicate-id/partner-docs.manifest.json",
  );
  assert.throws(
    () => loadManifestFromFile(dupPath),
    (err: unknown) => {
      assert.ok(err instanceof ManifestLoadError);
      assert.ok(err.message.includes("dup"));
      return true;
    },
  );
});

test("unit: extractRelativeMarkdownLinks ignores external urls", () => {
  const body = "[a](./local.md) [b](https://example.com) [c](#anchor)";
  assert.deepEqual(extractRelativeMarkdownLinks(body), ["./local.md"]);
});

test("unit: validateContentGuards mustNotMatch", () => {
  const errors = validateContentGuards(
    {
      id: "x",
      part: "shared",
      module: "shared",
      path: "a.md",
      title: "A",
      required: true,
      guards: { mustNotMatch: ["FORBIDDEN"] },
    },
    "contains FORBIDDEN token",
  );
  assert.equal(errors.length, 1);
  assert.equal(errors[0]?.rule, "content-guard-must-not-match");
});

test("unit: validateContentGuards mustMatchOne requires every pattern", () => {
  const errors = validateContentGuards(
    {
      id: "x",
      part: "shared",
      module: "shared",
      path: "a.md",
      title: "A",
      required: true,
      guards: { mustMatchOne: ["ezopen://", "\\.live"] },
    },
    "only ezopen://open.ezviz.com/x/1.live",
  );
  assert.deepEqual(errors, []);
});

test("unit: production manifest validates when all chapters are authored", () => {
  const manifest = loadManifest(
    join(REPO_ROOT, "docs/partner-ezopen-ptbr/partner-docs.manifest.json"),
  );
  const result = validatePartnerDocs(REPO_ROOT, manifest);
  assert.equal(result.ok, true, result.errors.map((e) => e.message).join("\n"));
  assert.deepEqual(result.errors, []);
});
