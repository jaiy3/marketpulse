export const openapi = {
  openapi: "3.0.3",
  info: { title: "MarketPulse API", version: "1.0.0", description: "Real-time market data API with Redis, PostgreSQL and WebSockets." },
  servers: [{ url: "http://localhost:4000" }],
  paths: {
    "/health": { get: { summary: "Service health", responses: { "200": { description: "Healthy" }, "503": { description: "Degraded" } } } },
    "/api/auth/register": { post: { summary: "Create account" } },
    "/api/auth/login": { post: { summary: "Log in" } },
    "/api/market/latest": { get: { summary: "Get latest cached market prices" } },
    "/api/market/history": { get: { summary: "Get paginated persisted price history" } },
    "/metrics": { get: { summary: "Prometheus metrics" } },
  },
};
