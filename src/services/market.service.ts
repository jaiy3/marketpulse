import { prisma } from "../config/prisma";
import { redis } from "../config/redis";
import type { MarketTick } from "../ingestion/binance";

export type { MarketTick };

const key = (symbol: string) => `market:latest:${symbol}`;

export async function getLatest(symbols: string[]) {
  if (symbols.length === 0) return [];
  const values = await redis.mget(...symbols.map(key));
  return values.flatMap((value, index) => {
    if (!value) return [];
    return [{ ...(JSON.parse(value) as MarketTick), symbol: symbols[index] }];
  });
}

export async function getHistory(symbol: string, page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [items, total] = await prisma.$transaction([
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
