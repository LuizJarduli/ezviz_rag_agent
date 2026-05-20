import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const REPO_ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const WORKFLOW_PATH = join(
  REPO_ROOT,
  ".github/workflows/partner-docs.yml",
);

type WorkflowDoc = {
  on?: Record<string, unknown> | string[] | string;
  jobs?: Record<
    string,
    {
      steps?: Array<{ run?: string; name?: string }>;
      if?: string;
    }
  >;
};

function readWorkflowSource(): string {
  return readFileSync(WORKFLOW_PATH, "utf8");
}

function parseWorkflow(): WorkflowDoc {
  return parseYaml(readWorkflowSource()) as WorkflowDoc;
}

function jobStepRuns(jobId: string): string[] {
  const job = parseWorkflow().jobs?.[jobId];
  assert.ok(job, `missing job: ${jobId}`);
  return (job.steps ?? [])
    .map((step) => step.run ?? "")
    .filter((run) => run.length > 0);
}

test("unit: workflow YAML parses without syntax errors", () => {
  const doc = parseWorkflow();
  assert.equal(typeof doc, "object");
  assert.ok(doc.jobs?.validate);
});

test("unit: workflow triggers include pull_request", () => {
  const on = parseWorkflow().on;
  assert.ok(on && typeof on === "object" && !Array.isArray(on));
  assert.ok("pull_request" in on);
});

test("unit: workflow validate job runs partner-docs:validate", () => {
  const runs = jobStepRuns("validate");
  assert.ok(
    runs.some((run) => run.includes("pnpm partner-docs:validate")),
    `expected partner-docs:validate step, got:\n${runs.join("\n")}`,
  );
});

test("unit: workflow validate job runs partner-docs:test", () => {
  const runs = jobStepRuns("validate");
  assert.ok(
    runs.some((run) => run.includes("pnpm partner-docs:test")),
    `expected partner-docs:test step, got:\n${runs.join("\n")}`,
  );
});

test("unit: workflow uses pnpm via action-setup and Node cache", () => {
  const source = readWorkflowSource();
  assert.match(source, /pnpm\/action-setup@v4/);
  assert.match(source, /cache:\s*pnpm/);
  assert.match(source, /node-version:\s*["']22["']/);
});

test("unit: workflow optional build job is gated to main push", () => {
  const buildJob = parseWorkflow().jobs?.["build-pdf"];
  assert.ok(buildJob?.if);
  assert.match(buildJob.if, /refs\/heads\/main/);
  const runs = jobStepRuns("build-pdf");
  assert.ok(
    runs.some((run) => run.includes("pnpm partner-docs:build")),
    `expected partner-docs:build step, got:\n${runs.join("\n")}`,
  );
});

test("integration: CI validate command matches local package script", () => {
  const pkg = JSON.parse(
    readFileSync(join(REPO_ROOT, "package.json"), "utf8"),
  ) as { scripts: Record<string, string> };
  const local = pkg.scripts["partner-docs:validate"];
  assert.match(local, /validate\.ts/);

  const source = readWorkflowSource();
  assert.match(source, /pnpm partner-docs:validate/);
  assert.equal(
    local.trim().length > 0,
    true,
    "local partner-docs:validate must be defined",
  );
});
