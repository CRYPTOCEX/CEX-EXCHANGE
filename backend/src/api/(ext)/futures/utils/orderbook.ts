import { logger } from "@b/utils/console";
import { OrderBookSide } from "./queries/orderbook";

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
