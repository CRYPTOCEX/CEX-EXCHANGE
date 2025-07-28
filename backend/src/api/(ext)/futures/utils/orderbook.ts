import { logError } from "@b/utils/logger";
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
    logError("update_order_book_state", error, __filename);
    console.error("Failed to update order book state:", error);
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
      console.error(`No updates for ${side}`);
      return;
    }
    for (const [price, updatedAmountStr] of Object.entries(updates[side])) {
      if (typeof updatedAmountStr === "undefined") {
        console.error(`Undefined amount for price ${price} in ${side}`);
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
        logError("apply_updates_to_order_book", e, __filename);
        console.error(
          `Error converting ${updatedAmountStr} to BigInt: ${e.message}`
        );
      }
    }
  });

  return updatedOrderBook;
}
