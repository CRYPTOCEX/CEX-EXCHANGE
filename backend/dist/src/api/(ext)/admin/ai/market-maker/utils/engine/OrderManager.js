"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderManager = exports.TETHERED_ORDER_EXPIRATION_MS = exports.REAL_ORDER_EXPIRATION_MS = void 0;
exports.realOrderLifetimeMs = realOrderLifetimeMs;
const console_1 = require("@b/utils/console");
const queries_1 = require("../scylla/queries");
const quote_staleness_1 = require("./quote-staleness");
const futures_orders_1 = require("../venue/futures-orders");
const pool_account_1 = require("../venue/pool-account");
const blockchain_1 = require("@b/api/(ext)/ecosystem/utils/blockchain");
const real_fill_bus_1 = require("./real-fill-bus");
const AI_ORDER_EXPIRATION_MS = 5 * 60 * 1000;
exports.REAL_ORDER_EXPIRATION_MS = 60 * 60 * 1000;
exports.TETHERED_ORDER_EXPIRATION_MS = 5 * 60 * 1000;
function realOrderLifetimeMs(config) {
    const tethered = ((config === null || config === void 0 ? void 0 : config.priceMode) === "FOLLOW_EXTERNAL" || (config === null || config === void 0 ? void 0 : config.priceMode) === "HYBRID") &&
        Boolean(config === null || config === void 0 ? void 0 : config.externalSymbol);
    return tethered ? exports.TETHERED_ORDER_EXPIRATION_MS : exports.REAL_ORDER_EXPIRATION_MS;
}
const CANCEL_RETRY_BACKOFF_MS = 5 * 60 * 1000;
const FUTURES_RECONCILE_GRACE_MS = 30 * 1000;
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
        var _a, _b;
        let unowned = 0;
        try {
            if (this.config.marketType === "FUTURES") {
                const poolOrders = await (0, futures_orders_1.listPoolOpenOrders)(this.config.symbol);
                for (const order of poolOrders) {
                    const createdAt = order.createdAt
                        ? new Date(order.createdAt)
                        : new Date();
                    this.trackOrder({
                        orderId: order.id,
                        botId: (_a = order.botId) !== null && _a !== void 0 ? _a : pool_account_1.AI_POOL_USER_ID,
                        side: order.side,
                        price: BigInt(order.price),
                        amount: BigInt(order.amount),
                        filledAmount: BigInt(order.amount) - BigInt((_b = order.remaining) !== null && _b !== void 0 ? _b : order.amount),
                        isRealLiquidity: true,
                        isPoolFutures: true,
                        reduceOnly: order.reduceOnly === true,
                        createdAt,
                        expiresAt: new Date(createdAt.getTime() + realOrderLifetimeMs(this.config)),
                    });
                }
                return;
            }
            {
                const realOrders = await (0, queries_1.getRealLiquidityOrdersBySymbol)(this.config.symbol, "OPEN");
                for (const order of realOrders) {
                    if (!order.botId) {
                        unowned++;
                        continue;
                    }
                    this.trackOrder({
                        orderId: order.ecosystemOrderId,
                        botId: order.botId,
                        side: order.side,
                        price: order.price,
                        amount: order.amount,
                        filledAmount: order.filledAmount,
                        isRealLiquidity: true,
                        createdAt: order.createdAt,
                        expiresAt: new Date(order.createdAt.getTime() + realOrderLifetimeMs(this.config)),
                    });
                }
            }
            if (unowned > 0) {
                console_1.logger.warn("AI_MM", `${unowned} tracked real-liquidity order(s) on ${this.config.symbol} have no bot_id ` +
                    `recorded and cannot be cancelled from here — they predate the column being ` +
                    `written. They are still OPEN and resting in the book. Clear them with ` +
                    `\`pnpm eco:mm:orders --apply\`, which reads each order's true owner from the ` +
                    `ecosystem row.`);
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
        if (this.config.marketType === "FUTURES") {
            return this.createRealFuturesOrder(params);
        }
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
        const createdAt = ecosystemOrder.createdAt
            ? new Date(ecosystemOrder.createdAt)
            : new Date();
        this.trackOrder({
            orderId: ecosystemOrder.id,
            botId: params.botId,
            side: params.side,
            price: params.price,
            amount: params.amount,
            filledAmount: BigInt(0),
            isRealLiquidity: true,
            placementSpread: params.placementSpread,
            createdAt,
            expiresAt: new Date(createdAt.getTime() + realOrderLifetimeMs(this.config)),
        });
        this.ordersCreated++;
        return ecosystemOrder.id;
    }
    async createRealFuturesOrder(params) {
        var _a;
        var _b;
        if (!(0, futures_orders_1.futuresEngineAvailable)()) {
            console_1.logger.debug("AI_MM", `Futures engine unavailable; ${this.config.symbol} cannot place real liquidity`);
            return null;
        }
        const aiOrderCreatedAt = new Date();
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
        }, aiOrderCreatedAt);
        const placed = await (0, futures_orders_1.placePoolQuote)({
            symbol: this.config.symbol,
            side: params.side,
            price: Number((0, blockchain_1.fromBigInt)(params.price)),
            amount: Number((0, blockchain_1.fromBigInt)(params.amount)),
            leverage: this.config.futuresLeverage,
            allocation: (_b = (_a = this.config.pool) === null || _a === void 0 ? void 0 : _a.quoteCurrencyBalance) !== null && _b !== void 0 ? _b : 0,
            metadata: this.config.marketMetadata,
            botId: params.botId,
        });
        if (placed.length === 0) {
            await (0, queries_1.cancelBotOrder)(this.config.marketId, aiOrderId, aiOrderCreatedAt).catch(() => undefined);
            return null;
        }
        for (const order of placed) {
            this.trackOrder({
                orderId: order.id,
                botId: params.botId,
                side: order.side,
                price: (0, blockchain_1.toBigIntFloat)(order.price),
                amount: (0, blockchain_1.toBigIntFloat)(order.amount),
                filledAmount: BigInt(0),
                isRealLiquidity: true,
                isPoolFutures: true,
                reduceOnly: order.reduceOnly,
                createdAt: order.createdAt,
                expiresAt: new Date(order.createdAt.getTime() + realOrderLifetimeMs(this.config)),
            });
            this.ordersCreated++;
        }
        return placed[0].id;
    }
    async cancelOrder(orderId) {
        try {
            const order = this.openOrders.get(orderId);
            if (!order) {
                return false;
            }
            if (order.isPoolFutures) {
                await (0, futures_orders_1.cancelPoolOrder)(orderId, order.createdAt);
            }
            else if (order.isRealLiquidity) {
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
        const outcomes = await Promise.all(orderIds.map(async (id) => ({ id, ok: await this.cancelOrder(id) })));
        const stillOpen = outcomes.filter((o) => !o.ok).map((o) => o.id);
        if (stillOpen.length) {
            console_1.logger.error("AI_MM", `${stillOpen.length} of ${orderIds.length} orders on ${this.config.symbol} could not be ` +
                `cancelled and are still resting on the book: ${stillOpen.join(", ")}`);
        }
        return { cancelled: orderIds.length - stillOpen.length, stillOpen };
    }
    async cleanupExpiredOrders(referencePrice, staleMarginFraction = 0) {
        const now = new Date();
        const expiredOrderIds = [];
        const reference = typeof referencePrice === "bigint" && referencePrice > BigInt(0)
            ? referencePrice
            : null;
        let crossedCount = 0;
        for (const [orderId, order] of this.openOrders) {
            if (order.expiresAt <= now) {
                expiredOrderIds.push(orderId);
            }
            else if ((0, quote_staleness_1.isStaleQuote)(order, reference, (0, quote_staleness_1.quoteMargin)(order, staleMarginFraction))) {
                crossedCount++;
                expiredOrderIds.push(orderId);
            }
        }
        if (crossedCount > 0) {
            console_1.logger.warn("AI_MM", `${crossedCount} resting quote(s) on ${this.config.symbol} are crossed with the ` +
                `current price and are being retired early. They could only have been taken at ` +
                `a loss to the pool.`);
        }
        if (this.config.marketType === "FUTURES" && this.openOrders.size > 0) {
            await this.reconcileFuturesFills(now);
        }
        if (expiredOrderIds.length === 0)
            return;
        let cancelledCount = 0;
        let alreadyGoneCount = 0;
        for (const orderId of expiredOrderIds) {
            const order = this.openOrders.get(orderId);
            if (!order)
                continue;
            let settled = false;
            try {
                if (order.isPoolFutures) {
                    settled = await (0, futures_orders_1.cancelPoolOrder)(orderId, order.createdAt);
                }
                else if (order.isRealLiquidity) {
                    settled = await (0, queries_1.cancelRealOrder)(orderId, order.botId, order.createdAt.toISOString(), this.config.symbol, order.price, order.side, order.amount - order.filledAmount);
                }
                else {
                    await (0, queries_1.cancelBotOrder)(this.config.marketId, orderId, order.createdAt);
                    settled = true;
                }
                if (settled)
                    cancelledCount++;
            }
            catch (error) {
                console_1.logger.warn("AI_MM", `Could not cancel expired order ${orderId} on ${this.config.symbol}: ` +
                    `${error === null || error === void 0 ? void 0 : error.message}. It stays tracked and will be retried.`);
            }
            if (settled) {
                this.openOrders.delete(orderId);
                this.ordersCanceled++;
            }
            else {
                alreadyGoneCount++;
                order.expiresAt = new Date(now.getTime() + CANCEL_RETRY_BACKOFF_MS);
            }
        }
        if (alreadyGoneCount > 0) {
            console_1.logger.warn("AI_MM", `${alreadyGoneCount} expired order(s) on ${this.config.symbol} could NOT be cancelled ` +
                `and are still resting in the book (cancelled: ${cancelledCount}). They remain ` +
                `tracked for retry. A count that keeps growing means orders are accumulating — ` +
                `check that they were placed with the same userId they are being cancelled under.`);
        }
        else {
            console_1.logger.debug("AI_MM", `Cleaned up ${expiredOrderIds.length} expired orders for ${this.config.symbol} (cancelled: ${cancelledCount})`);
        }
    }
    registerFillSink() {
        (0, real_fill_bus_1.registerRealFillSink)(this.config.id, (event) => this.applyRealFill(event));
    }
    disposeFillSink() {
        (0, real_fill_bus_1.unregisterRealFillSink)(this.config.id);
    }
    applyRealFill(event) {
        const order = this.openOrders.get(event.orderId);
        if (!order)
            return false;
        if (!order.isRealLiquidity)
            return false;
        if (event.filledAmount > order.filledAmount) {
            order.filledAmount =
                event.filledAmount > order.amount ? order.amount : event.filledAmount;
        }
        const consumed = event.remainingAmount <= BigInt(0) ||
            order.amount - order.filledAmount <= BigInt(0);
        if (consumed) {
            this.openOrders.delete(event.orderId);
            this.ordersFilled++;
        }
        return true;
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
    restingRealNotional() {
        let base = 0;
        let quote = 0;
        for (const order of this.openOrders.values()) {
            if (!order.isRealLiquidity || order.isPoolFutures)
                continue;
            const remaining = order.amount - order.filledAmount;
            if (remaining <= BigInt(0))
                continue;
            const size = Number(remaining) / 1e18;
            if (!Number.isFinite(size) || size <= 0)
                continue;
            if (order.side === "SELL") {
                base += size;
            }
            else {
                const price = Number(order.price) / 1e18;
                if (Number.isFinite(price) && price > 0)
                    quote += size * price;
            }
        }
        return { base, quote };
    }
    restingRealCounts() {
        let buys = 0;
        let sells = 0;
        for (const order of this.openOrders.values()) {
            if (!order.isRealLiquidity || order.isPoolFutures)
                continue;
            if (order.amount - order.filledAmount <= BigInt(0))
                continue;
            if (order.side === "SELL")
                sells++;
            else
                buys++;
        }
        return { buys, sells };
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
    async reconcileFuturesFills(now) {
        const open = await (0, futures_orders_1.listPoolOpenOrders)(this.config.symbol);
        if (open.length === 0)
            return;
        const stillOpen = new Set(open.map((order) => String(order.id)));
        let forgotten = 0;
        for (const [orderId, tracked] of this.openOrders) {
            if (!tracked.isPoolFutures)
                continue;
            if (stillOpen.has(orderId))
                continue;
            if (now.getTime() - tracked.createdAt.getTime() < FUTURES_RECONCILE_GRACE_MS) {
                continue;
            }
            this.openOrders.delete(orderId);
            this.ordersFilled++;
            forgotten++;
        }
        if (forgotten > 0) {
            console_1.logger.debug("AI_MM", `${forgotten} pool order(s) on ${this.config.symbol} are no longer open in the ` +
                `futures engine and have been forgotten`);
        }
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
