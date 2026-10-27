import Redis, { type RedisOptions } from "ioredis";
import { env } from "./env";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: true,
});

export const redisSubscriber = redis.duplicate();

/**
 * Plain connection options for BullMQ. Passing options (rather than an ioredis
 * instance) avoids type clashes if BullMQ resolves a different ioredis version,
 * and lets BullMQ manage its own connections. Supports redis:// and rediss:// (TLS).
 */
export function bullConnectionOptions(): RedisOptions {
  const url = new URL(env.REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : undefined,
    tls: url.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}
