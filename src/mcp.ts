import { randomUUID } from "node:crypto";
import express from "express";
import * as z from "zod";
import { initChroma } from "./services/chroma.service.js";
import { query as ragQuery } from "./services/rag.service.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { env } from "./config/env.js";

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
    "query_ezviz_error_codes",
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
  });
}

main().catch(console.error);

process.on("SIGINT", async () => {
  for (const sid in transports) {
    await transports[sid].close();
  }
  process.exit(0);
});
