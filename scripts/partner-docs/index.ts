export {
  getChapterById,
  getDuplicateChapterIds,
  loadManifest,
  loadManifestFromFile,
  loadManifestFromRepo,
  manifestAbsolutePath,
} from "./manifest.ts";
export type {
  ContentGuard,
  DocModule,
  DocPart,
  PartnerDocChapter,
  PartnerDocsManifest,
  ValidationError,
  ValidationResult,
} from "./types.ts";
export { ManifestLoadError } from "./types.ts";
export {
  compileGuardPattern,
  validateChapterBody,
  validateContentGuards,
  validateMustLinkTo,
  validatePartnerDocs,
  validateRelativeLinks,
  runValidation,
} from "./validate.ts";
export {
  buildPandocArgs,
  FRONT_MATTER_RELATIVE_PATH,
  isPandocAvailable,
  orderedBuildAbsolutePaths,
  orderedBuildRelativePaths,
  orderedChapterRelativePaths,
  parseFrontMatterMetadata,
  resolvePdfOutputPath,
  runBuild,
} from "./build.ts";
export type { BuildOptions, BuildResult, PandocMetadata } from "./build.ts";
export {
  DOC_MODULE_VALUES,
  MODULES_OUTPUT_DIR,
  groupChaptersByModule,
  moduleOutputRelativePath,
  modulesRootRelativePath,
  runSplit,
  splitModules,
  SplitModulesError,
} from "./split-modules.ts";
export type { SplitModulesOptions, SplitModulesResult } from "./split-modules.ts";
