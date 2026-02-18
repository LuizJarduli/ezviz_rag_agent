export interface DocumentationChunk {
  id: string;
  text: string;
  metadata: DocumentationMetadata;
}

export interface DocumentationMetadata {
  // 'ios_sdk', 'android_sdk', 'openapi'
  source: string;
  // 'ios', 'android', 'js', 'cross-platform'
  platform: string;
  title: string;
  url: string;
  // Side menu path
  section_path: string;
  // 'error_code', 'tutorial', 'api_reference'
  type: string;
  // 'en', 'pt', 'zh'
  language: string;
  // Prevent duplicity
  hash: string;
  version?: string;
}

export interface IngestDocumentationRequest {
  chunks: DocumentationChunk[];
}
