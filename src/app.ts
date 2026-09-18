import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { apiRateLimit, authRateLimit } from "./middleware/rate-limit";
import { errorHandler } from "./middleware/error-handler";
import authRoutes from "./routes/auth.routes";
import marketRoutes from "./routes/market.routes";
import healthRoutes from "./routes/health.routes";
import { openapi } from "./docs";
import { httpDuration, httpRequests, metricsRegistry } from "./metrics";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()) }));
app.use(express.json({ limit: "100kb" }));
app.use(pinoHttp({ logger }));
app.use(apiRateLimit);

app.use((req, res, next) => {
  const end = httpDuration.startTimer({ method: req.method, route: req.path });
  res.on("finish", () => {
    end();
    httpRequests.inc({ method: req.method, route: req.route?.path ?? req.path, status: String(res.statusCode) });
  });
  next();
});

app.get("/", (_req, res) => res.json({ success: true, service: "MarketPulse API", version: "1.0.0" }));
app.use("/health", healthRoutes);
app.use("/api/auth", authRateLimit, authRoutes);
app.use("/api/market", marketRoutes);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));
app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", metricsRegistry.contentType);
  res.end(await metricsRegistry.metrics());
});

app.use(errorHandler);
