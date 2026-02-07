import type {
  RawErrorCode,
  ErrorCode,
  QueryResponse,
  IngestResponse,
} from "../types/error-code.types.js";
import {
  parseErrorCodes,
  transformErrorCode,
  createDocumentText,
} from "../utils/parser.js";
import { generateEmbedding, generateEmbeddings } from "./embedding.service.js";
import { generateResponse } from "./llm.service.js";
import {
  addErrorCodes,
  queryByEmbedding,
  getByCode,
  getStats,
} from "./chroma.service.js";

/**
 * Ingest error codes from raw JSON data
 * Saves each batch immediately so progress isn't lost on errors
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
      `Removed ${duplicatesRemoved} duplicates, processing ${uniqueCodes.length} unique codes`,
    );
  }

  // Process in batches, saving each immediately
  const BATCH_SIZE = 10;
  let successCount = 0;
  let lastError: Error | null = null;

  for (let i = 0; i < uniqueCodes.length; i += BATCH_SIZE) {
    const batch = uniqueCodes.slice(i, i + BATCH_SIZE);

    try {
      const texts = batch.map(createDocumentText);
      const embeddings = await generateEmbeddings(texts);

      // Save immediately after embedding
      await addErrorCodes(batch, embeddings);
      successCount += batch.length;

      console.log(
        `[DEBUG][rag] Ingested ${successCount}/${uniqueCodes.length} codes`,
      );
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(
        `[DEBUG][rag] Batch failed at ${i}, saved ${successCount} codes so far:`,
        lastError.message,
      );

      // Return partial success
      return {
        success: successCount > 0,
        count: successCount,
        message: `[DEBUG][rag] Ingested ${successCount}/${uniqueCodes.length} codes. Error: ${lastError.message}`,
      };
    }
  }

  return {
    success: true,
    count: successCount,
    message: `[DEBUG][rag] Successfully ingested ${successCount} error codes`,
  };
}

/**
 * Query with natural language, returning RAG-augmented response
 */
export async function query(
  queryText: string,
  topK: number = 5,
): Promise<QueryResponse> {
  // Generate query embedding
  const queryEmbedding = await generateEmbedding(queryText);

  // Retrieve relevant error codes
  const sources = await queryByEmbedding(queryEmbedding, topK);

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
