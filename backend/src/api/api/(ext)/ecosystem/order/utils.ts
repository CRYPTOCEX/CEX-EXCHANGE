import { baseStringSchema, baseNumberSchema } from "@b/utils/schema";

export const baseOrderSchema = {
  id: baseStringSchema("Order ID"),
  symbol: baseStringSchema("Trading symbol"),
  type: baseStringSchema("Order type"),
  side: baseStringSchema("Order side (buy/sell)"),
  amount: baseStringSchema("Order amount, converted from bigint"),
  price: baseStringSchema("Order price, converted from bigint"),
  cost: baseStringSchema("Total cost, converted from bigint"),
  fee: baseStringSchema("Order fee, converted from bigint"),
  filled: baseStringSchema("Filled amount, converted from bigint"),
  remaining: baseStringSchema("Remaining amount, converted from bigint"),
  status: baseStringSchema("Order status"),
};

export const baseTickerSchema = {
  symbol: baseStringSchema("Trading symbol"),
  price: baseStringSchema("Latest trading price"),
};

export const baseHistoricalDataSchema = {
  openTime: baseNumberSchema("Open time of the candle"),
  closeTime: baseNumberSchema("Close time of the candle"),
  open: baseStringSchema("Opening price"),
  high: baseStringSchema("Highest price"),
  low: baseStringSchema("Lowest price"),
  close: baseStringSchema("Closing price"),
  volume: baseStringSchema("Volume"),
};
