import { ChromaClient } from "chromadb";
import { env } from "../config/env.js";

let client: ChromaClient | null = null;

/**
 * Initialize ChromaDB client
 */
export async function initChroma(): Promise<void> {
  client = new ChromaClient({
    path: `http://${env.CHROMA_HOST}:${env.CHROMA_PORT}`,
  });

  console.log(`[DEBUG][chroma] Client initialized`);
}

/**
 * Get the ChromaDB client instance
 */
export function getChromaClient(): ChromaClient {
  if (!client) {
    throw new Error("ChromaDB not initialized. Call initChroma() first.");
  }
  return client;
}
