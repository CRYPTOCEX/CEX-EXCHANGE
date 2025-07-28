import type { Order } from "./scylla/queries";

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

export function getLatestOrdersForCandles(orders: Order[]): Order[] {
  const latestOrdersMap: Record<string, Order> = {};

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
