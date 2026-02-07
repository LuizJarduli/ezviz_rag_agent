import { Router } from "express";
import { z } from "zod";
import { query, getErrorByCode } from "../services/rag.service.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authMiddleware);

const querySchema = z.object({
  query: z.string().min(1, "Query is required"),
  topK: z.number().int().min(1).max(20).optional().default(5),
});

/**
 * POST /api/query
 * Natural language RAG query
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
 * GET /api/error/:code
 * Exact error code lookup
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
