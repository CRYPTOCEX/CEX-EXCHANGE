"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
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
const fees_1 = require("@b/utils/fees");
const rust_owns_1 = require("@b/utils/rust-owns");
const error_1 = require("@b/utils/error");
const fill_math_1 = require("./util/fill-math");
const { settleSpotOrder } = require("./util/processPendingSpotOrders");
const terminal = status => ["CLOSED", "FILLED", "CANCELED", "CANCELLED", "EXPIRED", "REJECTED"].includes(String(status).toUpperCase());
exports.metadata = { requiresAuth: true };
class OrderHandler {
    constructor() {
        this.trackedOrders = {};
        this.watchedUserIds = new Set();
        this.activeWatchers = new Set();
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
        if ((0, rust_owns_1.rustOwns)("spot.fill-watcher"))
            return;
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
    flushOrders() {
        if (Object.keys(this.trackedOrders).length > 0) {
            const route = "/api/exchange/order";
            const streamKey = "orders";
            Object.keys(this.trackedOrders).forEach((userId) => {
                let orders = this.trackedOrders[userId];
                orders = orders.filter(order => order.id && order.status);
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
                return orders.map(order => ({ ...order, status: String(order.status || "open").toUpperCase() }));
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
                const order = exchange.has?.fetchOrder
                    ? await exchange.fetchOrder(String(orderId), symbol)
                    : (await exchange.fetchOrders(symbol)).find(o => String(o.id) === String(orderId));
                return order ? { ...order, status: String(order.status || "open").toUpperCase() } : null;
            }
            catch (error) {
                const result = await (0, utils_2.handleExchangeError)(error, exchange_1.default);
                if (typeof result === "number") {
                    this.unblockTime = result;
                    await (0, utils_2.saveBanStatus)(this.unblockTime);
                    throw error;
                }
                if (error.message.includes("Order was canceled or expired with no executed qty over 90 days ago and has been archived")) {
                    return null; // Absence is not evidence that held funds can be discarded.
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
        this.trackedOrders[userId] = this.trackedOrders[userId].filter(existing => existing.id !== order.id);
        this.trackedOrders[userId].push({
            id: order.id,
            status: order.status,
            price: order.price,
            amount: order.amount,
            filled: order.filled,
            remaining: order.remaining,
            timestamp: order.timestamp || (order.createdAt ? new Date(order.createdAt).getTime() : Date.now()),
        });
    }
    async reconcileUserOrder(userId, row, exchange, provider) {
        const local = await db_1.models.exchangeOrder.findOne({ where: { id: row.id, userId }, raw: true });
        if (!local) return false;
        const meta = (0, utils_3.metadataObject)(local.metadata);
        if (meta.reconcileBlocked || (meta.venue && meta.venue !== provider)) return false;
        if (!terminal(local.status)) {
            if (!local.referenceId) return false;
            const remote = await this.fetchOrder(exchange, local.referenceId, local.symbol, provider);
            if (!remote) return false;
            await settleSpotOrder(local, remote, provider);
        }
        const fresh = await db_1.models.exchangeOrder.findOne({ where: { id: local.id, userId }, raw: true });
        if (!fresh) return false;
        this.addOrderToTrackedOrders(userId, fresh);
        return terminal(fresh.status);
    }
    async fetchOrdersForUser(userId, userOrders, exchange, provider) {
        if (this.activeWatchers.has(userId)) return;
        this.activeWatchers.add(userId);
        const pending = new Map(userOrders.map(row => [row.id, row]));
        try {
            while ((0, Websocket_1.hasClients)("/api/exchange/order") && this.watchedUserIds.has(userId)) {
                if (await exchange_1.default.getProvider() !== provider) break;
                const open = await db_1.models.exchangeOrder.findAll({ where: { userId, status: "OPEN" }, raw: true });
                for (const row of open) pending.set(row.id, row);
                for (const [id, row] of pending) {
                    try {
                        if (await this.reconcileUserOrder(userId, row, exchange, provider)) pending.delete(id);
                    } catch (error) {
                        console_1.logger.error("EXCHANGE", `Order ${id} remains pending reconciliation`, error);
                    }
                }
                this.flushOrders();
                if (!pending.size) break;
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        } finally {
            this.activeWatchers.delete(userId);
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
            attributes: ["id", "referenceId", "symbol", "status", "createdAt", "metadata"],
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
        this.fetchOrdersForUser(userId, userOrders, exchange, provider).catch(error => console_1.logger.error("EXCHANGE", "Order watcher failed", error));
    }
}
exports.default = async (data, message) => {
    const handler = OrderHandler.getInstance();
    await handler.handleMessage(data, message);
};
({ addUserToWatchlist: exports.addUserToWatchlist, removeUserFromWatchlist: exports.removeUserFromWatchlist, addOrderToTrackedOrders: exports.addOrderToTrackedOrders, removeOrderFromTrackedOrders: exports.removeOrderFromTrackedOrders } = OrderHandler.getInstance());
