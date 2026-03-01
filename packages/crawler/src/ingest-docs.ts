import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { chunkMarkdownByHeaders } from "./crawlers/helpers/markdown-chunker.js";

interface DocumentationMetadata {
  source: string;
  title: string;
  url: string;
  section_path: string;
  type: string;
  version?: string;
  language?: string;
}

interface DocumentationChunk {
  id: string;
  text: string;
  metadata: DocumentationMetadata;
}

const DOCS_DIR = path.join(process.cwd(), "docs", "sdk");
const INGEST_URL = "http://localhost:3001/api/ingest/documentation";

/**
 * Recursively get all .md files in a directory
 */
async function getMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const res = path.resolve(dir, entry.name);
      return entry.isDirectory() ? getMarkdownFiles(res) : res;
    }),
  );
  return files.flat().filter((file) => file.endsWith(".md"));
}

/**
 * Generate a deterministic ID based on URL and section hash
 */
function generateChunkId(url: string, sectionTitle: string): string {
  const hash = crypto
    .createHash("md5")
    .update(`${url}_${sectionTitle}`)
    .digest("hex");
  return `doc_${hash}`;
}

async function processFile(filePath: string): Promise<DocumentationChunk[]> {
  const content = await fs.readFile(filePath, "utf-8");
  const relativePath = path.relative(DOCS_DIR, filePath);

  // Extract source from top-level folder (e.g., 'iOS SDK')
  const pathParts = relativePath.split(path.sep);
  const source = pathParts.length > 1 ? pathParts[0] : "unknown";

  // Try to parse breadcrumb from first line if it exists
  const firstLine = content.split("\\n")[0]?.trim() || "";
  let breadcrumb = pathParts.join(" > ").replace(".md", "");

  if (firstLine.startsWith("> ")) {
    breadcrumb = firstLine.substring(2).trim();
  }

  // Construct a pseudo-URL based on path for identification
  const pseudoUrl = `ezviz://sdk/${relativePath.replace(/[\\\\/]/g, "/").replace(".md", "")}`;

  const chunks = chunkMarkdownByHeaders(content);

  return chunks.map((chunk) => {
    const sectionPath = `${breadcrumb} > ${chunk.title}`;
    const textContext = `Context: ${sectionPath}\\n\\n${chunk.content}`;

    return {
      id: generateChunkId(pseudoUrl, chunk.title),
      text: textContext,
      metadata: {
        source,
        title: chunk.title,
        url: pseudoUrl,
        section_path: sectionPath,
        type: "guide", // default
      },
    };
  });
}

async function ingestAll() {
  try {
    console.log(`Scanning directory: ${DOCS_DIR}`);
    const files = await getMarkdownFiles(DOCS_DIR);
    console.log(`Found ${files.length} markdown files.`);

    const allChunks: DocumentationChunk[] = [];

    for (const file of files) {
      console.log(`Processing: ${path.relative(DOCS_DIR, file)}`);
      const chunks = await processFile(file);
      allChunks.push(...chunks);
    }

    console.log(
      `Generated ${allChunks.length} total chunks. Sending to API...`,
    );

    const BATCH_SIZE = 10;
    let successCount = 0;

    for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
      const batch = allChunks.slice(i, i + BATCH_SIZE);

      const response = await fetch(INGEST_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "wyYXnYMJjqmGroBvsD01i7A1aHH8uMDG2aijLVXPJ9I=",
        },
        body: JSON.stringify({ chunks: batch }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      successCount += batch.length;
      console.log(
        `Successfully ingested batch: ${successCount}/${allChunks.length} chunks`,
      );
    }

    console.log("Ingestion completed successfully!");
  } catch (error) {
    console.error("Ingestion failed:", error);
    process.exit(1);
  }
}

ingestAll();
