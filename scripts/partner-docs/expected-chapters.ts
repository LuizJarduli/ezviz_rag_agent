/**
 * Canonical chapter paths for docs/partner-ezopen-ptbr/ (TechSpec source layout).
 * Consumed by scaffold structure tests and later manifest validation (task_02+).
 */
export const PARTNER_DOCS_ROOT = "docs/partner-ezopen-ptbr";

export const PLATFORM_CHAPTER_BASENAMES = [
  "01-auth.md",
  "02-live-preview.md",
  "03-playback.md",
  "04-device-control.md",
  "05-mosaic.md",
  "06-wifi-config.md",
] as const;

export const EXPECTED_CHAPTER_PATHS: readonly string[] = [
  "part-01-shared-concepts/00-ezopen-protocol.md",
  "part-01-shared-concepts/01-auth.md",
  "part-01-shared-concepts/02-glossary-capability-matrix.md",
  ...PLATFORM_CHAPTER_BASENAMES.map((f) => `part-02-android/${f}`),
  ...PLATFORM_CHAPTER_BASENAMES.map((f) => `part-03-ios/${f}`),
  ...PLATFORM_CHAPTER_BASENAMES.map((f) => `part-04-web/${f}`),
  "part-05-best-practices/01-mosaic-performance.md",
  "part-05-best-practices/02-general-integration.md",
  "part-05-best-practices/03-security.md",
] as const;

export const REQUIRED_ROOT_FILES = ["README.md", "front-matter.md"] as const;
