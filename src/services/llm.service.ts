import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env.js";
import type { ErrorCode } from "../types/error-code.types.js";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

const SYSTEM_PROMPT = `You are an EZVIZ technical support assistant, 
If the user asks anything that is not about error codes, 
camera integration or EZVIZ technical documentation, respond only with: 'Sorry, I can only help with the EZVIZ SDK.' and end the response.
Your role is to help users troubleshoot EZVIZ SDK error codes.

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

  const prompt = `${SYSTEM_PROMPT}

## Retrieved Error Codes:
${context || "No relevant error codes found."}

## User Query:
${query}

## Response:`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text();
}
