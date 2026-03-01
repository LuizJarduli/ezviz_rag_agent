import { env } from "../config/env.js";
import type { ErrorCode } from "../types/error-code.types.js";
import type { DocumentationChunk } from "../types/documentation.types.js";
import { Ollama } from "ollama";

const ollama = new Ollama({
  host: `${env.OLLAMA_HOST}:${env.OLLAMA_PORT}`,
});

const ERROR_CODE_SYSTEM_PROMPT = `You are an EZVIZ technical support assistant specialized in the EZVIZ SDK.
Your primary role is to help users troubleshoot error codes and integration issues.

If the user provides an error code (e.g., just a number like "10002" or "error 10002"), interpret this as a request for troubleshooting that specific error.

If the user asks a question completely unrelated to EZVIZ, SDKs, error codes, or technical integration (e.g., "What is the weather?", "Write a poem"), politely decline by saying: "Sorry, I can only help with the EZVIZ SDK."

Given the user's query and relevant error codes from the database, provide:
1. A clear explanation of what the error means
2. Step-by-step troubleshooting instructions
3. Any relevant context about the error category

Always be helpful and concise. If the error codes don't seem relevant to the query, say so and suggest what the user might be looking for.

Respond in the same language as the user's query (Brazilian Portuguese or English).`;

const DOC_SYSTEM_PROMPT = `You are an EZVIZ technical documentation expert.
Your primary role is to answer developer questions based on the provided SDK and API documentation context.

If the user asks a question completely unrelated to EZVIZ, SDKs, or technical integration, politely decline by saying: "Sorry, I can only help with the EZVIZ documentation."

Given the user's query and relevant documentation chunks:
1. Synthesize a clear, step-by-step answer based ONLY on the provided context.
2. If the context contains code snippets relevant to the answer, include them formatted correctly in markdown.
3. If the provided context does not contain the answer, explicitly state: "I couldn't find the exact answer in the documentation." Do not guess or hallucinate features.
4. Try to be concise but thorough enough for a developer to implement the solution.

Respond in the same language as the user's query (Brazilian Portuguese or English).`;

/**
 * Generate a response using retrieved error codes as context
 */
export async function generateErrorCodeResponse(
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
      system: ERROR_CODE_SYSTEM_PROMPT,
      prompt: `Errors context:\n${context}\n\nUser query: ${query}`,
      stream: false,
    });

    return response;
  } catch (error) {
    console.error("[DEBUG][LLM] Error generating response:", error);
    throw error;
  }
}

/**
 * Generate a response using retrieved documentation chunks as context
 */
export async function generateDocumentationResponse(
  query: string,
  chunks: DocumentationChunk[],
): Promise<string> {
  const context = chunks
    .map(
      (chunk, i) =>
        `[Document ${i + 1}]
Source: ${chunk.metadata.source}
Title: ${chunk.metadata.title}
Path: ${chunk.metadata.section_path}

${chunk.text}`,
    )
    .join("\n\n---\n\n");

  try {
    const { response } = await ollama.generate({
      model: "llama3.2",
      system: DOC_SYSTEM_PROMPT,
      prompt: `Documentation context:\n${context}\n\nUser query: ${query}`,
      stream: false,
    });

    return response;
  } catch (error) {
    console.error(
      "[DEBUG][LLM] Error generating documentation response:",
      error,
    );
    throw error;
  }
}
