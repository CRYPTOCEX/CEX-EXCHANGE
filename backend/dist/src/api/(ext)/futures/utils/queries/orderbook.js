"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = query;
exports.getOrderbookEntry = getOrderbookEntry;
exports.getOrderBook = getOrderBook;
exports.fetchOrderBooks = fetchOrderBooks;
exports.updateOrderBookInDB = updateOrderBookInDB;
exports.fetchExistingAmounts = fetchExistingAmounts;
exports.updateSingleOrderBook = updateSingleOrderBook;
exports.generateOrderBookUpdateQueries = generateOrderBookUpdateQueries;
const error_1 = require("@b/utils/error");
let fromBigInt;
let removeTolerance;
let toBigIntFloat;
let client;
let scyllaFuturesKeyspace;
let OrderBookDatas;
try {
    const blockchainModule = require("@b/api/(ext)/ecosystem/utils/blockchain");
    fromBigInt = blockchainModule.fromBigInt;
    removeTolerance = blockchainModule.removeTolerance;
    toBigIntFloat = blockchainModule.toBigIntFloat;
    const clientModule = require("@b/api/(ext)/ecosystem/utils/scylla/client");
    client = clientModule.default;
    scyllaFuturesKeyspace = clientModule.scyllaFuturesKeyspace;
    const queriesModule = require("@b/api/(ext)/ecosystem/utils/scylla/queries");
    OrderBookDatas = queriesModule.OrderBookDatas;
}
catch (e) {
}
const console_1 = require("@b/utils/console");
async function query(q, params = []) {
    if (!client) {
        throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available" });
    }
    return client.execute(q, params, { prepare: true });
}
async function getOrderbookEntry(symbol, price, side) {
    if (!client || !scyllaFuturesKeyspace || !toBigIntFloat) {
        throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available" });
    }
    const query = `
    SELECT * FROM ${scyllaFuturesKeyspace}.orderbook
    WHERE symbol = ? AND price = ? AND side = ?;
  `;
    const params = [symbol, price, side];
    try {
        const result = await client.execute(query, params, { prepare: true });
        if (result.rows.length > 0) {
            const row = result.rows[0];
            return toBigIntFloat(row["amount"]);
        }
        else {
            console_1.logger.warn("ORDERBOOK", `Orderbook entry not found for params: ${JSON.stringify(params)}`);
            return null;
        }
    }
    catch (error) {
        console_1.logger.error("ORDERBOOK", "Failed to fetch futures orderbook entry", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to fetch futures orderbook entry: ${error.message}`,
        });
    }
}
async function getOrderBook(symbol) {
    if (!client || !scyllaFuturesKeyspace) {
        throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available" });
    }
    const askQuery = `
    SELECT * FROM ${scyllaFuturesKeyspace}.orderbook
    WHERE symbol = ? AND side = 'ASKS'
    LIMIT 50;
  `;
    const bidQuery = `
    SELECT * FROM ${scyllaFuturesKeyspace}.orderbook
    WHERE symbol = ? AND side = 'BIDS'
    ORDER BY price DESC
    LIMIT 50;
  `;
    const [askRows, bidRows] = await Promise.all([
        client.execute(askQuery, [symbol], { prepare: true }),
        client.execute(bidQuery, [symbol], { prepare: true }),
    ]);
    const asks = askRows.rows.map((row) => [row.price, row.amount]);
    const bids = bidRows.rows.map((row) => [row.price, row.amount]);
    return { asks, bids };
}
async function fetchOrderBooks() {
    if (!client || !scyllaFuturesKeyspace) {
        throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available" });
    }
    const query = `
    SELECT * FROM ${scyllaFuturesKeyspace}.orderbook;
  `;
    try {
        const result = await client.execute(query);
        return result.rows.map((row) => ({
            symbol: row.symbol,
            price: row.price,
            amount: row.amount,
            side: row.side,
        }));
    }
    catch (error) {
        console_1.logger.error("ORDERBOOK", "Failed to fetch futures order books", error);
        return null;
    }
}
async function updateOrderBookInDB(symbol, price, amount, side) {
    if (!client || !scyllaFuturesKeyspace) {
        throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available" });
    }
    let query;
    let params;
    if (amount > 0) {
        query = `
      INSERT INTO ${scyllaFuturesKeyspace}.orderbook (symbol, price, amount, side)
      VALUES (?, ?, ?, ?);
    `;
        params = [symbol, price, amount, side.toUpperCase()];
    }
    else {
        query = `
      DELETE FROM ${scyllaFuturesKeyspace}.orderbook
      WHERE symbol = ? AND price = ? AND side = ?;
    `;
        params = [symbol, price, side.toUpperCase()];
    }
    try {
        await client.execute(query, params, { prepare: true });
    }
    catch (error) {
        console_1.logger.error("ORDERBOOK", "Failed to update futures order book", error);
    }
}
async function fetchExistingAmounts(symbol) {
    if (!client || !scyllaFuturesKeyspace || !removeTolerance || !toBigIntFloat) {
        throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available" });
    }
    try {
        const result = await client.execute(`SELECT price, side, amount FROM ${scyllaFuturesKeyspace}.orderbook_by_symbol WHERE symbol = ?;`, [symbol]);
        const symbolOrderBook = { bids: {}, asks: {} };
        result.rows.forEach((row) => {
            const side = row.side === "BIDS" ? "bids" : "asks";
            const priceStr = removeTolerance(toBigIntFloat(row.price)).toString();
            symbolOrderBook[side][priceStr] = removeTolerance(toBigIntFloat(row.amount));
        });
        return symbolOrderBook;
    }
    catch (error) {
        console_1.logger.error("FUTURES", `Failed to fetch existing amounts for ${symbol}`, error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to fetch existing amounts for ${symbol}`,
        });
    }
}
async function updateSingleOrderBook(order, operation) {
    if (!client || !scyllaFuturesKeyspace || !removeTolerance || !toBigIntFloat || !fromBigInt) {
        throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available" });
    }
    try {
        const result = await client.execute(`SELECT price, side, amount FROM ${scyllaFuturesKeyspace}.orderbook_by_symbol WHERE symbol = ?;`, [order.symbol]);
        const symbolOrderBook = { bids: {}, asks: {} };
        result.rows.forEach((row) => {
            const side = row.side === "BIDS" ? "bids" : "asks";
            symbolOrderBook[side][removeTolerance(toBigIntFloat(row.price)).toString()] = removeTolerance(toBigIntFloat(row.amount));
        });
        const side = order.side === "BUY" ? "bids" : "asks";
        const price = removeTolerance(BigInt(order.price));
        const existingAmount = symbolOrderBook[side][price.toString()] || BigInt(0);
        let newAmount = BigInt(0);
        if (operation === "add") {
            newAmount = existingAmount + removeTolerance(BigInt(order.amount));
        }
        else if (operation === "subtract") {
            newAmount = existingAmount - removeTolerance(BigInt(order.amount));
        }
        if (newAmount > BigInt(0)) {
            await client.execute(`INSERT INTO ${scyllaFuturesKeyspace}.orderbook (symbol, price, side, amount) VALUES (?, ?, ?, ?)`, [
                order.symbol,
                fromBigInt(price),
                order.side === "BUY" ? "BIDS" : "ASKS",
                fromBigInt(newAmount),
            ]);
            symbolOrderBook[side][price.toString()] = newAmount;
        }
        else {
            await client.execute(`DELETE FROM ${scyllaFuturesKeyspace}.orderbook WHERE symbol = ? AND price = ? AND side = ?`, [
                order.symbol,
                fromBigInt(price),
                order.side === "BUY" ? "BIDS" : "ASKS",
            ]);
            delete symbolOrderBook[side][price.toString()];
        }
        return symbolOrderBook;
    }
    catch (err) {
        console_1.logger.error("FUTURES", "Failed to update order book in database", err);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to update order book in database",
        });
    }
}
function generateOrderBookUpdateQueries(mappedOrderBook) {
    if (!scyllaFuturesKeyspace || !fromBigInt || !removeTolerance) {
        throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available" });
    }
    const queries = [];
    for (const [symbol, sides] of Object.entries(mappedOrderBook)) {
        for (const [side, priceAmountMap] of Object.entries(sides)) {
            if (Object.keys(priceAmountMap).length === 0) {
                queries.push({
                    query: `DELETE FROM ${scyllaFuturesKeyspace}.orderbook WHERE symbol = ? AND side = ?`,
                    params: [symbol, side.toUpperCase()],
                });
                continue;
            }
            for (const [price, amount] of Object.entries(priceAmountMap)) {
                if (amount > BigInt(0)) {
                    queries.push({
                        query: `UPDATE ${scyllaFuturesKeyspace}.orderbook SET amount = ? WHERE symbol = ? AND price = ? AND side = ?`,
                        params: [
                            fromBigInt(removeTolerance(BigInt(amount))),
                            symbol,
                            fromBigInt(removeTolerance(BigInt(price))),
                            side.toUpperCase(),
                        ],
                    });
                }
                else {
                    queries.push({
                        query: `DELETE FROM ${scyllaFuturesKeyspace}.orderbook WHERE symbol = ? AND price = ? AND side = ?`,
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
