export interface MarkdownChunk {
  title: string;
  content: string;
}

/**
 * Splits markdown content by headers (#, ##, ###)
 * and returns an array of chunks with their respective titles.
 */
export function chunkMarkdownByHeaders(markdown: string): MarkdownChunk[] {
  const lines = markdown.split("\\n");
  const chunks: MarkdownChunk[] = [];

  let currentTitle = "Introduction";
  let currentContent: string[] = [];

  for (const line of lines) {
    // Match headers like "# Title", "## Title", "### Title"
    const headerMatch = line.match(/^(#{1,6})\\s+(.+)$/);

    if (headerMatch) {
      // Save previous chunk if it has content
      if (currentContent.length > 0 && currentContent.join("").trim() !== "") {
        chunks.push({
          title: currentTitle,
          content: currentContent.join("\\n").trim(),
        });
      }

      // Start new chunk
      currentTitle = headerMatch[2].trim();
      currentContent = [line]; // Include header in content for context
    } else {
      currentContent.push(line);
    }
  }

  // Push the final chunk
  if (currentContent.length > 0 && currentContent.join("").trim() !== "") {
    chunks.push({
      title: currentTitle,
      content: currentContent.join("\\n").trim(),
    });
  }

  return chunks;
}
