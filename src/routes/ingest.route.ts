import { Router } from "express";
import { ingestErrorCodes } from "../services/rag.service.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authMiddleware);

/**
 * POST /api/ingest
 * Ingest error codes from JSON body
 */
router.post("/", async (req, res) => {
  try {
    const result = await ingestErrorCodes(req.body);
    res.json(result);
  } catch (error) {
    console.error("Ingestion error:", error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : "Ingestion failed",
    });
  }
});

export default router;
