const errorResponse = {
  type: "object",
  properties: {
    success: { type: "boolean", example: false },
    error: {
      type: "object",
      properties: { code: { type: "string" }, message: { type: "string" }, details: { type: "array", items: {} } },
    },
  },
};

const tick = {
  type: "object",
  properties: {
    symbol: { type: "string", example: "BTCUSDT" },
    price: { type: "string", example: "67250.12000000", description: "Decimal string to avoid float rounding" },
    quantity: { type: "string", example: "0.00150000" },
    eventTime: { type: "integer", example: 1761235200000, description: "Exchange trade time (ms since epoch)" },
    source: { type: "string", example: "binance" },
  },
};

const credentials = {
  type: "object",
  required: ["email", "password"],
  properties: {
    email: { type: "string", format: "email", example: "dev@example.com" },
    password: { type: "string", minLength: 8, example: "a-strong-password" },
  },
};

const json = (schema: object) => ({ "application/json": { schema } });

export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "MarketPulse API",
    version: "1.1.0",
    description:
      "Real-time crypto market data. Live trades are ingested from Binance, cached in Redis, fanned out over WebSockets and persisted to PostgreSQL via a BullMQ queue.\n\n" +
      "**WebSocket:** connect to `/ws` and send `{\"type\":\"subscribe\",\"symbols\":[\"BTCUSDT\",\"ETHUSDT\"]}`. " +
      "You receive a snapshot of the latest prices, then every trade as it happens.",
  },
  servers: [{ url: "/" }],
  tags: [{ name: "Market" }, { name: "Auth" }, { name: "Operations" }],
  paths: {
    "/api/market/latest": {
      get: {
        tags: ["Market"],
        summary: "Latest cached price per symbol",
        description: "Served from Redis. Prices older than 30 seconds expire rather than being returned stale.",
        parameters: [
          {
            name: "symbols",
            in: "query",
            required: true,
            description: "Comma-separated, up to 20",
            schema: { type: "string", example: "BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT" },
          },
        ],
        responses: {
          "200": {
            description: "Latest ticks (symbols with no recent trade are omitted)",
            content: json({ type: "object", properties: { success: { type: "boolean" }, data: { type: "array", items: tick } } }),
          },
          "400": { description: "Invalid query", content: json(errorResponse) },
          "429": { description: "Rate limited", content: json(errorResponse) },
        },
      },
    },
    "/api/market/history": {
      get: {
        tags: ["Market"],
        summary: "Paginated price history",
        description: "Served from PostgreSQL using a (symbol, eventTime DESC) index. One record per symbol per second.",
        parameters: [
          { name: "symbol", in: "query", required: true, schema: { type: "string", example: "BTCUSDT" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 50 } },
        ],
        responses: {
          "200": {
            description: "A page of history, newest first",
            content: json({
              type: "object",
              properties: {
                success: { type: "boolean" },
                data: {
                  type: "object",
                  properties: {
                    items: { type: "array", items: tick },
                    pagination: {
                      type: "object",
                      properties: {
                        page: { type: "integer" },
                        limit: { type: "integer" },
                        total: { type: "integer" },
                        pages: { type: "integer" },
                      },
                    },
                  },
                },
              },
            }),
          },
          "400": { description: "Invalid query", content: json(errorResponse) },
        },
      },
    },
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Create an account",
        requestBody: { required: true, content: json(credentials) },
        responses: {
          "201": { description: "Account created; returns user and JWT" },
          "400": { description: "Validation failed", content: json(errorResponse) },
          "409": { description: "Email already registered", content: json(errorResponse) },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in",
        requestBody: { required: true, content: json(credentials) },
        responses: {
          "200": { description: "Returns user and a 2-hour JWT" },
          "401": { description: "Invalid credentials", content: json(errorResponse) },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Current user (requires Bearer token)",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "The authenticated user" },
          "401": { description: "Missing or invalid token", content: json(errorResponse) },
        },
      },
    },
    "/health": {
      get: {
        tags: ["Operations"],
        summary: "Dependency health (PostgreSQL, Redis)",
        responses: { "200": { description: "Healthy" }, "503": { description: "Degraded" } },
      },
    },
    "/metrics": { get: { tags: ["Operations"], summary: "Prometheus metrics", responses: { "200": { description: "Text exposition format" } } } },
  },
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
  },
};
