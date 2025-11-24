import { FuturesOrder } from "./queries/order";

export const intervals = [
  "1m",
  "3m",
  "5m",
  "15m",
  "30m",
  "1h",
  "2h",
  "4h",
  "6h",
  "12h",
  "1d",
  "3d",
  "1w",
];

export function getLatestOrdersForCandles(
  orders: FuturesOrder[]
): FuturesOrder[] {
  const latestOrdersMap: Record<string, FuturesOrder> = {};

  orders.forEach((order) => {
    if (
      !latestOrdersMap[order.symbol] ||
      latestOrdersMap[order.symbol].updatedAt < order.updatedAt
    ) {
      latestOrdersMap[order.symbol] = order;
    }
  });

  return Object.values(latestOrdersMap);
}
