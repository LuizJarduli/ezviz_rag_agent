import type {
  ErrorCode,
  QueryResponse,
  IngestResponse,
} from "../types/error-code.types.js";
import { parseErrorCodes, transformErrorCode } from "../utils/parser.js";
import { generateResponse } from "./llm.service.js";
import {
  addErrorCodes,
  queryByText,
  getByCode,
  getByMetadataCode,
  getStats,
} from "./collections/error-codes.collection.js";
import {
  queryDocumentation as queryDocs,
  getStats as getDocStats,
} from "./collections/documentation.collection.js";
import type { DocumentationChunk } from "../types/documentation.types.js";

/**
 * Ingest error codes from raw JSON data
 */
export async function ingestErrorCodes(
  rawData: unknown,
): Promise<IngestResponse> {
  const rawCodes = parseErrorCodes(rawData);
  const errorCodes = rawCodes.map(transformErrorCode);

  // Deduplicate by ID before processing
  const uniqueMap = new Map<string, ErrorCode>();
  for (const ec of errorCodes) {
    if (!uniqueMap.has(ec.id)) {
      uniqueMap.set(ec.id, ec);
    }
  }
  const uniqueCodes = Array.from(uniqueMap.values());
  const duplicatesRemoved = errorCodes.length - uniqueCodes.length;

  if (duplicatesRemoved > 0) {
    console.log(
      `[DEBUG][rag] Removed ${duplicatesRemoved} duplicates, processing ${uniqueCodes.length} unique codes`,
    );
  }

  // Process in batches - ChromaDB handles embeddings internally
  const BATCH_SIZE = 100;
  let successCount = 0;

  for (let i = 0; i < uniqueCodes.length; i += BATCH_SIZE) {
    const batch = uniqueCodes.slice(i, i + BATCH_SIZE);

    try {
      await addErrorCodes(batch);
      successCount += batch.length;

      console.log(
        `[DEBUG][rag] Ingested ${successCount}/${uniqueCodes.length} codes`,
      );
    } catch (error) {
      const lastError =
        error instanceof Error ? error : new Error(String(error));
      console.error(
        `[DEBUG][rag] Batch failed at ${i}, saved ${successCount} codes so far:`,
        lastError.message,
      );

      return {
        success: successCount > 0,
        count: successCount,
        message: `Ingested ${successCount}/${uniqueCodes.length} codes. Error: ${lastError.message}`,
      };
    }
  }

  return {
    success: true,
    count: successCount,
    message: `Successfully ingested ${successCount} error codes`,
  };
}

/**
 * Query with natural language or error code
 * Implements hybrid search:
 *
 *  - If query looks like a code, try exact lookup (by ID or metadata)
 *  - If found, use that as the single source
 *  - If not found or not a code, use vector search
 */
export async function query(
  queryText: string,
  topK: number = 5,
): Promise<QueryResponse> {
  let sources: ErrorCode[] = [];

  const isCode = /^-?\d+|0x[0-9a-fA-F]+$/.test(queryText.trim());

  if (isCode) {
    const cleanCode = queryText.trim();
    console.log(
      `[DEBUG][rag] Query '${cleanCode}' looks like a code, trying exact lookup...`,
    );

    let exactMatch = await getByCode(cleanCode);

    if (!exactMatch) {
      exactMatch = await getByMetadataCode(cleanCode);
    }

    if (exactMatch) {
      console.log(`[DEBUG][rag] Exact match found for code '${cleanCode}'`);
      sources = [exactMatch];
    } else {
      console.log(
        `[DEBUG][rag] No exact match for code '${cleanCode}', falling back to vector search`,
      );
    }
  }

  if (sources.length === 0) {
    sources = await queryByText(queryText, topK);
  }

  const answer = await generateResponse(queryText, sources);

  return { answer, sources };
}

/**
 * Get error code by exact code lookup
 */
export async function getErrorByCode(code: string): Promise<ErrorCode | null> {
  return getByCode(code);
}

/**
 * Get ingestion statistics
 */
export async function getIngestionStats(): Promise<{ count: number }> {
  return getStats();
}

/**
 * Get all error codes with pagination
 */
export async function getAllErrors(
  limit: number = 100,
  offset: number = 0,
): Promise<{ errors: ErrorCode[]; total: number }> {
  return getAllErrors(limit, offset);
}

/**
 * Query documentation
 */
export async function queryDocumentation(
  queryText: string,
  topK: number = 5,
): Promise<DocumentationChunk[]> {
  return queryDocs(queryText, topK);
}

/**
 * Get documentation stats
 */
export async function getDocumentationStats(): Promise<{ count: number }> {
  return getDocStats();
}
