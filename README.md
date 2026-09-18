# MarketPulse

A backend-focused real-time market data platform built to demonstrate production-style Node.js engineering.

## Engineering focus

- TypeScript + Node.js + Express REST API
- PostgreSQL + Prisma migrations, relationships and indexes
- Redis caching and pub/sub
- WebSockets for live market subscriptions
- BullMQ background jobs for asynchronous persistence
- Binance external market-data integration
- Zod request/event validation
- JWT authentication and role-ready authorization model
- Rate limiting, Helmet and CORS controls
- Structured logging with Pino
- Prometheus-compatible metrics endpoint
- Vitest + Supertest automated tests
- Docker + Docker Compose
- GitHub Actions CI

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for the system diagram and component responsibilities.

## Local setup

1. Copy `.env.example` to `.env`.
2. Start infrastructure:

```bash
docker compose up -d postgres redis
```

3. Install dependencies and generate Prisma client:

```bash
npm install
npx prisma generate
```

4. Apply migrations:

```bash
npx prisma migrate dev --name init
```

5. Start the API:

```bash
npm run dev
```

6. Start the market worker in another terminal:

```bash
npm run dev:worker
```

The API runs at `http://localhost:4000`.

- REST docs: `http://localhost:4000/docs`
- Health: `http://localhost:4000/health`
- Metrics: `http://localhost:4000/metrics`
- WebSocket: `ws://localhost:4000/ws`

## WebSocket example

Connect to `/ws`, then send:

```json
{"type":"subscribe","symbols":["BTCUSDT","ETHUSDT"]}
```

The server responds with subscription confirmation and then streams validated market ticks published by Redis.

## Example REST requests

```bash
curl "http://localhost:4000/api/market/latest?symbols=BTCUSDT,ETHUSDT"
curl "http://localhost:4000/api/market/history?symbol=BTCUSDT&page=1&limit=25"
```

## Testing

```bash
npm test
npm run lint
npm run build
```

The tests cover request validation and HTTP behavior. As the project grows, database-backed integration tests can be expanded around authentication, market history and failure scenarios.

## Production direction

The application is containerized and can be deployed to a cloud VM or container service. For an AWS deployment, a sensible next step is to run the API and worker as containers, move PostgreSQL to RDS, use ElastiCache for Redis, and put the API behind a load balancer. Those services should only be added when there is a real operational requirement.
