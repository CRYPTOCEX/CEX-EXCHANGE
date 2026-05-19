"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleOrderBookBroadcast = handleOrderBookBroadcast;
exports.handleOrderBroadcast = handleOrderBroadcast;
exports.handleTradesBroadcast = handleTradesBroadcast;
exports.handleTickerBroadcast = handleTickerBroadcast;
exports.handleCandleBroadcast = handleCandleBroadcast;
exports.handleTickersBroadcast = handleTickersBroadcast;
exports.intervalToMs = intervalToMs;
exports.normalizeTimeToInterval = normalizeTimeToInterval;
exports.offloadToRedis = offloadToRedis;
exports.loadKeysFromRedis = loadKeysFromRedis;
exports.loadFromRedis = loadFromRedis;
exports.removeFromRedis = removeFromRedis;
exports.convertToOrderArray = convertToOrderArray;
const date_fns_1 = require("date-fns");
const redis_1 = require("../../../../utils/redis");
const Websocket_1 = require("@b/handler/Websocket");
const blockchain_1 = require("./blockchain");
const error_1 = require("@b/utils/error");
const redis = redis_1.RedisSingleton.getInstance();
const setAsync = (key, value) => redis.set(key, value);
const getAsync = (key) => redis.get(key);
const delAsync = (key) => redis.del(key);
const keysAsync = (pattern) => redis.keys(pattern);
async function handleOrderBookBroadcast(symbol, book) {
    try {
        if (!book) {
            console.error("Book is undefined");
            return;
        }
        const threshold = 1e-10;
        const orderbook = {
            asks: Object.entries(book.asks || {})
                .map(([price, amount]) => [
                (0, blockchain_1.fromWei)(Number(price)),
                (0, blockchain_1.fromWei)(Number(amount)),
            ])
                .filter(([price, amount]) => price > threshold && amount > threshold),
            bids: Object.entries(book.bids || {})
                .map(([price, amount]) => [
                (0, blockchain_1.fromWei)(Number(price)),
                (0, blockchain_1.fromWei)(Number(amount)),
            ])
                .filter(([price, amount]) => price > threshold && amount > threshold),
        };
        Websocket_1.messageBroker.broadcastToSubscribedClients(`/api/ecosystem/market`, { type: "orderbook", symbol }, {
            stream: "orderbook",
            data: orderbook,
        });
    }
    catch (error) {
        console.error(`Failed to fetch and broadcast order book: ${error}`);
    }
}
async function handleOrderBroadcast(order) {
    const filteredOrder = {
        ...order,
        price: (0, blockchain_1.fromBigInt)(order.price),
        amount: (0, blockchain_1.fromBigInt)(order.amount),
        filled: (0, blockchain_1.fromBigInt)(order.filled),
        remaining: (0, blockchain_1.fromBigInt)(order.remaining),
        cost: (0, blockchain_1.fromBigInt)(order.cost),
        fee: (0, blockchain_1.fromBigInt)(order.fee),
        average: (0, blockchain_1.fromBigInt)(order.average),
    };
    Websocket_1.messageBroker.broadcastToSubscribedClients(`/api/ecosystem/order`, { type: "orders", userId: order.userId }, {
        stream: "orders",
        data: [filteredOrder],
    });
}
async function handleTradesBroadcast(symbol, trades) {
    Websocket_1.messageBroker.broadcastToSubscribedClients(`/api/ecosystem/market`, { type: "trades", symbol }, {
        stream: "trades",
        data: trades,
    });
}
async function handleTickerBroadcast(symbol, ticker) {
    Websocket_1.messageBroker.broadcastToSubscribedClients(`/api/ecosystem/market`, { type: "ticker", symbol }, {
        stream: "ticker",
        data: ticker,
    });
}
async function handleCandleBroadcast(symbol, interval, candle) {
    const parsedCandle = [
        candle.createdAt.getTime(),
        candle.open,
        candle.high,
        candle.low,
        candle.close,
        candle.volume,
    ];
    Websocket_1.messageBroker.broadcastToSubscribedClients(`/api/ecosystem/market`, { type: "ohlcv", interval, symbol }, {
        stream: `ohlcv:${interval}`,
        data: [parsedCandle],
    });
}
async function handleTickersBroadcast(tickers) {
    Websocket_1.messageBroker.broadcastToSubscribedClients(`/api/ecosystem/ticker`, { type: "tickers" }, {
        stream: "tickers",
        data: tickers,
    });
}
function intervalToMs(interval) {
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
function normalizeTimeToInterval(timestamp, interval) {
    const date = new Date(timestamp);
    switch (interval.slice(-1)) {
        case "m":
            return (0, date_fns_1.startOfMinute)(date).getTime();
        case "h":
            return (0, date_fns_1.startOfHour)(date).getTime();
        case "d":
            return (0, date_fns_1.startOfDay)(date).getTime();
        case "w":
            return (0, date_fns_1.startOfWeek)(date, { weekStartsOn: 1 }).getTime();
        default:
            throw (0, error_1.createError)({ statusCode: 400, message: `Invalid interval: ${interval}` });
    }
}
async function offloadToRedis(key, value) {
    const serializedValue = JSON.stringify(value);
    await setAsync(key, serializedValue);
}
async function loadKeysFromRedis(pattern) {
    try {
        const keys = await keysAsync(pattern);
        return keys;
    }
    catch (error) {
        console.error("Failed to fetch keys:", error);
        return [];
    }
}
async function loadFromRedis(identifier) {
    const dataStr = await getAsync(identifier);
    if (!dataStr)
        return null;
    try {
        return JSON.parse(dataStr);
    }
    catch (error) {
        console.error("Failed to parse JSON:", error);
    }
}
async function removeFromRedis(key) {
    try {
        await delAsync(key);
    }
    catch (error) {
        console.error("Failed to delete key:", error);
    }
}
async function convertToOrderArray(rawData) {
    const parsedData = [];
    for (let i = 0; i < rawData.length; i += 2) {
        parsedData.push([parseFloat(rawData[i]), parseFloat(rawData[i + 1])]);
    }
    return parsedData;
}
