# MarketPulse Architecture

![Architecture](images/architecture.svg)

## Components

| Component | Responsibility |
|---|---|
| Ingestion worker (`src/ingestion`) | Binance WebSocket client, Zod validation, reconnect with backoff, writes to Redis and the queue |
| Redis cache | `market:latest:<SYMBOL>`, 30s TTL |
| Redis pub/sub | `market:ticks` channel, fans out to every API instance |
| BullMQ queue | `price-persistence`, 5 attempts with exponential backoff, idempotent `symbol-second` job IDs |
| PostgreSQL | `PriceTick` table, indexed on `(symbol, eventTime DESC)` and `eventTime` |
| REST API (`src/app.ts`) | Market, auth, health, metrics, OpenAPI docs, static dashboard |
| WebSocket hub (`src/ws-server.ts`) | Per-client symbol subscriptions, snapshot on subscribe, heartbeat, backpressure guard |

## Process models

- **Single process** (`INGEST_IN_PROCESS=true`): API and ingestion together. Used for the free-tier demo.
- **Split** (`npm start` + `npm run worker`): ingestion isolated from HTTP traffic. Recommended for production; scale API instances horizontally, since pub/sub makes them stateless.

## Scaling path

API/worker containers on ECS or Fargate, PostgreSQL on RDS (with time-based partitioning once history grows), Redis on ElastiCache, secrets in a secrets manager, metrics scraped into Prometheus and Grafana.
