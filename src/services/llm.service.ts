import { env } from "../config/env.js";
import type { ErrorCode } from "../types/error-code.types.js";
import { Ollama } from "ollama";

const ollama = new Ollama({
  host: `${env.OLLAMA_HOST}:${env.OLLAMA_PORT}`,
});

const SYSTEM_PROMPT = `You are an EZVIZ technical support assistant specialized in the EZVIZ SDK.
Your primary role is to help users troubleshoot error codes and integration issues.

If the user provides an error code (e.g., just a number like "10002" or "error 10002"), interpret this as a request for troubleshooting that specific error.

If the user asks a question completely unrelated to EZVIZ, SDKs, error codes, or technical integration (e.g., "What is the weather?", "Write a poem"), politely decline by saying: "Sorry, I can only help with the EZVIZ SDK."

Given the user's query and relevant error codes from the database, provide:
1. A clear explanation of what the error means
2. Step-by-step troubleshooting instructions
3. Any relevant context about the error category

Always be helpful and concise. If the error codes don't seem relevant to the query, say so and suggest what the user might be looking for.

Respond in the same language as the user's query (Brazilian Portuguese or English).`;

/**
 * Generate a response using retrieved error codes as context
 */
export async function generateResponse(
  query: string,
  errorCodes: ErrorCode[],
): Promise<string> {
  const context = errorCodes
    .map(
      (ec, i) =>
        `[${i + 1}] Code: ${ec.code}
    Description: ${ec.description}
    Solution: ${ec.solution}
    Category: ${ec.category}`,
    )
    .join("\n\n");

  try {
    const { response } = await ollama.generate({
      model: "llama3.2",
      system: SYSTEM_PROMPT,
      prompt: `Errors context:\n${context}\n\nUser query: ${query}`,
      stream: false,
    });

    return response;
  } catch (error) {
    console.error("[DEBUG][LLM] Error generating response:", error);
    throw error;
  }
}
