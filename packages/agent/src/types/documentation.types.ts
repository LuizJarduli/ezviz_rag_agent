export interface DocumentationChunk {
  id: string;
  text: string;
  metadata: DocumentationMetadata;
}

export interface DocumentationMetadata {
  source: string; // e.g., 'ios_sdk', 'android_sdk', 'openapi', 'glossary'
  title: string;
  url: string;
  section_path: string;
  type: string;
  version?: string;
  language?: string;
}

export interface IngestDocumentationRequest {
  chunks: DocumentationChunk[];
}
