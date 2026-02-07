import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env.js";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

const embeddingModel = genAI.getGenerativeModel({
  model: "gemini-embedding-001",
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
      const result = await embeddingModel.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      const isRateLimit =
        error instanceof Error && error.message.includes("429");

      if (isRateLimit && attempt < retries - 1) {
        const delay = Math.pow(2, attempt + 1) * 1000; // s, 4s, 8s
        console.log(
          `[DEBUG][embedding] Rate limited, retrying in ${delay / 1000}s...`,
        );
        await sleep(delay);
      } else {
        throw error;
      }
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
