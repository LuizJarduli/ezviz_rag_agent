# EZVIZ RAG Agent (ezvizinho)

> **RAG-powered AI Assistant for EZVIZ SDK Troubleshooting**

This project provides an intelligent agent capable of answering technical questions and troubleshooting error codes related to the EZVIZ SDK. It utilizes Retrieval-Augmented Generation (RAG) with ChromaDB and Ollama to provide accurate, context-aware responses.

## Features

- **RAG Architecture**: Ingests and retrieves technical documentation and error codes.
- **Dual Interface**:
  - **REST API**: Standard endpoints for ingestion and querying (`port 3001`).
  - **MCP Server**: Model Context Protocol implementation for IDE integration (`port 3002`).
- **Vector Database**: Uses ChromaDB for efficient similarity search.
- **LLM Integration**: powered by Ollama (local) or compatible LLM providers.

## Prerequisites

- **Node.js**: v20 or higher
- **Docker & Docker Compose**: For containerized deployment
- **Ollama**: Running locally or accessible via network (for LLM capabilities)

## Installation

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd ezviz_rag_agent
   ```

2. **Configure Environment:**

   Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` to match your setup:

   ```env
   PORT=3001           # REST API Port
   MCP_PORT=3002       # MCP Server Port
   OLLAMA_HOST=http://host.docker.internal
   OLLAMA_PORT=11434
   CHROMA_HOST=localhost
   CHROMA_PORT=8000
   API_KEYS=your-secret-key,another-key
   ```

3. **Install Dependencies (Local Dev):**

   ```bash
   npm install
   ```

## Running the Project

### Option A: Docker (Recommended)

Run the entire stack (API + MCP + ChromaDB):

```bash
docker-compose up -d
```

- **REST API**: `http://localhost:3001`
- **MCP Server**: `http://localhost:3002/mcp`
- **ChromaDB**: `http://localhost:8000`

### Option B: Local Development

1. **Start ChromaDB (Required):**

   ```bash
   docker run -d -p 8000:8000 chromadb/chroma
   ```

2. **Run REST API:**

   ```bash
   npm run dev
   # Runs on port 3001
   ```

3. **Run MCP Agent:**

   ```bash
   npx tsx src/mcp.ts
   # Runs on port 3002
   ```

## API Endpoints (REST)

The REST API is available at `http://localhost:3001`.

| Method | Endpoint | Auth | Description |
| -------- | ---------- | ------ | ------------- |
| `GET` | `/health` | No | Health check |
| `GET` | `/docs` | No | Swagger Documentation |
| `POST` | `/api/ingest` | Yes | Ingest error codes/docs |
| `POST` | `/api/query` | Yes | Natural language query |

**Example Query:**

```bash
curl -X POST http://localhost:3001/api/query \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-key" \
  -d '{"query": "What does error 120002 mean?"}'
```

## Model Context Protocol (MCP)

The project exposes an MCP server compatible with IDEs like Cursor and Windsurf.

- **Transport**: SSE (Server-Sent Events)
- **URL**: `http://localhost:3002/mcp`

### Available Tools

- **`query_ezviz_error_codes`**:
  - **Description**: Search technical solutions for EZVIZ SDK error codes in the RAG database.
  - **Input**: `{ "query": "error code or question" }`

### Connecting to Cursor/Windsurf

Add a new MCP server in your IDE configuration:

- **Name**: Ezvizinho
- **Type**: SSE
- **URL**: `http://localhost:3002/mcp`
