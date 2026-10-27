import { describe, expect, it } from "vitest";
import { subscriptionSchema } from "../src/ws-server";

describe("WebSocket subscription schema", () => {
  it("normalises symbols to upper case", () => {
    const parsed = subscriptionSchema.parse({ type: "subscribe", symbols: [" btcusdt ", "ETHUSDT"] });
    expect(parsed.symbols).toEqual(["BTCUSDT", "ETHUSDT"]);
  });

  it("rejects more than 20 symbols", () => {
    const symbols = Array.from({ length: 21 }, (_, i) => `SYM${i}USDT`);
    expect(() => subscriptionSchema.parse({ type: "subscribe", symbols })).toThrow();
  });

  it("rejects unknown message types", () => {
    expect(() => subscriptionSchema.parse({ type: "unsubscribe", symbols: ["BTCUSDT"] })).toThrow();
  });
});
