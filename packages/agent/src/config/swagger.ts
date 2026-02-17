import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "EZVIZ RAG Agent API",
      version: "1.0.0",
      description:
        "RAG-powered API for querying EZVIZ SDK error codes with natural language troubleshooting assistance",
      contact: {
        name: "API Support",
      },
    },
    servers: [
      {
        url: "http://localhost:3001",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "API key for authentication",
        },
      },
      schemas: {
        ErrorCode: {
          type: "object",
          properties: {
            id: { type: "string", example: "395405" },
            code: { type: "string", example: "395405" },
            description: {
              type: "string",
              example: "流媒体向设备发送或接受信令超时",
            },
            solution: { type: "string", example: "检查设备网络；重启设备" },
            category: { type: "string", example: "network" },
            moduleCode: { type: "string", example: "stream" },
          },
        },
        QueryRequest: {
          type: "object",
          required: ["query"],
          properties: {
            query: {
              type: "string",
              example: "camera offline error",
              description: "Natural language query or error code",
            },
            topK: {
              type: "integer",
              minimum: 1,
              maximum: 20,
              default: 5,
              description: "Number of results to return",
            },
          },
        },
        QueryResponse: {
          type: "object",
          properties: {
            answer: {
              type: "string",
              description: "AI-generated troubleshooting response",
            },
            sources: {
              type: "array",
              items: { $ref: "#/components/schemas/ErrorCode" },
              description: "Retrieved error codes used for the response",
            },
          },
        },
        IngestResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            count: { type: "integer", description: "Number of codes ingested" },
            message: { type: "string" },
          },
        },
        HealthResponse: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["healthy", "unhealthy"] },
            timestamp: { type: "string", format: "date-time" },
            chromadb: {
              type: "object",
              properties: {
                connected: { type: "boolean" },
                documentCount: { type: "integer" },
              },
            },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
