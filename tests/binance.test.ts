import { describe, expect, it } from "vitest";
import { nextReconnectDelay, parseBinanceTrade, persistenceJobId } from "../src/ingestion/binance";

const trade = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    stream: "btcusdt@trade",
    data: { e: "trade", s: "BTCUSDT", p: "67250.12000000", q: "0.00150000", T: 1761235200123, ...overrides },
  });

describe("parseBinanceTrade", () => {
  it("maps a valid trade to an internal tick", () => {
    expect(parseBinanceTrade(trade())).toEqual({
      symbol: "BTCUSDT",
      price: "67250.12000000",
      quantity: "0.00150000",
      eventTime: 1761235200123,
      source: "binance",
    });
  });

  it.each([
    ["invalid JSON", "{not json"],
    ["a non-trade event", trade({ e: "aggTrade" })],
    ["a non-numeric price", trade({ p: "NaN" })],
    ["a negative price", trade({ p: "-1" })],
    ["a lowercase symbol", trade({ s: "btcusdt" })],
    ["a missing timestamp", trade({ T: undefined })],
  ])("rejects %s", (_label, raw) => {
    expect(parseBinanceTrade(raw)).toBeNull();
  });
});

describe("persistenceJobId", () => {
  it("is identical for trades in the same second, so duplicates are dropped", () => {
    expect(persistenceJobId({ symbol: "BTCUSDT", eventTime: 1761235200001 })).toBe(
      persistenceJobId({ symbol: "BTCUSDT", eventTime: 1761235200999 })
    );
  });

  it("differs across seconds and symbols", () => {
    const base = persistenceJobId({ symbol: "BTCUSDT", eventTime: 1761235200000 });
    expect(persistenceJobId({ symbol: "BTCUSDT", eventTime: 1761235201000 })).not.toBe(base);
    expect(persistenceJobId({ symbol: "ETHUSDT", eventTime: 1761235200000 })).not.toBe(base);
  });
});

describe("nextReconnectDelay", () => {
  it("doubles and caps at 30 seconds", () => {
    expect(nextReconnectDelay(1_000)).toBe(2_000);
    expect(nextReconnectDelay(16_000)).toBe(30_000);
    expect(nextReconnectDelay(30_000)).toBe(30_000);
  });
});
