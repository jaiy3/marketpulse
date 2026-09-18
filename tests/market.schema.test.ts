import { describe, expect, it } from "vitest";
import { historyQuerySchema, symbolsSchema } from "../src/schemas/market";

describe("market query validation", () => {
  it("normalizes and de-duplicates symbols", () => {
    expect(symbolsSchema.parse({ symbols: "btcusdt, ETHUSDT, btcusdt" })).toEqual({
      symbols: ["BTCUSDT", "ETHUSDT"],
    });
  });

  it("applies safe pagination defaults", () => {
    expect(historyQuerySchema.parse({ symbol: "BTCUSDT" })).toMatchObject({ page: 1, limit: 50 });
  });
});
