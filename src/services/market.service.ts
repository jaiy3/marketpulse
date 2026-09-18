import { prisma } from "../config/prisma";
import { redis } from "../config/redis";

export type MarketTick = {
  symbol: string;
  price: string;
  quantity: string;
  eventTime: number;
  source: "binance";
};

const key = (symbol: string) => `market:latest:${symbol}`;

export async function getLatest(symbols: string[]) {
  const values = await Promise.all(symbols.map((symbol) => redis.get(key(symbol))));
  return values.flatMap((value, index) => {
    if (!value) return [];
    return [{ ...JSON.parse(value) as MarketTick, symbol: symbols[index] }];
  });
}

export async function getHistory(symbol: string, page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.priceTick.findMany({
      where: { symbol },
      orderBy: { eventTime: "desc" },
      skip,
      take: limit,
    }),
    prisma.priceTick.count({ where: { symbol } }),
  ]);

  return {
    items: items.map((item) => ({
      id: item.id.toString(),
      symbol: item.symbol,
      price: item.price.toString(),
      quantity: item.quantity?.toString() ?? null,
      eventTime: item.eventTime.toISOString(),
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}
