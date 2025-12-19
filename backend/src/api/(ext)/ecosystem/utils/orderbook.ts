import { fromBigInt, removeTolerance, toBigIntFloat } from "./blockchain";
import client from "./scylla/client";
import type { Order } from "./scylla/queries";
import { logger } from "@b/utils/console";

type OrderBookSide = "bids" | "asks";

export async function updateOrderBookState(
  symbolOrderBook: Record<OrderBookSide, Record<string, bigint>>,
  bookUpdates: Record<OrderBookSide, Record<string, bigint>>
) {
  const sides: OrderBookSide[] = ["asks", "bids"];

  try {
    await Promise.all(
      sides.map(async (side) => {
        for (const [price, amount] of Object.entries(bookUpdates[side])) {
          const bigAmount = BigInt(amount);

          if (!symbolOrderBook[side][price]) {
            symbolOrderBook[side][price] =
              bigAmount > BigInt(0) ? bigAmount : BigInt(0);
          } else {
            symbolOrderBook[side][price] += bigAmount;
            if (symbolOrderBook[side][price] <= BigInt(0)) {
              delete symbolOrderBook[side][price];
            }
          }
        }
      })
    );
  } catch (error) {
    logger.error("ORDERBOOK", "Failed to update order book state", error);
  }
}

export function applyUpdatesToOrderBook(
  currentOrderBook: Record<"bids" | "asks", Record<string, bigint>>,
  updates: Record<"bids" | "asks", Record<string, bigint>>
): Record<"bids" | "asks", Record<string, bigint>> {
  const updatedOrderBook: Record<"bids" | "asks", Record<string, bigint>> = {
    bids: { ...currentOrderBook.bids },
    asks: { ...currentOrderBook.asks },
  };

  ["bids", "asks"].forEach((side) => {
    if (!updates[side]) {
      logger.warn("ORDERBOOK", `No updates for ${side}`);
      return;
    }
    for (const [price, updatedAmountStr] of Object.entries(updates[side])) {
      if (updatedAmountStr === undefined || updatedAmountStr === null) {
        // Skip undefined entries - they shouldn't be in the updates
        // This can happen when orderbook sync is out of sync with orders
        continue;
      }
      try {
        const updatedAmount = BigInt(updatedAmountStr as string);
        if (updatedAmount > BigInt(0)) {
          updatedOrderBook[side][price] = updatedAmount;
        } else {
          delete updatedOrderBook[side][price];
        }
      } catch (e) {
        logger.error("ORDERBOOK", `Error converting ${updatedAmountStr} to BigInt`, e);
      }
    }
  });

  return updatedOrderBook;
}

export async function fetchExistingAmounts(
  symbol: string
): Promise<Record<OrderBookSide, Record<string, bigint>>> {
  try {
    const result = await client.execute(
      "SELECT price, side, amount FROM orderbook_by_symbol WHERE symbol = ?;",
      [symbol]
    );
    const symbolOrderBook = { bids: {}, asks: {} };

    result.rows.forEach((row) => {
      const side: OrderBookSide = row.side === "BIDS" ? "bids" : "asks";
      const priceStr = removeTolerance(toBigIntFloat(row.price)).toString();
      symbolOrderBook[side][priceStr] = removeTolerance(
        toBigIntFloat(row.amount)
      );
    });

    return symbolOrderBook;
  } catch (error) {
    logger.error("ORDERBOOK", `Failed to fetch existing amounts for ${symbol}`, error);
    throw new Error(`Failed to fetch existing amounts for ${symbol}`);
  }
}

export async function updateSingleOrderBook(
  order: Order,
  operation: "add" | "subtract"
) {
  try {
    const result = await client.execute(
      "SELECT price, side, amount FROM orderbook_by_symbol WHERE symbol = ?;",
      [order.symbol]
    );

    const symbolOrderBook = { bids: {}, asks: {} };
    result.rows.forEach((row) => {
      const side = row.side === "BIDS" ? "bids" : "asks";
      symbolOrderBook[side][
        removeTolerance(toBigIntFloat(row.price)).toString()
      ] = removeTolerance(toBigIntFloat(row.amount));
    });

    const side = order.side === "BUY" ? "bids" : "asks";
    const price = removeTolerance(BigInt(order.price));

    const existingAmount: bigint =
      symbolOrderBook[side][price.toString()] || BigInt(0);
    let newAmount: bigint = BigInt(0);
    if (operation === "add") {
      newAmount = existingAmount + removeTolerance(BigInt(order.amount));
    } else if (operation === "subtract") {
      newAmount = existingAmount - removeTolerance(BigInt(order.amount));
    }

    if (newAmount > BigInt(0)) {
      await client.execute(
        "INSERT INTO orderbook (symbol, price, side, amount) VALUES (?, ?, ?, ?)",
        [
          order.symbol,
          fromBigInt(price),
          order.side === "BUY" ? "BIDS" : "ASKS",
          fromBigInt(newAmount),
        ]
      );
      symbolOrderBook[side][price.toString()] = newAmount;
    } else {
      await client.execute(
        "DELETE FROM orderbook WHERE symbol = ? AND price = ? AND side = ?",
        [
          order.symbol,
          fromBigInt(price),
          order.side === "BUY" ? "BIDS" : "ASKS",
        ]
      );
      delete symbolOrderBook[side][price.toString()];
    }
    return symbolOrderBook;
  } catch (err) {
    logger.error("ORDERBOOK", "Failed to update order book in database", err);
    throw new Error("Failed to update order book in database");
  }
}

export function generateOrderBookUpdateQueries(
  mappedOrderBook: Record<
    string,
    Record<"bids" | "asks", Record<string, number>>
  >
): Array<{ query: string; params: any[] }> {
  const queries: Array<{ query: string; params: any[] }> = [];

  for (const [symbol, sides] of Object.entries(mappedOrderBook)) {
    for (const [side, priceAmountMap] of Object.entries(sides)) {
      if (Object.keys(priceAmountMap).length === 0) {
        queries.push({
          query: `DELETE FROM orderbook WHERE symbol = ? AND side = ?`,
          params: [symbol, side.toUpperCase()],
        });
        continue;
      }
      for (const [price, amount] of Object.entries(priceAmountMap)) {
        if (amount > BigInt(0)) {
          queries.push({
            query: `UPDATE orderbook SET amount = ? WHERE symbol = ? AND price = ? AND side = ?`,
            params: [
              fromBigInt(removeTolerance(BigInt(amount))),
              symbol,
              fromBigInt(removeTolerance(BigInt(price))),
              side.toUpperCase(),
            ],
          });
        } else {
          queries.push({
            query: `DELETE FROM orderbook WHERE symbol = ? AND price = ? AND side = ?`,
            params: [
              symbol,
              fromBigInt(removeTolerance(BigInt(price))),
              side.toUpperCase(),
            ],
          });
        }
      }
    }
  }
  return queries;
}
