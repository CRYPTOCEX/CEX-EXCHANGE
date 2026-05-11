"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderManager = void 0;
const console_1 = require("@b/utils/console");
const queries_1 = require("../scylla/queries");
const AI_ORDER_EXPIRATION_MS = 5 * 60 * 1000;
const REAL_ORDER_EXPIRATION_MS = 60 * 60 * 1000;
class OrderManager {
    constructor(config, engine) {
        this.openOrders = new Map();
        this.ordersCreated = 0;
        this.ordersCanceled = 0;
        this.ordersFilled = 0;
        this.config = config;
        this.engine = engine;
    }
    async initialize() {
        try {
            if (this.config.realLiquidityPercent > 0) {
                const realOrders = await (0, queries_1.getRealLiquidityOrdersBySymbol)(this.config.symbol, "OPEN");
                for (const order of realOrders) {
                    this.trackOrder({
                        orderId: order.ecosystemOrderId,
                        botId: order.aiBotOrderId,
                        side: order.side,
                        price: order.price,
                        amount: order.amount,
                        filledAmount: BigInt(0),
                        isRealLiquidity: true,
                        createdAt: order.createdAt,
                        expiresAt: new Date(order.createdAt.getTime() + REAL_ORDER_EXPIRATION_MS),
                    });
                }
            }
            console_1.logger.debug("AI_MM", `OrderManager initialized with ${this.openOrders.size} real liquidity orders for ${this.config.symbol}`);
        }
        catch (error) {
            console_1.logger.error("AI_MM", "OrderManager initialization error", error);
            throw error;
        }
    }
    async createOrder(params) {
        try {
            if (params.isRealLiquidity) {
                return this.createRealOrder(params);
            }
            else {
                return this.createAiOrder(params);
            }
        }
        catch (error) {
            console_1.logger.error("AI_MM", "Order creation error", error);
            return null;
        }
    }
    async createAiOrder(params) {
        const orderId = await (0, queries_1.insertBotOrder)({
            marketId: this.config.marketId,
            botId: params.botId,
            side: params.side,
            type: params.type,
            price: params.price,
            amount: params.amount,
            filledAmount: BigInt(0),
            status: "OPEN",
            purpose: params.purpose,
        });
        const now = new Date();
        this.trackOrder({
            orderId,
            botId: params.botId,
            side: params.side,
            price: params.price,
            amount: params.amount,
            filledAmount: BigInt(0),
            isRealLiquidity: false,
            createdAt: now,
            expiresAt: new Date(now.getTime() + AI_ORDER_EXPIRATION_MS),
        });
        this.ordersCreated++;
        return orderId;
    }
    async createRealOrder(params) {
        const aiOrderId = await (0, queries_1.insertBotOrder)({
            marketId: this.config.marketId,
            botId: params.botId,
            side: params.side,
            type: params.type,
            price: params.price,
            amount: params.amount,
            filledAmount: BigInt(0),
            status: "OPEN",
            purpose: params.purpose,
        });
        const ecosystemOrder = await (0, queries_1.placeRealOrder)(this.config.symbol, params.side, params.price, params.amount, aiOrderId, this.config.id, params.botId);
        const now = new Date();
        this.trackOrder({
            orderId: ecosystemOrder.id,
            botId: params.botId,
            side: params.side,
            price: params.price,
            amount: params.amount,
            filledAmount: BigInt(0),
            isRealLiquidity: true,
            createdAt: now,
            expiresAt: new Date(now.getTime() + REAL_ORDER_EXPIRATION_MS),
        });
        this.ordersCreated++;
        return ecosystemOrder.id;
    }
    async cancelOrder(orderId) {
        try {
            const order = this.openOrders.get(orderId);
            if (!order) {
                return false;
            }
            if (order.isRealLiquidity) {
                await (0, queries_1.cancelRealOrder)(orderId, order.botId, order.createdAt.toISOString(), this.config.symbol, order.price, order.side, order.amount - order.filledAmount);
            }
            else {
                await (0, queries_1.cancelBotOrder)(this.config.marketId, orderId, order.createdAt);
            }
            this.openOrders.delete(orderId);
            this.ordersCanceled++;
            return true;
        }
        catch (error) {
            console_1.logger.error("AI_MM", "Order cancellation error", error);
            return false;
        }
    }
    async cancelAllOrders() {
        const orderIds = Array.from(this.openOrders.keys());
        await Promise.all(orderIds.map((id) => this.cancelOrder(id)));
        this.openOrders.clear();
    }
    async cleanupExpiredOrders() {
        const now = new Date();
        const expiredOrderIds = [];
        for (const [orderId, order] of this.openOrders) {
            if (order.expiresAt <= now) {
                expiredOrderIds.push(orderId);
            }
        }
        if (expiredOrderIds.length === 0)
            return;
        let cancelledCount = 0;
        let alreadyGoneCount = 0;
        for (const orderId of expiredOrderIds) {
            const order = this.openOrders.get(orderId);
            if (!order)
                continue;
            try {
                if (order.isRealLiquidity) {
                    await (0, queries_1.cancelRealOrder)(orderId, order.botId, order.createdAt.toISOString(), this.config.symbol, order.price, order.side, order.amount - order.filledAmount);
                }
                else {
                    await (0, queries_1.cancelBotOrder)(this.config.marketId, orderId, order.createdAt);
                }
                cancelledCount++;
            }
            catch (error) {
                alreadyGoneCount++;
            }
            this.openOrders.delete(orderId);
            this.ordersCanceled++;
        }
        console_1.logger.debug("AI_MM", `Cleaned up ${expiredOrderIds.length} expired orders for ${this.config.symbol} (cancelled: ${cancelledCount}, already processed: ${alreadyGoneCount})`);
    }
    async updateOrderFill(orderId, filledAmount, status) {
        const order = this.openOrders.get(orderId);
        if (!order) {
            return;
        }
        if (!order.isRealLiquidity) {
            await (0, queries_1.updateBotOrder)(this.config.marketId, orderId, order.createdAt, {
                filledAmount,
                status,
            });
        }
        order.filledAmount = filledAmount;
        if (status === "FILLED") {
            this.openOrders.delete(orderId);
            this.ordersFilled++;
        }
    }
    findMatchingOrders(side, price, maxAmount) {
        const oppositeSide = side === "BUY" ? "SELL" : "BUY";
        const matches = [];
        let remainingAmount = maxAmount;
        for (const [, order] of this.openOrders) {
            if (order.isRealLiquidity) {
                continue;
            }
            if (order.side !== oppositeSide) {
                continue;
            }
            if (side === "BUY" && order.price > price) {
                continue;
            }
            if (side === "SELL" && order.price < price) {
                continue;
            }
            const available = order.amount - order.filledAmount;
            if (available <= BigInt(0)) {
                continue;
            }
            matches.push(order);
            remainingAmount -= available;
            if (remainingAmount <= BigInt(0)) {
                break;
            }
        }
        return matches;
    }
    getOpenOrderCount() {
        return this.openOrders.size;
    }
    getOrderCounts() {
        let buys = 0;
        let sells = 0;
        for (const [, order] of this.openOrders) {
            if (order.side === "BUY") {
                buys++;
            }
            else {
                sells++;
            }
        }
        return { buys, sells };
    }
    getStats() {
        return {
            openOrders: this.openOrders.size,
            ordersCreated: this.ordersCreated,
            ordersCanceled: this.ordersCanceled,
            ordersFilled: this.ordersFilled,
        };
    }
    trackOrder(order) {
        this.openOrders.set(order.orderId, order);
    }
    getOpenOrders() {
        return Array.from(this.openOrders.values());
    }
}
exports.OrderManager = OrderManager;
exports.default = OrderManager;
