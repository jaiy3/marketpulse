# Failure Handling

| Failure | Behaviour |
|---|---|
| Binance disconnects | Reconnects with exponential backoff, 1s doubling to a 30s cap; resets on success. |
| Malformed or unexpected message | Rejected by Zod (`parseBinanceTrade` returns null) and logged; never stored. |
| Stream stalls | Latest prices expire after 30s, so clients see no price instead of a stale one. |
| Duplicate or replayed trades | Same `symbol-second` job ID; BullMQ drops the duplicate. |
| PostgreSQL write fails | Job retries 5 times with exponential backoff, then is kept in the failed set (24h) and logged. |
| Fresh database | `start:prod` runs `prisma migrate deploy` before the server starts. |
| Redis or PostgreSQL down | `/health` returns 503 with per-dependency status; reads fail with a 500 rather than returning invented data. |
| Slow WebSocket client | Messages skipped while more than 1 MB is buffered for that client. |
| Dead WebSocket client | Terminated after a missed ping/pong heartbeat (30s). |
| Abusive HTTP traffic | Rate limited: 120 req/min on `/api`, 20 per 15 min on auth. |
| Oversized WebSocket message | Rejected by a 16 KB max payload. |
| Shutdown (SIGTERM) | Closes the stream, drains the queue worker, then disconnects Redis and PostgreSQL. |

## Known limits

- One ingestion process: if it dies, the platform restarts it, but there is a short gap in history. Leader election between replicas would remove this.
- History is one row per symbol per second, not every trade.
- No per-user quotas beyond IP rate limiting.
