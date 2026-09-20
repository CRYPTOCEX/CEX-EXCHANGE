"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderBookState = updateOrderBookState;
exports.applyUpdatesToOrderBook = applyUpdatesToOrderBook;
exports.fetchExistingAmounts = fetchExistingAmounts;
exports.updateSingleOrderBook = updateSingleOrderBook;
exports.generateOrderBookUpdateQueries = generateOrderBookUpdateQueries;
const blockchain_1 = require("./blockchain");
const client_1 = __importDefault(require("./scylla/client"));
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
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
async function fetchExistingAmounts(symbol) {
    try {
        const result = await client_1.default.execute("SELECT price, side, amount FROM orderbook_by_symbol WHERE symbol = ?;", [symbol]);
        const symbolOrderBook = { bids: {}, asks: {} };
        result.rows.forEach((row) => {
            const side = row.side === "BIDS" ? "bids" : "asks";
            const priceStr = (0, blockchain_1.removeTolerance)((0, blockchain_1.toBigIntFloat)(row.price)).toString();
            symbolOrderBook[side][priceStr] = (0, blockchain_1.removeTolerance)((0, blockchain_1.toBigIntFloat)(row.amount));
        });
        return symbolOrderBook;
    }
    catch (error) {
        console_1.logger.error("ORDERBOOK", `Failed to fetch existing amounts for ${symbol}`, error);
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to fetch existing amounts for ${symbol}` });
    }
}
async function updateSingleOrderBook(order, operation) {
    try {
        const result = await client_1.default.execute("SELECT price, side, amount FROM orderbook_by_symbol WHERE symbol = ?;", [order.symbol]);
        const symbolOrderBook = { bids: {}, asks: {} };
        result.rows.forEach((row) => {
            const side = row.side === "BIDS" ? "bids" : "asks";
            symbolOrderBook[side][(0, blockchain_1.removeTolerance)((0, blockchain_1.toBigIntFloat)(row.price)).toString()] = (0, blockchain_1.removeTolerance)((0, blockchain_1.toBigIntFloat)(row.amount));
        });
        const side = order.side === "BUY" ? "bids" : "asks";
        const price = (0, blockchain_1.removeTolerance)(BigInt(order.price));
        const existingAmount = symbolOrderBook[side][price.toString()] || BigInt(0);
        let newAmount = BigInt(0);
        if (operation === "add") {
            newAmount = existingAmount + (0, blockchain_1.removeTolerance)(BigInt(order.amount));
        }
        else if (operation === "subtract") {
            newAmount = existingAmount - (0, blockchain_1.removeTolerance)(BigInt(order.amount));
        }
        if (newAmount > BigInt(0)) {
            await client_1.default.execute("INSERT INTO orderbook (symbol, price, side, amount) VALUES (?, ?, ?, ?)", [
                order.symbol,
                (0, blockchain_1.fromBigInt)(price),
                order.side === "BUY" ? "BIDS" : "ASKS",
                (0, blockchain_1.fromBigInt)(newAmount),
            ]);
            symbolOrderBook[side][price.toString()] = newAmount;
        }
        else {
            await client_1.default.execute("DELETE FROM orderbook WHERE symbol = ? AND price = ? AND side = ?", [
                order.symbol,
                (0, blockchain_1.fromBigInt)(price),
                order.side === "BUY" ? "BIDS" : "ASKS",
            ]);
            delete symbolOrderBook[side][price.toString()];
        }
        return symbolOrderBook;
    }
    catch (err) {
        console_1.logger.error("ORDERBOOK", "Failed to update order book in database", err);
        throw (0, error_1.createError)({ statusCode: 500, message: "Failed to update order book in database" });
    }
}
function generateOrderBookUpdateQueries(mappedOrderBook) {
    const queries = [];
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
                            (0, blockchain_1.fromBigInt)((0, blockchain_1.removeTolerance)(BigInt(amount))),
                            symbol,
                            (0, blockchain_1.fromBigInt)((0, blockchain_1.removeTolerance)(BigInt(price))),
                            side.toUpperCase(),
                        ],
                    });
                }
                else {
                    queries.push({
                        query: `DELETE FROM orderbook WHERE symbol = ? AND price = ? AND side = ?`,
                        params: [
                            symbol,
                            (0, blockchain_1.fromBigInt)((0, blockchain_1.removeTolerance)(BigInt(price))),
                            side.toUpperCase(),
                        ],
                    });
                }
            }
        }
    }
    return queries;
}
