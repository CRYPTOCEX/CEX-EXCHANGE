"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleOrderBookBroadcast = handleOrderBookBroadcast;
exports.handleOrderBroadcast = handleOrderBroadcast;
exports.handleTradesBroadcast = handleTradesBroadcast;
exports.handleTickerBroadcast = handleTickerBroadcast;
exports.handleCandleBroadcast = handleCandleBroadcast;
exports.handleTickersBroadcast = handleTickersBroadcast;
exports.handlePositionBroadcast = handlePositionBroadcast;
const Websocket_1 = require("@b/handler/Websocket");
const console_1 = require("@b/utils/console");
let fromBigInt;
let fromWei;
try {
    const module = require("../../ecosystem/utils/blockchain");
    fromBigInt = module.fromBigInt;
    fromWei = module.fromWei;
}
catch (e) {
}
async function handleOrderBookBroadcast(symbol, book) {
    try {
        if (!book) {
            console_1.logger.error("FUTURES_WS", "Book is undefined", new Error("Book is undefined"));
            return;
        }
        if (!fromWei) {
            console_1.logger.warn("FUTURES_WS", "Ecosystem extension not available for order book broadcast");
            return;
        }
        const threshold = 1e-10;
        const orderbook = {
            asks: Object.entries(book.asks || {})
                .map(([price, amount]) => [
                fromWei(Number(price)),
                fromWei(Number(amount)),
            ])
                .filter(([price, amount]) => price > threshold && amount > threshold),
            bids: Object.entries(book.bids || {})
                .map(([price, amount]) => [
                fromWei(Number(price)),
                fromWei(Number(amount)),
            ])
                .filter(([price, amount]) => price > threshold && amount > threshold),
        };
        Websocket_1.messageBroker.broadcastToSubscribedClients(`/api/futures/market`, { type: "orderbook", symbol }, {
            stream: "orderbook",
            data: orderbook,
        });
    }
    catch (error) {
        console_1.logger.error("FUTURES_WS", "Failed to fetch and broadcast order book", error);
    }
}
async function handleOrderBroadcast(order) {
    if (!fromBigInt) {
        console_1.logger.warn("FUTURES_WS", "Ecosystem extension not available for order broadcast");
        return;
    }
    const filteredOrder = {
        ...order,
        price: fromBigInt(order.price),
        amount: fromBigInt(order.amount),
        filled: fromBigInt(order.filled),
        remaining: fromBigInt(order.remaining),
        cost: fromBigInt(order.cost),
        fee: fromBigInt(order.fee),
        average: fromBigInt(order.average),
        leverage: fromBigInt(order.leverage),
        stopLossPrice: order.stopLossPrice
            ? fromBigInt(order.stopLossPrice)
            : undefined,
        takeProfitPrice: order.takeProfitPrice
            ? fromBigInt(order.takeProfitPrice)
            : undefined,
    };
    Websocket_1.messageBroker.broadcastToSubscribedClients(`/api/futures/order`, { type: "orders", userId: order.userId }, {
        stream: "orders",
        data: [filteredOrder],
    });
    Websocket_1.messageBroker.broadcastToSubscribedClients(`/api/futures/market/${order.symbol}`, { type: "orders", userId: order.userId }, {
        stream: "orders",
        data: filteredOrder,
    });
}
async function handleTradesBroadcast(symbol, trades) {
    Websocket_1.messageBroker.broadcastToSubscribedClients(`/api/futures/market`, { type: "trades", symbol }, {
        stream: "trades",
        data: trades,
    });
}
async function handleTickerBroadcast(symbol, ticker) {
    Websocket_1.messageBroker.broadcastToSubscribedClients(`/api/futures/market`, { type: "ticker", symbol }, {
        stream: "ticker",
        data: ticker,
    });
}
async function handleCandleBroadcast(symbol, interval, candle) {
    if (!candle || !candle.createdAt) {
        console_1.logger.error("FUTURES_WS", "Candle data or createdAt property is missing", new Error("Missing candle data"));
        return;
    }
    const parsedCandle = [
        new Date(candle.createdAt).getTime(),
        candle.open,
        candle.high,
        candle.low,
        candle.close,
        candle.volume,
    ];
    Websocket_1.messageBroker.broadcastToSubscribedClients(`/api/futures/market`, { type: "ohlcv", interval, symbol }, {
        stream: "ohlcv",
        data: [parsedCandle],
    });
}
async function handleTickersBroadcast(tickers) {
    Websocket_1.messageBroker.broadcastToSubscribedClients(`/api/futures/ticker`, { type: "tickers" }, {
        stream: "tickers",
        data: tickers,
    });
}
async function handlePositionBroadcast(position) {
    if (!fromBigInt) {
        console_1.logger.warn("FUTURES_WS", "Ecosystem extension not available for position broadcast");
        return;
    }
    const filteredPosition = {
        ...position,
        entryPrice: fromBigInt(position.entryPrice),
        amount: fromBigInt(position.amount),
        unrealizedPnl: fromBigInt(position.unrealizedPnl),
        stopLossPrice: position.stopLossPrice
            ? fromBigInt(position.stopLossPrice)
            : undefined,
        takeProfitPrice: position.takeProfitPrice
            ? fromBigInt(position.takeProfitPrice)
            : undefined,
    };
    Websocket_1.messageBroker.broadcastToSubscribedClients(`/api/futures/market/${position.symbol}`, { type: "positions", userId: position.userId }, {
        stream: "positions",
        data: filteredPosition,
    });
}
