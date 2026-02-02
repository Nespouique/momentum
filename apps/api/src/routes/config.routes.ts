import { Router, Request, Response } from "express";

const router = Router();

// GET /config/ai-status - Check if AI coaching is available
router.get("/ai-status", (_req: Request, res: Response) => {
  const apiKey = process.env["OPENAI_API_KEY"];
  const isConfigured = !!apiKey && apiKey.length > 0;

  res.json({
    data: {
      available: isConfigured,
    },
  });
});

export default router;
