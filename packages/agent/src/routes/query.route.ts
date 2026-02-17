import { Router } from "express";
import { z } from "zod";
import {
  query,
  getErrorByCode,
  getAllErrors,
  queryDocumentation,
} from "../services/rag.service.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authMiddleware);

/**
 * @openapi
 * /api/query/errors:
 *   get:
 *     summary: List all error codes
 *     description: Get all error codes from the database with optional pagination
 *     tags: [Query]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of error codes to return
 *       - name: offset
 *         in: query
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of error codes to skip
 *     responses:
 *       200:
 *         description: List of error codes
 *       401:
 *         description: Missing API key
 */
router.get("/errors", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Number(req.query.offset) || 0;

    const result = await getAllErrors(limit, offset);
    res.json(result);
  } catch (error) {
    console.error("List errors error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to list errors",
    });
  }
});

const querySchema = z.object({
  query: z.string().min(1, "Query is required"),
  topK: z.number().int().min(1).max(20).optional().default(5),
});

/**
 * @openapi
 * /api/query:
 *   post:
 *     summary: RAG query
 *     description: Natural language query that retrieves relevant error codes and generates a troubleshooting response
 *     tags: [Query]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QueryRequest'
 *     responses:
 *       200:
 *         description: Query result with AI-generated answer
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QueryResponse'
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Missing API key
 */
router.post("/", async (req, res) => {
  try {
    const parsed = querySchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid request",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await query(parsed.data.query, parsed.data.topK);
    res.json(result);
  } catch (error) {
    console.error("Query error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Query failed",
    });
  }
});

/**
 * @openapi
 * /api/query/documentation:
 *   post:
 *     summary: Search documentation
 *     description: Search for relevant documentation chunks
 *     tags: [Query]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QueryRequest'
 *     responses:
 *       200:
 *         description: List of documentation chunks
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Missing API key
 */
router.post("/documentation", async (req, res) => {
  try {
    const parsed = querySchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid request",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await queryDocumentation(
      parsed.data.query,
      parsed.data.topK,
    );
    res.json(result);
  } catch (error) {
    console.error("Documentation query error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Query failed",
    });
  }
});

/**
 * @openapi
 * /api/query/error/{code}:
 *   get:
 *     summary: Exact error code lookup
 *     description: Get a specific error code by its exact code number
 *     tags: [Query]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: code
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Error code number (e.g., 395405)
 *     responses:
 *       200:
 *         description: Error code found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorCode'
 *       404:
 *         description: Error code not found
 *       401:
 *         description: Missing API key
 */
router.get("/error/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const errorCode = await getErrorByCode(code);

    if (!errorCode) {
      res.status(404).json({ error: `Error code ${code} not found` });
      return;
    }

    res.json(errorCode);
  } catch (error) {
    console.error("Lookup error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Lookup failed",
    });
  }
});

export default router;
