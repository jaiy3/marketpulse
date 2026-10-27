import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from "prom-client";

export const metricsRegistry = new Registry();
collectDefaultMetrics({ register: metricsRegistry, prefix: "marketpulse_" });

export const httpRequests = new Counter({
  name: "marketpulse_http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"],
  registers: [metricsRegistry],
});

export const httpDuration = new Histogram({
  name: "marketpulse_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [metricsRegistry],
});

export const ingestedTicks = new Counter({
  name: "marketpulse_ticks_ingested_total",
  help: "Valid market ticks received from the upstream stream",
  labelNames: ["symbol"],
  registers: [metricsRegistry],
});

export const persistedTicks = new Counter({
  name: "marketpulse_ticks_persisted_total",
  help: "Market ticks written to PostgreSQL",
  labelNames: ["symbol"],
  registers: [metricsRegistry],
});

export const websocketClients = new Gauge({
  name: "marketpulse_websocket_clients",
  help: "Currently connected WebSocket clients",
  registers: [metricsRegistry],
});
