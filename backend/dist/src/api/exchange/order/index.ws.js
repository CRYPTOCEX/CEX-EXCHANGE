"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeOrderFromTrackedOrders = exports.addOrderToTrackedOrders = exports.removeUserFromWatchlist = exports.addUserToWatchlist = exports.metadata = void 0;
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const Websocket_1 = require("@b/handler/Websocket");
const db_1 = require("@b/db");
const utils_1 = require("@b/api/finance/wallet/utils");
const console_1 = require("@b/utils/console");
const utils_2 = require("../utils");
const utils_3 = require("./utils");
const wallet_1 = require("@b/services/wallet");
const error_1 = require("@b/utils/error");
exports.metadata = {};
class OrderHandler {
    constructor() {
        this.trackedOrders = {};
        this.watchedUserIds = new Set();
        this.orderInterval = null;
        this.lastFetchTime = 0;
        this.unblockTime = 0;
        this.addUserToWatchlist = this.addUserToWatchlist.bind(this);
        this.removeUserFromWatchlist = this.removeUserFromWatchlist.bind(this);
        this.addOrderToTrackedOrders = this.addOrderToTrackedOrders.bind(this);
        this.removeOrderFromTrackedOrders =
            this.removeOrderFromTrackedOrders.bind(this);
        this.fetchOrdersForUser = this.fetchOrdersForUser.bind(this);
    }
    static getInstance() {
        if (!OrderHandler.instance) {
            OrderHandler.instance = new OrderHandler();
        }
        return OrderHandler.instance;
    }
    startInterval() {
        if (!this.orderInterval) {
            this.orderInterval = setInterval(this.flushOrders.bind(this), 1000);
        }
    }
    stopInterval() {
        if (this.orderInterval) {
            clearInterval(this.orderInterval);
            this.orderInterval = null;
        }
    }
    async updateWalletBalance(userId, order, provider) {
        try {
            const [currency, pair] = order.symbol.split("/");
            const market = await db_1.models.exchangeMarket.findOne({
                where: { currency, pair },
            });
            if (!market || !market.metadata) {
                throw (0, error_1.createError)({ statusCode: 404, message: "Market data not found" });
            }
            const metadata = typeof market.metadata === "string"
                ? JSON.parse(market.metadata)
                : market.metadata;
            const feeRate = order.side === "BUY" ? Number(metadata.taker) : Number(metadata.maker);
            order = (0, utils_3.adjustOrderData)(order, provider, feeRate);
            const amount = Number(order.amount);
            const cost = Number(order.cost);
            const fee = Number(order.fee);
            const currencyWallet = await (0, utils_1.getWalletSafe)(userId, "SPOT", currency);
            const pairWallet = await (0, utils_1.getWalletSafe)(userId, "SPOT", pair);
            if (!currencyWallet || !pairWallet) {
                throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
            }
            const idempotencyKey = `exchange_order_${order.id}_credit`;
            if (order.side === "BUY") {
                const netAmount = amount - fee;
                await wallet_1.walletService.credit({
                    idempotencyKey,
                    userId,
                    walletId: currencyWallet.id,
                    walletType: "SPOT",
                    currency,
                    amount: netAmount,
                    operationType: "EXCHANGE_ORDER_FILL",
                    fee,
                    description: `Order filled: Buy ${amount} ${currency}`,
                    metadata: {
                        orderId: order.id,
                        symbol: order.symbol,
                        side: order.side,
                        cost,
                    },
                });
            }
            else {
                const netProceeds = cost - fee;
                await wallet_1.walletService.credit({
                    idempotencyKey,
                    userId,
                    walletId: pairWallet.id,
                    walletType: "SPOT",
                    currency: pair,
                    amount: netProceeds,
                    operationType: "EXCHANGE_ORDER_FILL",
                    fee,
                    description: `Order filled: Sell ${amount} ${currency}`,
                    metadata: {
                        orderId: order.id,
                        symbol: order.symbol,
                        side: order.side,
                        amount,
                    },
                });
            }
        }
        catch (error) {
            console_1.logger.error("EXCHANGE", "Failed to update wallet balance", error);
        }
    }
    flushOrders() {
        if (Object.keys(this.trackedOrders).length > 0) {
            const route = "/api/exchange/order";
            const streamKey = "orders";
            Object.keys(this.trackedOrders).forEach((userId) => {
                let orders = this.trackedOrders[userId];
                orders = orders.filter((order) => order.price &&
                    order.amount &&
                    order.filled !== undefined &&
                    order.remaining !== undefined &&
                    order.timestamp);
                const seenOrders = new Set();
                orders = orders.filter((order) => {
                    const isDuplicate = seenOrders.has(order.id);
                    seenOrders.add(order.id);
                    return !isDuplicate;
                });
                if (orders.length > 0) {
                    Websocket_1.messageBroker.broadcastToSubscribedClients(route, { type: "orders", userId }, { stream: streamKey, data: orders });
                }
            });
            this.trackedOrders = {};
        }
        else {
            this.stopInterval();
        }
    }
    async fetchOpenOrdersWithRetries(exchange, symbol, provider) {
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                if (Date.now() < this.unblockTime) {
                    throw (0, error_1.createError)({
                        statusCode: 503,
                        message: `Blocked until ${new Date(this.unblockTime).toLocaleString()}`
                    });
                }
                const orders = await exchange.fetchOpenOrders(symbol);
                const [currency, pair] = symbol.split("/");
                const market = await db_1.models.exchangeMarket.findOne({
                    where: { currency, pair },
                });
                if (!market || !market.metadata) {
                    throw (0, error_1.createError)({ statusCode: 404, message: "Market data not found" });
                }
                const metadata = typeof market.metadata === "string"
                    ? JSON.parse(market.metadata)
                    : market.metadata;
                const adjustedOrders = orders.map((order) => {
                    const feeRate = order.side === "BUY"
                        ? Number(metadata.taker)
                        : Number(metadata.maker);
                    return (0, utils_3.adjustOrderData)(order, provider, feeRate);
                });
                return adjustedOrders.map((order) => ({
                    ...order,
                    status: order.status.toUpperCase(),
                }));
            }
            catch (error) {
                const result = await (0, utils_2.handleExchangeError)(error, exchange_1.default);
                if (typeof result === "number") {
                    this.unblockTime = result;
                    await (0, utils_2.saveBanStatus)(this.unblockTime);
                    throw error;
                }
                if (attempt < 3) {
                    await new Promise((resolve) => setTimeout(resolve, 5000));
                }
                else {
                    throw error;
                }
            }
        }
    }
    async fetchOrder(exchange, orderId, symbol, provider) {
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                if (Date.now() < this.unblockTime) {
                    throw (0, error_1.createError)({
                        statusCode: 503,
                        message: `Blocked until ${new Date(this.unblockTime).toLocaleString()}`
                    });
                }
                const order = await exchange.fetchOrder(Number(orderId), symbol);
                order.status = order.status.toUpperCase();
                const [currency, pair] = symbol.split("/");
                const market = await db_1.models.exchangeMarket.findOne({
                    where: { currency, pair },
                });
                if (!market || !market.metadata) {
                    throw (0, error_1.createError)({ statusCode: 404, message: "Market data not found" });
                }
                const metadata = typeof market.metadata === "string"
                    ? JSON.parse(market.metadata)
                    : market.metadata;
                const feeRate = order.side === "BUY"
                    ? Number(metadata.taker)
                    : Number(metadata.maker);
                return (0, utils_3.adjustOrderData)(order, provider, feeRate);
            }
            catch (error) {
                const result = await (0, utils_2.handleExchangeError)(error, exchange_1.default);
                if (typeof result === "number") {
                    this.unblockTime = result;
                    await (0, utils_2.saveBanStatus)(this.unblockTime);
                    throw error;
                }
                if (error.message.includes("Order was canceled or expired with no executed qty over 90 days ago and has been archived")) {
                    await this.removeOrder(orderId);
                    return null;
                }
                if (attempt < 3) {
                    await new Promise((resolve) => setTimeout(resolve, 5000));
                }
                else {
                    throw error;
                }
            }
        }
    }
    async updateOrder(orderId, data) {
        try {
            await db_1.models.exchangeOrder.update({ ...data }, { where: { referenceId: orderId } });
        }
        catch (error) {
            console_1.logger.error("EXCHANGE", "Failed to update order", error);
        }
    }
    async removeOrder(orderId) {
        try {
            await db_1.models.exchangeOrder.destroy({
                where: { referenceId: orderId },
                force: true,
            });
        }
        catch (error) {
            console_1.logger.error("EXCHANGE", "Failed to remove order", error);
        }
    }
    addUserToWatchlist(userId) {
        if (!this.watchedUserIds.has(userId)) {
            this.watchedUserIds.add(userId);
            this.trackedOrders[userId] = this.trackedOrders[userId] || [];
            if (!this.orderInterval) {
                this.startInterval();
            }
        }
    }
    removeUserFromWatchlist(userId) {
        if (this.watchedUserIds.has(userId)) {
            this.watchedUserIds.delete(userId);
            delete this.trackedOrders[userId];
        }
    }
    removeOrderFromTrackedOrders(userId, orderId) {
        if (this.trackedOrders[userId]) {
            this.trackedOrders[userId] = this.trackedOrders[userId].filter((order) => order.id !== orderId);
            if (this.trackedOrders[userId].length === 0) {
                delete this.trackedOrders[userId];
                this.removeUserFromWatchlist(userId);
            }
        }
    }
    addOrderToTrackedOrders(userId, order) {
        this.trackedOrders[userId] = this.trackedOrders[userId] || [];
        this.trackedOrders[userId].push({
            id: order.id,
            status: order.status,
            price: order.price,
            amount: order.amount,
            filled: order.filled,
            remaining: order.remaining,
            timestamp: order.timestamp,
        });
    }
    async fetchOrdersForUser(userId, userOrders, exchange, provider) {
        let symbols = userOrders.map((order) => order.symbol);
        while ((0, Websocket_1.hasClients)("/api/exchange/order") &&
            this.watchedUserIds.has(userId)) {
            const currentTime = Date.now();
            if (currentTime - this.lastFetchTime < 5000) {
                await new Promise((resolve) => setTimeout(resolve, 5000 - (currentTime - this.lastFetchTime)));
            }
            this.lastFetchTime = Date.now();
            for (const symbol of symbols) {
                try {
                    if (Date.now() < this.unblockTime) {
                        const waitTime = this.unblockTime - Date.now();
                        console.log(`Waiting for ${(0, utils_2.formatWaitTime)(waitTime)} until unblock time`);
                        await new Promise((resolve) => setTimeout(resolve, Math.min(waitTime, 60000)));
                        this.unblockTime = await (0, utils_2.loadBanStatus)();
                        continue;
                    }
                    const openOrders = await this.fetchOpenOrdersWithRetries(exchange, symbol, provider);
                    if (!openOrders) {
                        throw (0, error_1.createError)({ statusCode: 500, message: "Failed to fetch open orders after retries" });
                    }
                    for (const order of userOrders) {
                        const updatedOrder = openOrders.find((o) => o.id === order.referenceId);
                        if (!updatedOrder) {
                            const fetchedOrder = await this.fetchOrder(exchange, order.referenceId, symbol, provider);
                            if (fetchedOrder) {
                                if (fetchedOrder.status !== order.status) {
                                    this.addOrderToTrackedOrders(userId, {
                                        id: order.id,
                                        status: fetchedOrder.status,
                                        price: fetchedOrder.price,
                                        amount: fetchedOrder.amount,
                                        filled: fetchedOrder.filled,
                                        remaining: fetchedOrder.remaining,
                                        timestamp: fetchedOrder.timestamp,
                                    });
                                    await this.updateOrder(fetchedOrder.id, {
                                        status: fetchedOrder.status.toUpperCase(),
                                        price: fetchedOrder.price,
                                        filled: fetchedOrder.filled,
                                        remaining: fetchedOrder.remaining,
                                    });
                                    if (fetchedOrder.status === "CLOSED") {
                                        userOrders.splice(userOrders.indexOf(order), 1);
                                        await this.updateWalletBalance(userId, fetchedOrder, provider);
                                    }
                                }
                            }
                            else {
                                await this.removeOrder(order.referenceId);
                                userOrders.splice(userOrders.indexOf(order), 1);
                                this.removeOrderFromTrackedOrders(userId, order.id);
                                if (userOrders.length === 0) {
                                    this.removeUserFromWatchlist(userId);
                                    break;
                                }
                            }
                        }
                        else if (updatedOrder.status !== order.status) {
                            this.addOrderToTrackedOrders(userId, {
                                id: order.id,
                                status: updatedOrder.status,
                                price: updatedOrder.price,
                                amount: updatedOrder.amount,
                                filled: updatedOrder.filled,
                                remaining: updatedOrder.remaining,
                                timestamp: updatedOrder.timestamp,
                            });
                            await this.updateOrder(updatedOrder.id, {
                                status: updatedOrder.status.toUpperCase(),
                                price: updatedOrder.price,
                                filled: updatedOrder.filled,
                                remaining: updatedOrder.remaining,
                            });
                            if (updatedOrder.status === "CLOSED") {
                                userOrders.splice(userOrders.indexOf(order), 1);
                                await this.updateWalletBalance(userId, updatedOrder, provider);
                            }
                            else {
                                order.status = updatedOrder.status;
                            }
                        }
                    }
                    if (openOrders.length > 0) {
                        this.trackedOrders[userId] = this.trackedOrders[userId] || [];
                        openOrders.forEach((order) => {
                            if (!this.trackedOrders[userId].some((o) => o.id === order.id)) {
                                this.addOrderToTrackedOrders(userId, {
                                    id: order.id,
                                    status: order.status,
                                    price: order.price,
                                    amount: order.amount,
                                    filled: order.filled,
                                    remaining: order.remaining,
                                    timestamp: order.timestamp,
                                });
                            }
                        });
                    }
                    if (userOrders.length === 0) {
                        this.removeUserFromWatchlist(userId);
                        break;
                    }
                    if (Object.keys(this.trackedOrders).length > 0) {
                        this.startInterval();
                    }
                    else {
                        this.stopInterval();
                    }
                }
                catch (error) {
                    console_1.logger.error("EXCHANGE", "Error fetching orders for user", error);
                    symbols = symbols.filter((s) => s !== symbol);
                    const filteredOrders = userOrders.filter((order) => order.symbol !== symbol);
                    userOrders.length = 0;
                    userOrders.push(...filteredOrders);
                    if (userOrders.length === 0) {
                        this.removeUserFromWatchlist(userId);
                        break;
                    }
                }
            }
        }
    }
    async handleMessage(data, message) {
        if (typeof message === "string") {
            message = JSON.parse(message);
        }
        const { user } = data;
        if (!(user === null || user === void 0 ? void 0 : user.id)) {
            return;
        }
        const { userId } = message.payload;
        if (!userId) {
            return;
        }
        if (user.id !== userId) {
            return;
        }
        if (!this.watchedUserIds.has(userId)) {
            this.addUserToWatchlist(userId);
        }
        else {
            return;
        }
        const userOrders = await db_1.models.exchangeOrder.findAll({
            where: { userId: user.id, status: "OPEN" },
            attributes: ["id", "referenceId", "symbol", "status", "createdAt"],
            raw: true,
        });
        if (!userOrders.length) {
            this.removeUserFromWatchlist(userId);
            return;
        }
        const exchange = await exchange_1.default.startExchange();
        if (!exchange)
            return;
        const provider = await exchange_1.default.getProvider();
        this.fetchOrdersForUser(userId, userOrders, exchange, provider);
    }
}
exports.default = async (data, message) => {
    const handler = OrderHandler.getInstance();
    await handler.handleMessage(data, message);
};
_a = OrderHandler.getInstance(), exports.addUserToWatchlist = _a.addUserToWatchlist, exports.removeUserFromWatchlist = _a.removeUserFromWatchlist, exports.addOrderToTrackedOrders = _a.addOrderToTrackedOrders, exports.removeOrderFromTrackedOrders = _a.removeOrderFromTrackedOrders;
