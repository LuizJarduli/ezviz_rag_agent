import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { ingestErrorCodes } from "../services/rag.service.js";
import { addDocumentationChunks } from "../services/collections/documentation.collection.js";
import type { IngestDocumentationRequest } from "../types/documentation.types.js";

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
    console.error("Ingest error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Ingestion failed",
    });
  }
});

/**
 * @openapi
 * /api/ingest/documentation:
 *   post:
 *     summary: Ingest documentation chunks
 *     description: Add documentation chunks to the vector database
 *     tags: [Ingest]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               chunks:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/DocumentationChunk'
 *     responses:
 *       200:
 *         description: Ingestion successful
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Missing API key
 */
router.post("/documentation", async (req, res) => {
  try {
    const body = req.body as IngestDocumentationRequest;

    if (!body.chunks || !Array.isArray(body.chunks)) {
      res
        .status(400)
        .json({ error: "Invalid request: 'chunks' array is required" });
      return;
    }

    await addDocumentationChunks(body.chunks);

    res.json({
      success: true,
      count: body.chunks.length,
      message: `Successfully ingested ${body.chunks.length} documentation chunks`,
    });
  } catch (error) {
    console.error("Documentation ingest error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Ingestion failed",
    });
  }
});

export default router;
