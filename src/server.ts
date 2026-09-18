import http from "http";
import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./config/prisma";
import { redis, redisSubscriber } from "./config/redis";
import { attachMarketWebSocket } from "./ws-server";

const server = http.createServer(app);
attachMarketWebSocket(server);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT, websocket: `/ws` }, "MarketPulse API listening");
});

const shutdown = async () => {
  logger.info("Shutting down MarketPulse");
  server.close();
  await prisma.$disconnect();
  await redisSubscriber.quit();
  await redis.quit();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
