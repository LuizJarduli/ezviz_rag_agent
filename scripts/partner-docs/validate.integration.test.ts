import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { main, runValidation } from "./validate.ts";

const SCRIPT_DIR = fileURLToPath(new URL(".", import.meta.url));

function fixtureRepo(name: string): string {
  return join(SCRIPT_DIR, "fixtures", name);
}

test("integration: runValidation on valid fixture returns ok", () => {
  const repoRoot = fixtureRepo("valid");
  const manifestPath = join(
    repoRoot,
    "docs/partner-ezopen-ptbr/partner-docs.manifest.json",
  );
  const result = runValidation(repoRoot, manifestPath);
  assert.equal(result.ok, true);
});

test("integration: runValidation on invalid-missing-file returns ok false", () => {
  const repoRoot = fixtureRepo("invalid-missing-file");
  const manifestPath = join(
    repoRoot,
    "docs/partner-ezopen-ptbr/partner-docs.manifest.json",
  );
  const result = runValidation(repoRoot, manifestPath);
  assert.equal(result.ok, false);
});

test("integration: CLI main exits 0 for valid fixture", () => {
  const code = main([fixtureRepo("valid")]);
  assert.equal(code, 0);
});

test("integration: CLI main exits non-zero for invalid-missing-file", () => {
  const code = main([fixtureRepo("invalid-missing-file")]);
  assert.equal(code, 1);
});
