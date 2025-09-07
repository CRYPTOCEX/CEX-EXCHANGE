import { startOfMinute, startOfHour, startOfDay, startOfWeek } from "date-fns";
import { RedisSingleton } from "../../../../utils/redis";
import { messageBroker } from "@b/handler/Websocket";
import { fromBigInt, fromWei } from "./blockchain";

const redis = RedisSingleton.getInstance();
const setAsync = (key: string, value: string) => redis.set(key, value);
const getAsync = (key: string) => redis.get(key);
const delAsync = (key: string) => redis.del(key);
const keysAsync = (pattern: string) => redis.keys(pattern);

export async function handleOrderBookBroadcast(symbol, book) {
  try {
    if (!book) {
      console.error("Book is undefined");
      return;
    }

    const threshold = 1e-10;

    const orderbook = {
      asks: Object.entries(book.asks || {})
        .map(([price, amount]) => [
          fromWei(Number(price)),
          fromWei(Number(amount)),
        ])
        .filter(([price, amount]) => price > threshold && amount > threshold),
      bids: Object.entries(book.bids || {})
        .map(([price, amount]) => [
          fromWei(Number(price)),
          fromWei(Number(amount)),
        ])
        .filter(([price, amount]) => price > threshold && amount > threshold),
    };

    messageBroker.broadcastToSubscribedClients(
      `/api/ecosystem/market`,
      { type: "orderbook", symbol },
      {
        stream: "orderbook",
        data: orderbook,
      }
    );
  } catch (error) {
    console.error(`Failed to fetch and broadcast order book: ${error}`);
  }
}

export async function handleOrderBroadcast(order) {
  const filteredOrder = {
    ...order,
    price: fromBigInt(order.price),
    amount: fromBigInt(order.amount),
    filled: fromBigInt(order.filled),
    remaining: fromBigInt(order.remaining),
    cost: fromBigInt(order.cost),
    fee: fromBigInt(order.fee),
    average: fromBigInt(order.average),
  };

  messageBroker.broadcastToSubscribedClients(
    `/api/ecosystem/order`,
    { type: "orders", userId: order.userId },
    {
      stream: "orders",
      data: [filteredOrder],
    }
  );
}

export async function handleTradesBroadcast(symbol: string, trades: any) {
  messageBroker.broadcastToSubscribedClients(
    `/api/ecosystem/market`,
    { type: "trades", symbol },
    {
      stream: "trades",
      data: trades,
    }
  );
}

export async function handleTickerBroadcast(symbol: string, ticker: any) {
  messageBroker.broadcastToSubscribedClients(
    `/api/ecosystem/market`,
    { type: "ticker", symbol },
    {
      stream: "ticker",
      data: ticker,
    }
  );
}

export async function handleCandleBroadcast(
  symbol: string,
  interval: string,
  candle: any
) {
  const parsedCandle = [
    candle.createdAt.getTime(),
    candle.open,
    candle.high,
    candle.low,
    candle.close,
    candle.volume,
  ];
  messageBroker.broadcastToSubscribedClients(
    `/api/ecosystem/market`,
    { type: "ohlcv", symbol, interval },
    {
      stream: "ohlcv",
      data: [parsedCandle],
    }
  );
}

export async function handleTickersBroadcast(tickers) {
  messageBroker.broadcastToSubscribedClients(
    `/api/ecosystem/ticker`,
    { type: "tickers" },
    {
      stream: "tickers",
      data: tickers,
    }
  );
}

export function intervalToMs(interval: string): number {
  const units = {
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };

  const unit = interval.slice(-1);
  const value = parseInt(interval.slice(0, -1), 10);

  return units[unit] * value;
}

export function normalizeTimeToInterval(
  timestamp: number,
  interval: string
): number {
  const date = new Date(timestamp);

  switch (interval.slice(-1)) {
    case "m":
      return startOfMinute(date).getTime();
    case "h":
      return startOfHour(date).getTime();
    case "d":
      return startOfDay(date).getTime();
    case "w":
      return startOfWeek(date, { weekStartsOn: 1 }).getTime(); // Configures Monday as the start of the week
    default:
      throw new Error(`Invalid interval: ${interval}`);
  }
}

export async function offloadToRedis<T>(key: string, value: T): Promise<void> {
  const serializedValue = JSON.stringify(value);
  await setAsync(key, serializedValue);
}

export async function loadKeysFromRedis(pattern: string): Promise<string[]> {
  try {
    const keys = await keysAsync(pattern);
    return keys;
  } catch (error) {
    console.error("Failed to fetch keys:", error);
    return [];
  }
}

export async function loadFromRedis(identifier: string): Promise<any | null> {
  const dataStr = await getAsync(identifier);
  if (!dataStr) return null;
  try {
    return JSON.parse(dataStr);
  } catch (error) {
    console.error("Failed to parse JSON:", error);
  }
}

export async function removeFromRedis(key: string): Promise<void> {
  try {
    await delAsync(key);
  } catch (error) {
    console.error("Failed to delete key:", error);
  }
}

export async function convertToOrderArray(
  rawData: string[]
): Promise<[number, number][]> {
  const parsedData: [number, number][] = [];
  for (let i = 0; i < rawData.length; i += 2) {
    parsedData.push([parseFloat(rawData[i]), parseFloat(rawData[i + 1])]);
  }
  return parsedData;
}
