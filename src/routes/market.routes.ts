import { Router } from "express";
import { historyQuerySchema, symbolsSchema } from "../schemas/market";
import { getHistory, getLatest } from "../services/market.service";

const router = Router();

router.get("/latest", async (req, res) => {
  const { symbols } = symbolsSchema.parse(req.query);
  const data = await getLatest(symbols);
  return res.json({ success: true, data });
});

router.get("/history", async (req, res) => {
  const input = historyQuerySchema.parse(req.query);
  const data = await getHistory(input.symbol, input.page, input.limit);
  return res.json({ success: true, data });
});

export default router;
