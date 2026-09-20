"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderBookState = updateOrderBookState;
exports.applyUpdatesToOrderBook = applyUpdatesToOrderBook;
const console_1 = require("@b/utils/console");
async function updateOrderBookState(symbolOrderBook, bookUpdates) {
    const sides = ["asks", "bids"];
    try {
        await Promise.all(sides.map(async (side) => {
            for (const [price, amount] of Object.entries(bookUpdates[side])) {
                const bigAmount = BigInt(amount);
                if (!symbolOrderBook[side][price]) {
                    symbolOrderBook[side][price] =
                        bigAmount > BigInt(0) ? bigAmount : BigInt(0);
                }
                else {
                    symbolOrderBook[side][price] += bigAmount;
                    if (symbolOrderBook[side][price] <= BigInt(0)) {
                        delete symbolOrderBook[side][price];
                    }
                }
            }
        }));
    }
    catch (error) {
        console_1.logger.error("ORDERBOOK", "Failed to update order book state", error);
    }
}
function applyUpdatesToOrderBook(currentOrderBook, updates) {
    const updatedOrderBook = {
        bids: { ...currentOrderBook.bids },
        asks: { ...currentOrderBook.asks },
    };
    ["bids", "asks"].forEach((side) => {
        if (!updates[side]) {
            console_1.logger.warn("ORDERBOOK", `No updates for ${side}`);
            return;
        }
        for (const [price, updatedAmountStr] of Object.entries(updates[side])) {
            if (updatedAmountStr === undefined || updatedAmountStr === null) {
                continue;
            }
            try {
                const updatedAmount = BigInt(updatedAmountStr);
                if (updatedAmount > BigInt(0)) {
                    updatedOrderBook[side][price] = updatedAmount;
                }
                else {
                    delete updatedOrderBook[side][price];
                }
            }
            catch (e) {
                console_1.logger.error("ORDERBOOK", `Error converting ${updatedAmountStr} to BigInt`, e);
            }
        }
    });
    return updatedOrderBook;
}
