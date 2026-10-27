import path from "path";
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

// Render and most PaaS hosts sit behind one proxy; needed for correct client IPs in rate limiting.
app.set("trust proxy", 1);

app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()) }));
app.use(express.json({ limit: "100kb" }));
app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/health" } }));

// Metrics are labelled by the matched route pattern (e.g. /api/market/history),
// not the raw URL, so label cardinality stays bounded.
app.use((req, res, next) => {
  const end = httpDuration.startTimer({ method: req.method });
  res.on("finish", () => {
    // This API has no path parameters, so a matched route's path is already a bounded label.
    const route = req.route ? req.originalUrl.split("?")[0] : "unmatched";
    const status = String(res.statusCode);
    end({ route, status });
    httpRequests.inc({ method: req.method, route, status });
  });
  next();
});

// Live dashboard (static) at "/".
app.use(express.static(path.join(__dirname, "..", "public"), { maxAge: "1h" }));

app.get("/api", (_req, res) =>
  res.json({
    success: true,
    service: "MarketPulse API",
    version: "1.1.0",
    docs: "/docs",
    health: "/health",
    websocket: "/ws",
  })
);
app.use("/health", healthRoutes);
app.use("/api", apiRateLimit);
app.use("/api/auth", authRateLimit, authRoutes);
app.use("/api/market", marketRoutes);
app.get("/openapi.json", (_req, res) => res.json(openapi));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: "MarketPulse API docs" }));
app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", metricsRegistry.contentType);
  res.end(await metricsRegistry.metrics());
});

app.use((_req, res) =>
  res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Route not found" } })
);
app.use(errorHandler);
