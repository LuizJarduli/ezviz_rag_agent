import { Router } from "express";
import { ingestErrorCodes } from "../services/rag.service.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authMiddleware);

/**
 * @openapi
 * /api/ingest:
 *   post:
 *     summary: Ingest error codes
 *     description: Bulk load error codes from JSON into the vector database
 *     tags: [Ingestion]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 moduleCode: { type: string }
 *                 detailCode: { type: string }
 *                 description: { type: string }
 *                 solution: { type: string }
 *                 updateTime: { type: number }
 *     responses:
 *       200:
 *         description: Successfully ingested
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/IngestResponse'
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Missing API key
 *       403:
 *         description: Invalid API key
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
