import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("3001").transform(Number),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  CHROMA_HOST: z.string().default("localhost"),
  CHROMA_PORT: z.string().default("8000").transform(Number),
  API_KEYS: z
    .string()
    .min(1, "API_KEYS is required")
    .transform((val) => val.split(",").map((key) => key.trim())),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
