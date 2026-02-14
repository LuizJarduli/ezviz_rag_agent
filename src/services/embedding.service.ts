import { env } from "../config/env.js";
import { Ollama } from "ollama";

const ollama = new Ollama({
  host: `${env.OLLAMA_HOST}:${env.OLLAMA_PORT}`,
});

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate embedding with retry logic for rate limits
 */
export async function generateEmbedding(
  text: string,
  retries = 3,
): Promise<number[]> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await ollama.embeddings({
        model: "nomic-embed-text",
        prompt: text,
      });
      return response.embedding;
    } catch (error) {
      console.log(`[DEBUG][embedding] Error generating embedding: ${error}`);
    }
  }
  throw new Error("[DEBUG][embedding] Max retries exceeded");
}

/**
 * Generate embeddings for multiple texts with rate limiting
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  const DELAY_BETWEEN_REQUESTS = 300;

  for (let i = 0; i < texts.length; i++) {
    const embedding = await generateEmbedding(texts[i]);
    results.push(embedding);

    // Add delay between requests to avoid rate limits
    if (i < texts.length - 1) {
      await sleep(DELAY_BETWEEN_REQUESTS);
    }
  }

  return results;
}
