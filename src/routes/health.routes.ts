import { Router } from "express";
import { prisma } from "../config/prisma";
import { redis } from "../config/redis";

const router = Router();

router.get("/", async (_req, res) => {
  const checks: Record<string, string> = { database: "down", redis: "down" };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "up";
  } catch {}

  try {
    await redis.ping();
    checks.redis = "up";
  } catch {}

  const healthy = Object.values(checks).every((value) => value === "up");
  return res.status(healthy ? 200 : 503).json({ success: healthy, status: healthy ? "ok" : "degraded", checks });
});

export default router;
