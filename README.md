# EZVIZ RAG Agent

RAG-powered API for querying EZVIZ SDK error codes with natural language troubleshooting assistance.

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Gemini API key

### Setup

1. **Clone and configure:**

   ```bash
   cp .env.example .env
   # Edit .env with your GEMINI_API_KEY
   ```

2. **Start with Docker Compose:**

   ```bash
   docker-compose up -d
   ```

3. **Or run locally (dev mode):**

   ```bash
   # Start ChromaDB
   docker run -d -p 8000:8000 chromadb/chroma

   # Install and run
   npm install
   npm run dev
   ```

## API Endpoints

| Method | Endpoint | Auth | Description |
| -------- | ---------- | ------ | ------------- |
| GET | `/health` | No | Health check |
| POST | `/api/ingest` | API Key | Ingest error codes |
| POST | `/api/query` | API Key | Natural language query |
| GET | `/api/query/error/:code` | API Key | Exact code lookup |

### Authentication

Include header: `x-api-key: your-api-key`

### Examples

**Ingest error codes:**

```bash
curl -X POST http://localhost:3001/api/ingest \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-key-1" \
  -d @data/error_codes.json
```

**Natural language query:**

```bash
curl -X POST http://localhost:3001/api/query \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-key-1" \
  -d '{"query": "camera offline timeout error"}'
```

**Exact code lookup:**

```bash
curl http://localhost:3001/api/query/error/395405 \
  -H "x-api-key: dev-key-1"
```

## Environment Variables

| Variable | Description | Default |
| -------- | ----------- | ------- |
| `PORT` | API port | `3001` |
| `GEMINI_API_KEY` | Gemini API key | required |
| `CHROMA_HOST` | ChromaDB host | `localhost` |
| `CHROMA_PORT` | ChromaDB port | `8000` |
| `API_KEYS` | Comma-separated valid API keys | required |
