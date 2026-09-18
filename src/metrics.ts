import { Counter, Histogram, Registry } from "prom-client";

export const metricsRegistry = new Registry();

export const httpRequests = new Counter({
  name: "marketpulse_http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"],
  registers: [metricsRegistry],
});

export const httpDuration = new Histogram({
  name: "marketpulse_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route"],
  registers: [metricsRegistry],
});
