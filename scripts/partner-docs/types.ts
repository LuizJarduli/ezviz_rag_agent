export type DocPart =
  | "shared"
  | "android"
  | "ios"
  | "web"
  | "best-practices";

export type DocModule =
  | "shared"
  | "android"
  | "ios"
  | "web"
  | "best-practices";

export interface ContentGuard {
  /** Regex patterns; each must match file body (ADR-004 content guards) */
  mustMatchOne?: string[];
  /** Regex patterns; none may match */
  mustNotMatch?: string[];
}

export interface PartnerDocChapter {
  id: string;
  part: DocPart;
  module: DocModule;
  path: string;
  title: string;
  required: boolean;
  guards?: ContentGuard;
  mustLinkTo?: string[];
}

export interface PartnerDocsManifest {
  version: string;
  locale: "pt-BR";
  pdf: { title: string; output: string };
  chapters: PartnerDocChapter[];
}

export interface ValidationError {
  chapterId: string;
  rule: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
}

export class ManifestLoadError extends Error {
  details: ValidationError[];

  constructor(message: string, details: ValidationError[]) {
    super(message);
    this.name = "ManifestLoadError";
    this.details = details;
  }
}
