import { Collection, IncludeEnum } from "chromadb";
import { getChromaClient } from "../chroma.service.js";
import type {
  ErrorCode,
  ErrorCodeMetadata,
} from "../../types/error-code.types.js";

const COLLECTION_NAME = "ezviz_error_codes";
let collection: Collection | null = null;

/**
 * Get the error codes collection instance
 */
export async function getErrorCodesCollection(): Promise<Collection> {
  if (collection) {
    return collection;
  }

  const client = getChromaClient();
  // Create collection WITHOUT specifying embeddingFunction
  // ChromaDB will use its default embedding function
  collection = await client.getOrCreateCollection({
    name: COLLECTION_NAME,
    metadata: { description: "EZVIZ SDK error codes" },
  });

  return collection;
}

/**
 * Add error codes to the collection using ChromaDB's built-in embeddings
 * Just pass documents - Chroma will embed them automatically
 */
export async function addErrorCodes(errorCodes: ErrorCode[]): Promise<void> {
  const col = await getErrorCodesCollection();

  await col.upsert({
    ids: errorCodes.map((ec) => ec.id),
    metadatas: errorCodes.map((ec) => ({
      code: ec.code,
      description: ec.description,
      solution: ec.solution,
      category: ec.category,
      moduleCode: ec.moduleCode,
    })),
    documents: errorCodes.map(
      (ec) => `Error ${ec.code}: ${ec.description} ${ec.solution}`,
    ),
  });

  console.log(
    `[DEBUG][chroma] Added ${errorCodes.length} error codes to ChromaDB`,
  );
}

/**
 * Query error codes by text - ChromaDB handles embedding automatically
 */
export async function queryByText(
  queryText: string,
  topK: number = 5,
): Promise<ErrorCode[]> {
  const col = await getErrorCodesCollection();

  const results = await col.query({
    queryTexts: [queryText],
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
 * Get error code by exact code match (ID lookup)
 */
export async function getByCode(code: string): Promise<ErrorCode | null> {
  const col = await getErrorCodesCollection();

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
 * Get error code by metadata 'code' field
 * Useful when ID is composite (module_code) but user searches by code only
 */
export async function getByMetadataCode(
  code: string,
): Promise<ErrorCode | null> {
  const col = await getErrorCodesCollection();

  const results = await col.get({
    where: { code: code },
    limit: 1,
    include: [IncludeEnum.Metadatas],
  });

  if (!results.metadatas || results.metadatas.length === 0) {
    return null;
  }

  const {
    code: mCode,
    description,
    solution,
    category,
    moduleCode,
  } = results.metadatas[0] as unknown as ErrorCodeMetadata;

  // If IDs array exists and has elements, use the first one as ID
  // Otherwise fallback to mCode
  const id = results.ids && results.ids.length > 0 ? results.ids[0] : mCode;

  return {
    id,
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
  const col = await getErrorCodesCollection();
  const count = await col.count();
  return { count };
}

/**
 * Get all error codes with optional pagination
 */
export async function getAllErrors(
  limit: number = 100,
  offset: number = 0,
): Promise<{ errors: ErrorCode[]; total: number }> {
  const col = await getErrorCodesCollection();
  const total = await col.count();

  const results = await col.get({
    limit,
    offset,
    include: [IncludeEnum.Metadatas],
  });

  if (!results.metadatas || results.metadatas.length === 0) {
    return { errors: [], total };
  }

  const errors = results.metadatas
    .filter(
      (metadata): metadata is NonNullable<typeof metadata> => metadata !== null,
    )
    .map((metadata, index) => {
      const m = metadata as unknown as ErrorCodeMetadata;
      const id =
        results.ids && results.ids[index] ? results.ids[index] : m.code;
      return {
        id,
        code: m.code,
        description: m.description,
        solution: m.solution,
        category: m.category,
        moduleCode: m.moduleCode,
      };
    });

  return { errors, total };
}
