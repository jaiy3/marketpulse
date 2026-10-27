import WebSocket from "ws";
import { Queue, Worker } from "bullmq";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { prisma } from "../config/prisma";
import { bullConnectionOptions, redis } from "../config/redis";
import { ingestedTicks, persistedTicks } from "../metrics";
import { nextReconnectDelay, parseBinanceTrade, persistenceJobId, type MarketTick } from "./binance";

const QUEUE_NAME = "price-persistence";
export const LATEST_TTL_SECONDS = 30;

/**
 * Connects to the Binance trade stream and, for every valid trade:
 *  1. caches it as the latest price in Redis,
 *  2. publishes it on Redis pub/sub so every API instance can push it to WebSocket clients,
 *  3. enqueues it for asynchronous persistence to PostgreSQL (BullMQ, idempotent job IDs).
 *
 * Returns a stop function for graceful shutdown.
 */
export function startMarketIngestion() {
  const connection = bullConnectionOptions();

  const persistenceQueue = new Queue<MarketTick>(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 1_000 },
      removeOnComplete: { count: 1_000 },
      removeOnFail: { count: 1_000, age: 86_400 },
    },
  });

  const persistenceWorker = new Worker<MarketTick>(
    QUEUE_NAME,
    async (job) => {
      const tick = job.data;
      await prisma.priceTick.create({
        data: {
          symbol: tick.symbol,
          price: tick.price,
          quantity: tick.quantity,
          eventTime: new Date(tick.eventTime),
        },
      });
      persistedTicks.inc({ symbol: tick.symbol });
    },
    { connection, concurrency: 4 }
  );

  persistenceWorker.on("failed", (job, error) => {
    logger.error({ jobId: job?.id, attempts: job?.attemptsMade, err: error }, "Price persistence job failed");
  });

  let socket: WebSocket | undefined;
  let reconnectDelay = 1_000;
  let reconnectTimer: NodeJS.Timeout | undefined;
  let stopped = false;

  async function handleMessage(raw: WebSocket.RawData) {
    const tick = parseBinanceTrade(raw.toString());
    if (!tick) {
      logger.warn("Ignored malformed market event");
      return;
    }

    ingestedTicks.inc({ symbol: tick.symbol });
    const payload = JSON.stringify(tick);

    await redis.set(`market:latest:${tick.symbol}`, payload, "EX", LATEST_TTL_SECONDS);
    await redis.publish("market:ticks", payload);
    await persistenceQueue.add("persist-tick", tick, { jobId: persistenceJobId(tick) });
  }

  function connect() {
    if (stopped) return;
    socket = new WebSocket(env.BINANCE_WS_URL);

    socket.on("open", () => {
      reconnectDelay = 1_000;
      logger.info("Connected to Binance market stream");
    });

    socket.on("message", (raw) => {
      handleMessage(raw).catch((error) => logger.error({ err: error }, "Failed to process market tick"));
    });

    socket.on("error", (error) => logger.error({ err: error }, "Binance stream error"));

    socket.on("close", () => {
      if (stopped) return;
      logger.warn({ reconnectDelay }, "Binance stream closed; reconnecting");
      reconnectTimer = setTimeout(connect, reconnectDelay);
      reconnectDelay = nextReconnectDelay(reconnectDelay);
    });
  }

  connect();

  return async function stop() {
    stopped = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    socket?.close();
    await persistenceWorker.close();
    await persistenceQueue.close();
  };
}
