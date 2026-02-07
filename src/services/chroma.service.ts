import { ChromaClient, Collection, IncludeEnum } from "chromadb";
import { env } from "../config/env.js";
import type {
  ErrorCode,
  ErrorCodeMetadata,
} from "../types/error-code.types.js";

const COLLECTION_NAME = "ezviz_error_codes";

let client: ChromaClient | null = null;
let collection: Collection | null = null;

/**
 * Initialize ChromaDB client and collection
 */
export async function initChroma(): Promise<void> {
  client = new ChromaClient({
    path: `http://${env.CHROMA_HOST}:${env.CHROMA_PORT}`,
  });

  collection = await client.getOrCreateCollection({
    name: COLLECTION_NAME,
    metadata: { description: "EZVIZ SDK error codes" },
  });

  console.log(`[DEBUG] ChromaDB connected: ${COLLECTION_NAME}`);
}

/**
 * Get the collection instance
 */
export function getCollection(): Collection {
  if (!collection) {
    throw new Error("ChromaDB not initialized. Call initChroma() first.");
  }
  return collection;
}

/**
 * Add error codes to the collection
 */
export async function addErrorCodes(
  errorCodes: ErrorCode[],
  embeddings: number[][],
): Promise<void> {
  const col = getCollection();

  await col.upsert({
    ids: errorCodes.map((ec) => ec.id),
    embeddings,
    metadatas: errorCodes.map((ec) => ({
      code: ec.code,
      description: ec.description,
      solution: ec.solution,
      category: ec.category,
      moduleCode: ec.moduleCode,
    })),
    documents: errorCodes.map((ec) => `${ec.description} ${ec.solution}`),
  });

  console.log(
    `[DEBUG][chroma] Added ${errorCodes.length} error codes to ChromaDB`,
  );
}

/**
 * Query error codes by embedding similarity
 */
export async function queryByEmbedding(
  embedding: number[],
  topK: number = 5,
): Promise<ErrorCode[]> {
  const col = getCollection();

  const results = await col.query({
    queryEmbeddings: [embedding],
    nResults: topK,
  });

  if (!results.metadatas?.[0]) {
    return [];
  }

  return results.metadatas[0]
    .filter(
      (metadata): metadata is NonNullable<typeof metadata> => metadata !== null,
    )
    .map((metadata) => {
      const m = metadata as unknown as ErrorCodeMetadata;
      return {
        id: m.code,
        code: m.code,
        description: m.description,
        solution: m.solution,
        category: m.category,
        moduleCode: m.moduleCode,
      };
    });
}

/**
 * Get error code by exact code match
 */
export async function getByCode(code: string): Promise<ErrorCode | null> {
  const col = getCollection();

  const results = await col.get({
    ids: [code],
    include: [IncludeEnum.Metadatas],
  });

  if (!results.metadatas?.[0]) {
    return null;
  }

  const {
    code: mCode,
    description,
    solution,
    category,
    moduleCode,
  } = results.metadatas[0] as unknown as ErrorCodeMetadata;
  return {
    id: mCode,
    code: mCode,
    description,
    solution,
    category,
    moduleCode,
  };
}

/**
 * Get collection statistics
 */
export async function getStats(): Promise<{ count: number }> {
  const col = getCollection();
  const count = await col.count();
  return { count };
}
