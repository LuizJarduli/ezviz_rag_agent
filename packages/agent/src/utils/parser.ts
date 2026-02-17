import { z } from "zod";
import type { RawErrorCode, ErrorCode } from "../types/error-code.types.js";
import { categorizeError } from "./categorizer.js";

const rawErrorCodeSchema = z.object({
  moduleCode: z.string(),
  detailCode: z.string(),
  description: z.string(),
  solution: z.string(),
  updateTime: z.number(),
});

const errorCodesArraySchema = z.array(rawErrorCodeSchema);

/**
 * Parse and validate raw error codes from JSON
 * Filters out entries with empty detailCode
 */
export function parseErrorCodes(data: unknown): RawErrorCode[] {
  const result = errorCodesArraySchema.safeParse(data);

  if (!result.success) {
    throw new Error(`Invalid error codes format: ${result.error.message}`);
  }

  // Filter out entries with empty detailCode
  const validCodes = result.data.filter(
    (code) => code.detailCode.trim() !== "",
  );
  const filtered = result.data.length - validCodes.length;

  if (filtered > 0) {
    console.log(
      `[DEBUG][parser] Filtered out ${filtered} entries with empty detailCode`,
    );
  }

  return validCodes;
}

/**
 * Transform raw error code to processed format with auto-categorization
 * Uses moduleCode + detailCode as unique ID to handle duplicates
 */
export function transformErrorCode(raw: RawErrorCode): ErrorCode {
  const uniqueId = raw.moduleCode
    ? `${raw.moduleCode}_${raw.detailCode}`
    : raw.detailCode;

  return {
    id: uniqueId,
    code: raw.detailCode,
    description: raw.description,
    solution: raw.solution,
    category: categorizeError(raw.description, raw.solution),
    moduleCode: raw.moduleCode,
  };
}

/**
 * Create document text for embedding (description + solution)
 */
export function createDocumentText(errorCode: ErrorCode): string {
  return `Error Code: ${errorCode.code}\nDescription: ${errorCode.description}\nSolution: ${errorCode.solution}`;
}
