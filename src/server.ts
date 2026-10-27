import http from "http";
import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./config/prisma";
import { redis, redisSubscriber } from "./config/redis";
import { startMarketIngestion } from "./ingestion/market-ingestion";
import { attachMarketWebSocket } from "./ws-server";

const server = http.createServer(app);
const wss = attachMarketWebSocket(server);

const stopIngestion = env.INGEST_IN_PROCESS ? startMarketIngestion() : undefined;

server.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, websocket: "/ws", ingestion: env.INGEST_IN_PROCESS ? "in-process" : "separate worker" },
    "MarketPulse API listening"
  );
});

const shutdown = async () => {
  logger.info("Shutting down MarketPulse");
  wss.close();
  server.close();
  await stopIngestion?.();
  await prisma.$disconnect();
  await redisSubscriber.quit();
  await redis.quit();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
