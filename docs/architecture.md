# MarketPulse Architecture

```text
                     Binance Trade Stream
                              |
                              v
                    +-------------------+
                    | Market Worker     |
                    | validate events   |
                    +---------+---------+
                              |
                   +----------+----------+
                   |                     |
                   v                     v
             Redis latest          BullMQ Queue
                   |                     |
                   |                     v
                   |               PostgreSQL
                   |               price history
                   v
             Redis Pub/Sub
                   |
                   v
             WebSocket Hub
                   |
                   v
              Connected Clients

REST clients -> Express API -> Redis cache / PostgreSQL
```

## Why each component exists

- **Express + TypeScript:** typed REST API and application boundaries.
- **PostgreSQL + Prisma:** durable relational storage and migrations.
- **Redis:** low-latency latest-price cache and pub/sub transport.
- **BullMQ:** asynchronous persistence so the market stream is not blocked by database writes.
- **WebSockets:** push live ticks to subscribed clients without polling.
- **Worker process:** isolates ingestion and persistence from HTTP traffic.
- **Docker Compose:** reproducible local infrastructure for API, worker, PostgreSQL and Redis.
- **GitHub Actions:** repeatable lint, test and build checks on every change.
