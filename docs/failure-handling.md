# Failure Handling Notes

| Failure | Current behavior |
|---|---|
| Binance disconnects | Worker logs the failure and reconnects with exponential backoff. |
| Malformed market event | Zod rejects the event and it is ignored rather than persisted. |
| Redis unavailable | API health reports degraded; cached market reads fail instead of returning fabricated data. |
| PostgreSQL unavailable | API health reports degraded; persistence jobs can retry through the queue. |
| Persistence job fails | BullMQ records the failed job and the worker logs the failure. |
| WebSocket disconnects | Client is removed from the connection set automatically. |
| Too many HTTP requests | Express rate limiting returns a 429 response. |
| Oversized WebSocket message | WebSocket server enforces a 16 KB max payload. |

This is intentionally a learning-scale system. A larger deployment would add multiple worker replicas, durable queue infrastructure, stronger connection backpressure, distributed WebSocket coordination and more detailed observability.
