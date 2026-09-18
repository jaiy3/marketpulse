import { z } from "zod";

export const symbolsSchema = z.object({
  symbols: z.string().min(1).transform((value) =>
    [...new Set(value.split(",").map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))].slice(0, 20)
  ),
});

export const historyQuerySchema = z.object({
  symbol: z.string().regex(/^[A-Z0-9]{5,20}$/),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
