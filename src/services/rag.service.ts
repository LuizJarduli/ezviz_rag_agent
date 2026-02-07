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
  getStats,
} from "./chroma.service.js";

/**
 * Ingest error codes from raw JSON data
 * Uses ChromaDB's built-in embeddings - no external API calls!
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
  const BATCH_SIZE = 100; // Much larger batches since no API rate limits
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
 * Query with natural language, returning RAG-augmented response
 * Uses ChromaDB's built-in embeddings for similarity search
 */
export async function query(
  queryText: string,
  topK: number = 5,
): Promise<QueryResponse> {
  // Retrieve relevant error codes - ChromaDB handles embedding automatically
  const sources = await queryByText(queryText, topK);

  // Generate response with context
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
