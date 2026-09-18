import WebSocket from "ws";
import { Queue, Worker } from "bullmq";
import { z } from "zod";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { prisma } from "../config/prisma";
import { redis } from "../config/redis";

const binanceEventSchema = z.object({
  stream: z.string(),
  data: z.object({
    e: z.string(),
    s: z.string(),
    p: z.string(),
    q: z.string(),
    T: z.number(),
  }),
});

const queueConnection = new (require("ioredis"))(env.REDIS_URL, { maxRetriesPerRequest: null });
const persistenceQueue = new Queue("price-persistence", {
  connection: queueConnection,
  defaultJobOptions: { removeOnComplete: { count: 1000 }, removeOnFail: { count: 1000, age: 86400 } },
});

new Worker(
  "price-persistence",
  async (job) => {
    const tick = job.data as { symbol: string; price: string; quantity: string; eventTime: number };
    await prisma.priceTick.create({
      data: {
        symbol: tick.symbol,
        price: tick.price,
        quantity: tick.quantity,
        eventTime: new Date(tick.eventTime),
      },
    });
  },
  { connection: queueConnection, concurrency: 4 }
).on("failed", (job, error) => {
  logger.error({ jobId: job?.id, err: error }, "Price persistence job failed");
});

function connect() {
  const socket = new WebSocket(env.BINANCE_WS_URL);
  let reconnectDelay = 1000;

  socket.on("open", () => {
    reconnectDelay = 1000;
    logger.info("Connected to Binance market stream");
  });

  socket.on("message", async (raw) => {
    try {
      const parsed = binanceEventSchema.parse(JSON.parse(raw.toString()));
      const tick = {
        symbol: parsed.data.s,
        price: parsed.data.p,
        quantity: parsed.data.q,
        eventTime: parsed.data.T,
        source: "binance" as const,
      };

      await redis.set(`market:latest:${tick.symbol}`, JSON.stringify(tick), "EX", 30);
      await redis.publish("market:ticks", JSON.stringify(tick));

      const second = Math.floor(tick.eventTime / 1000);
      await persistenceQueue.add("persist-tick", tick, { jobId: `${tick.symbol}-${second}` });
    } catch (error) {
      logger.warn({ err: error }, "Ignored malformed market event");
    }
  });

  socket.on("error", (error) => logger.error({ err: error }, "Binance stream error"));

  socket.on("close", () => {
    logger.warn({ reconnectDelay }, "Binance stream closed; reconnecting");
    setTimeout(connect, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
  });
}

connect();

const shutdown = async () => {
  await persistenceQueue.close();
  await prisma.$disconnect();
  await redis.quit();
  await queueConnection.quit();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
