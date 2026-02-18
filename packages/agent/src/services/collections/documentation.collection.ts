import { Collection } from "chromadb";
import { getChromaClient } from "../chroma.service.js";
import type {
  DocumentationChunk,
  DocumentationMetadata,
} from "../../types/documentation.types.js";

const COLLECTION_NAME = "ezviz_documentation";
let collection: Collection | null = null;

/**
 * Get the documentation collection instance
 */
export async function getDocumentationCollection(): Promise<Collection> {
  if (collection) {
    return collection;
  }

  const client = getChromaClient();
  collection = await client.getOrCreateCollection({
    name: COLLECTION_NAME,
    metadata: { description: "EZVIZ Documentation (SDKs, API, Glossary)" },
  });

  return collection;
}

/**
 * Add documentation chunks to the collection
 */
export async function addDocumentationChunks(
  chunks: DocumentationChunk[],
): Promise<void> {
  const col = await getDocumentationCollection();

  await col.upsert({
    ids: chunks.map((chunk) => chunk.id),
    metadatas: chunks.map(({ metadata }) => {
      const {
        source,
        title,
        url,
        section_path,
        type,
        version = "",
        language = "",
        hash = "",
        platform = "",
      } = metadata || {};
      return {
        source,
        title,
        url,
        section_path,
        type,
        version,
        language,
        hash,
        platform,
      };
    }),
    documents: chunks.map(({ text }) => text),
  });

  console.log(`[DEBUG][chroma] Added ${chunks.length} documentation chunks`);
}

/**
 * Query documentation by text
 */
export async function queryDocumentation(
  queryText: string,
  topK: number = 5,
): Promise<DocumentationChunk[]> {
  const col = await getDocumentationCollection();

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
    .map((metadata, index) => {
      const {
        source,
        title,
        url,
        section_path,
        type,
        version = "",
        language = "",
        hash = "",
        platform = "",
      } = metadata || {};

      const id = results.ids?.[0][index] ?? "";
      const text = results.documents?.[0][index] ?? "";

      return {
        id,
        text,
        metadata: {
          source,
          title,
          url,
          section_path,
          type,
          version,
          language,
          hash,
          platform,
        } as DocumentationMetadata,
      };
    });
}

/**
 * Get collection statistics
 */
export async function getStats(): Promise<{ count: number }> {
  const col = await getDocumentationCollection();
  const count = await col.count();
  return { count };
}
