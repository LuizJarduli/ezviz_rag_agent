import { randomUUID } from "node:crypto";
import express from "express";
import * as z from "zod";
import { initChroma } from "./services/chroma.service.js";
import {
  query as ragQuery,
  queryDocumentation,
} from "./services/rag.service.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { env } from "./config/env.js";

enum Tools {
  QueryEzvizErrorCodes = "query_ezviz_error_codes",
  QueryEzvizDocumentation = "query_ezviz_documentation",
}

const createEzvizServer = () => {
  const server = new McpServer(
    {
      name: "ezvizinho",
      version: "1.0.0",
    },
    {
      capabilities: { logging: {} },
    },
  );

  server.registerTool(
    Tools.QueryEzvizErrorCodes,
    {
      description:
        "Search technical solutions for EZVIZ SDK error codes in the RAG database",
      inputSchema: z.object({
        query: z
          .string()
          .describe("Error code or technical question (ex: 120002)"),
      }),
    },
    async ({ query }: { query: string }) => {
      const result = await ragQuery(query);
      return {
        content: [{ type: "text", text: result.answer }],
      };
    },
  );

  server.registerTool(
    Tools.QueryEzvizDocumentation,
    {
      description:
        "Search EZVIZ documentation (SDKs, OpenAPI, glossary) for guides and references",
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            "Search query for documentation (e.g. 'how to initialize ios sdk')",
          ),
      }),
    },
    async ({ query }: { query: string }) => {
      const result = await queryDocumentation(query);

      let text = `Answer:\n${result.answer}\n\n---\n\n`;
      text += "Sources referenced:\n";
      text += result.sources
        .map((chunk, i) => {
          return `[${i + 1}] Title: ${chunk.metadata.title}\nPath: ${chunk.metadata.section_path}\nURL: ${chunk.metadata.url}`;
        })
        .join("\n\n");

      return {
        content: [{ type: "text", text: text }],
      };
    },
  );

  return server;
};

const MCP_PORT = env.MCP_PORT;
const app = createMcpExpressApp();

const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

const mcpPostHandler = async (req: express.Request, res: express.Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  try {
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          console.log(`MCP session initialized: ${sid}`);
          transports[sid] = transport;
        },
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) {
          delete transports[sid];
        }
      };

      const server = createEzvizServer();
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    } else {
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: Invalid session or missing header",
        },
        id: null,
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP Post error:", error);
    res.status(500).end();
  }
};

const mcpGetHandler = async (req: express.Request, res: express.Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid session or missing header");
    return;
  }

  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};

app.post("/mcp", mcpPostHandler);
app.get("/mcp", mcpGetHandler);

async function main() {
  await initChroma();
  app.listen(MCP_PORT, () => {
    console.log(`Ezvizinho Agent (SSE/HTTP) running on port ${MCP_PORT}`);
    console.log(`Endpoint for IDE: http://localhost:${MCP_PORT}/mcp`);
    console.log(
      `Available tools: ${Object.values(Tools)
        .filter((v) => typeof v === "string")
        .join(", ")}`,
    );
  });
}

main().catch(console.error);

process.on("SIGINT", async () => {
  for (const sid in transports) {
    await transports[sid].close();
  }
  process.exit(0);
});
