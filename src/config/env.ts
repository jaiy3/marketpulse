import "dotenv/config";
import { z } from "zod";

const booleanFlag = z
  .enum(["true", "false", "1", "0"])
  .default("false")
  .transform((value) => value === "true" || value === "1");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  // data-stream.binance.vision is Binance's public, market-data-only endpoint.
  BINANCE_WS_URL: z
    .string()
    .url()
    .default(
      "wss://data-stream.binance.vision/stream?streams=btcusdt@trade/ethusdt@trade/solusdt@trade/bnbusdt@trade"
    ),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  // Run the ingestion worker inside the API process. Useful on hosts where a
  // separate background worker is not available (e.g. a single free web service).
  INGEST_IN_PROCESS: booleanFlag,
});

export const env = schema.parse(process.env);
