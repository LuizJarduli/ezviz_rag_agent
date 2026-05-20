import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

type RootPackage = { scripts: Record<string, string> };

function readRootPackage(): RootPackage {
  return JSON.parse(
    readFileSync(join(REPO_ROOT, "package.json"), "utf8"),
  ) as RootPackage;
}

function script(name: string): string {
  const value = readRootPackage().scripts[name];
  assert.ok(value?.trim().length, `missing or empty script: ${name}`);
  return value;
}

test("unit: root package.json contains partner-docs:validate", () => {
  assert.match(script("partner-docs:validate"), /validate\.ts/);
});

test("unit: root package.json contains partner-docs:test", () => {
  assert.match(script("partner-docs:test"), /--test/);
});

test("unit: root package.json contains partner-docs:build", () => {
  assert.match(script("partner-docs:build"), /build-pdf\.sh/);
});

test("unit: root package.json contains partner-docs:split", () => {
  assert.match(script("partner-docs:split"), /split-modules\.ts/);
});

const skipPnpmIntegration =
  process.env.PARTNER_DOCS_SUPPRESS_INTEGRATION === "1";

function spawnPnpm(args: string[]) {
  return spawnSync("pnpm", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      PARTNER_DOCS_SUPPRESS_INTEGRATION: "1",
    },
  });
}

test(
  "integration: pnpm partner-docs:test completes with exit code 0",
  { skip: skipPnpmIntegration },
  () => {
    const result = spawnPnpm(["partner-docs:test"]);
    const output = `${result.stdout}\n${result.stderr}`;
    assert.equal(
      result.status,
      0,
      `partner-docs:test failed (exit ${result.status}):\n${output}`,
    );
  },
);

test(
  "integration: pnpm partner-docs:validate runs without module resolution errors",
  { skip: skipPnpmIntegration },
  () => {
  const result = spawnPnpm(["partner-docs:validate"]);
  const output = `${result.stdout}\n${result.stderr}`;
  assert.doesNotMatch(output, /Cannot find module/i);
  assert.doesNotMatch(output, /ERR_MODULE_NOT_FOUND/i);
  assert.doesNotMatch(output, /ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL/i);
  assert.ok(
    result.status === 0 || result.status === 1,
    `unexpected exit ${result.status}:\n${output}`,
  );
  },
);
