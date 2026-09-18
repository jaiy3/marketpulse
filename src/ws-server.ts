import type { Server } from "http";
import WebSocket, { WebSocketServer } from "ws";
import { z } from "zod";
import { logger } from "./config/logger";
import { redisSubscriber } from "./config/redis";

const subscriptionSchema = z.object({
  type: z.literal("subscribe"),
  symbols: z.array(z.string().regex(/^[A-Z0-9]{5,20}$/)).min(1).max(20),
});

type Client = { socket: WebSocket; symbols: Set<string> };

export function attachMarketWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws", maxPayload: 16 * 1024 });
  const clients = new Set<Client>();

  void redisSubscriber.subscribe("market:ticks");
  redisSubscriber.on("message", (_channel, raw) => {
    const tick = JSON.parse(raw) as { symbol: string };
    for (const client of clients) {
      if (client.socket.readyState === WebSocket.OPEN && client.symbols.has(tick.symbol)) {
        client.socket.send(raw);
      }
    }
  });

  wss.on("connection", (socket, request) => {
    const client: Client = { socket, symbols: new Set() };
    clients.add(client);

    socket.send(JSON.stringify({ type: "connected", message: "Subscribe to symbols to receive live market ticks" }));

    socket.on("message", (raw) => {
      try {
        const message = subscriptionSchema.parse(JSON.parse(raw.toString()));
        client.symbols = new Set(message.symbols);
        socket.send(JSON.stringify({ type: "subscribed", symbols: [...client.symbols] }));
      } catch {
        socket.send(JSON.stringify({ type: "error", message: "Invalid subscription. Use {type:'subscribe', symbols:['BTCUSDT']}" }));
      }
    });

    socket.on("close", () => clients.delete(client));
    socket.on("error", (error) => logger.warn({ err: error }, "WebSocket client error"));

    logger.debug({ ip: request.socket.remoteAddress }, "WebSocket client connected");
  });

  const heartbeat = setInterval(() => {
    for (const client of clients) {
      if (client.socket.readyState === WebSocket.OPEN) client.socket.ping();
    }
  }, 30_000);

  wss.on("close", () => clearInterval(heartbeat));
  return wss;
}
