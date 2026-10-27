import { logger } from "../config/logger";
import { prisma } from "../config/prisma";
import { redis } from "../config/redis";
import { startMarketIngestion } from "../ingestion/market-ingestion";

// Standalone ingestion process. In a multi-process deployment this runs
// separately from the API so a slow stream or database never affects HTTP traffic.
const stopIngestion = startMarketIngestion();
logger.info("Market ingestion worker started");

const shutdown = async () => {
  logger.info("Shutting down market worker");
  await stopIngestion();
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
