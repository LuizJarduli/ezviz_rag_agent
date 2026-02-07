import { Router } from "express";
import { getIngestionStats } from "../services/rag.service.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const stats = await getIngestionStats();
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      chromadb: {
        connected: true,
        documentCount: stats.count,
      },
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
