import express from "express";
import { env } from "./config/env.js";
import { initChroma } from "./services/chroma.service.js";
import healthRoute from "./routes/health.route.js";
import ingestRoute from "./routes/ingest.route.js";
import queryRoute from "./routes/query.route.js";

const app = express();

// Middleware
app.use(express.json({ limit: "50mb" }));

// Routes
app.use("/health", healthRoute);
app.use("/api/ingest", ingestRoute);
app.use("/api/query", queryRoute);

// Error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  },
);

async function start() {
  try {
    // Initialize ChromaDB connection
    await initChroma();

    app.listen(env.PORT, () => {
      console.log(`   EZVIZ RAG Agent running on port ${env.PORT}`);
      console.log(`   Health: http://localhost:${env.PORT}/health`);
      console.log(`   Ingest: POST http://localhost:${env.PORT}/api/ingest`);
      console.log(`   Query:  POST http://localhost:${env.PORT}/api/query`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
