import { z } from "zod";

export type MarketTick = {
  symbol: string;
  price: string;
  quantity: string;
  eventTime: number;
  source: "binance";
};

const binanceTradeSchema = z.object({
  stream: z.string(),
  data: z.object({
    e: z.literal("trade"),
    s: z.string().regex(/^[A-Z0-9]{5,20}$/),
    p: z.string().regex(/^\d+(\.\d+)?$/),
    q: z.string().regex(/^\d+(\.\d+)?$/),
    T: z.number().int().positive(),
  }),
});

/**
 * Validates a raw Binance combined-stream trade message and maps it to our
 * internal tick shape. Returns null for anything we do not recognise, so a
 * malformed or unexpected message can never reach Redis or the database.
 */
export function parseBinanceTrade(raw: string): MarketTick | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }

  const result = binanceTradeSchema.safeParse(json);
  if (!result.success) return null;

  const { s, p, q, T } = result.data.data;
  return { symbol: s, price: p, quantity: q, eventTime: T, source: "binance" };
}

/**
 * One persisted record per symbol per second. Used as the BullMQ job ID, which
 * makes enqueueing idempotent: a duplicate or replayed tick in the same second
 * is dropped by the queue instead of creating a second row.
 */
export function persistenceJobId(tick: Pick<MarketTick, "symbol" | "eventTime">) {
  return `${tick.symbol}-${Math.floor(tick.eventTime / 1000)}`;
}

/** Exponential backoff for stream reconnects, capped at 30 seconds. */
export function nextReconnectDelay(current: number) {
  return Math.min(current * 2, 30_000);
}
