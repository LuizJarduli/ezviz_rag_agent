/**
 * Raw error code format from the JSON file
 */
export interface RawErrorCode {
  moduleCode: string;
  detailCode: string;
  description: string;
  solution: string;
  updateTime: number;
}

/**
 * Processed error code stored in ChromaDB
 */
export interface ErrorCode {
  id: string;
  code: string;
  description: string;
  solution: string;
  category: string;
  moduleCode: string;
}

/**
 * ChromaDB document metadata
 */
export interface ErrorCodeMetadata {
  code: string;
  description: string;
  solution: string;
  category: string;
  moduleCode: string;
}

/**
 * Query request body
 */
export interface QueryRequest {
  query: string;
  topK?: number;
}

/**
 * Query response with sources
 */
export interface QueryResponse {
  answer: string;
  sources: ErrorCode[];
}

/**
 * Ingest request body
 */
export interface IngestRequest {
  errorCodes: RawErrorCode[];
}

/**
 * Ingest response
 */
export interface IngestResponse {
  success: boolean;
  count: number;
  message: string;
}
