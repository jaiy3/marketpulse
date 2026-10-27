import type { Server } from "http";
import WebSocket, { WebSocketServer } from "ws";
import { z } from "zod";
import { logger } from "./config/logger";
import { redisSubscriber } from "./config/redis";
import { websocketClients } from "./metrics";
import { getLatest } from "./services/market.service";

export const subscriptionSchema = z.object({
  type: z.literal("subscribe"),
  symbols: z
    .array(z.string().transform((s) => s.trim().toUpperCase()).pipe(z.string().regex(/^[A-Z0-9]{5,20}$/)))
    .min(1)
    .max(20),
});

type Client = { socket: WebSocket; symbols: Set<string>; alive: boolean };

/**
 * WebSocket hub. Every API instance subscribes to the same Redis channel, so
 * ticks reach clients no matter which instance they are connected to.
 */
export function attachMarketWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws", maxPayload: 16 * 1024 });
  const clients = new Set<Client>();

  void redisSubscriber.subscribe("market:ticks");
  redisSubscriber.on("message", (_channel, raw) => {
    let symbol: string;
    try {
      symbol = (JSON.parse(raw) as { symbol: string }).symbol;
    } catch {
      return;
    }

    for (const client of clients) {
      // Skip clients whose send buffer is backing up rather than letting memory grow unbounded.
      if (
        client.socket.readyState === WebSocket.OPEN &&
        client.symbols.has(symbol) &&
        client.socket.bufferedAmount < 1024 * 1024
      ) {
        client.socket.send(raw);
      }
    }
  });

  wss.on("connection", (socket, request) => {
    const client: Client = { socket, symbols: new Set(), alive: true };
    clients.add(client);
    websocketClients.set(clients.size);

    socket.send(JSON.stringify({ type: "connected", message: "Subscribe to symbols to receive live market ticks" }));

    socket.on("pong", () => {
      client.alive = true;
    });

    socket.on("message", async (raw) => {
      try {
        const message = subscriptionSchema.parse(JSON.parse(raw.toString()));
        client.symbols = new Set(message.symbols);
        // Send the current snapshot straight away so the client does not wait for the next trade.
        const snapshot = await getLatest([...client.symbols]);
        socket.send(JSON.stringify({ type: "subscribed", symbols: [...client.symbols], snapshot }));
      } catch {
        socket.send(
          JSON.stringify({ type: "error", message: "Invalid subscription. Use {\"type\":\"subscribe\",\"symbols\":[\"BTCUSDT\"]}" })
        );
      }
    });

    socket.on("close", () => {
      clients.delete(client);
      websocketClients.set(clients.size);
    });
    socket.on("error", (error) => logger.warn({ err: error }, "WebSocket client error"));

    logger.debug({ ip: request.socket.remoteAddress }, "WebSocket client connected");
  });

  // Terminate connections that stop answering pings (e.g. a phone that lost signal).
  const heartbeat = setInterval(() => {
    for (const client of clients) {
      if (!client.alive) {
        client.socket.terminate();
        continue;
      }
      client.alive = false;
      if (client.socket.readyState === WebSocket.OPEN) client.socket.ping();
    }
  }, 30_000);

  wss.on("close", () => clearInterval(heartbeat));
  return wss;
}
