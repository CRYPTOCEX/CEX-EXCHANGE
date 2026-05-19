"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinaryOrderService = void 0;
exports.validateCreateOrderInput = validateCreateOrderInput;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
const emails_1 = require("@b/utils/emails");
const notifications_1 = require("@b/utils/notifications");
const Websocket_1 = require("@b/handler/Websocket");
const utils_1 = require("../utils");
const broadcast_1 = require("@b/cron/broadcast");
const console_1 = require("@b/utils/console");
const binary_settings_cache_1 = require("@b/utils/binary-settings-cache");
const wallet_1 = require("@b/services/wallet");
const ORDER_CONFIG = {
    DUPLICATE_CHECK_WINDOW_MS: 5000,
    REDLOCK_TTL_MS: 5000,
    MIN_PRICE_VALUE: 0.00000001,
    MAX_PRICE_VALUE: 1000000000,
    DEFAULT_MIN_AMOUNT: 1,
    DEFAULT_MAX_AMOUNT: 100000,
    MS_PER_MINUTE: 60000,
    CANDLE_LOOKBACK_MS: 120000,
    BATCH_SIZE: 10,
    DELAY_BETWEEN_BATCHES_MS: 1000,
};
function calculateCumulativeProfitAdjustment(settings, targetDurationMinutes, orderType) {
    var _a, _b;
    const sortedDurations = [...settings.durations].sort((a, b) => a.minutes - b.minutes);
    let cumulativeAdjustment = 0;
    for (const duration of sortedDurations) {
        const adjustment = ((_b = (_a = duration.orderTypeOverrides) === null || _a === void 0 ? void 0 : _a[orderType]) === null || _b === void 0 ? void 0 : _b.profitAdjustment) || 0;
        if (adjustment !== 0) {
            cumulativeAdjustment += adjustment;
        }
        if (duration.minutes >= targetDurationMinutes) {
            break;
        }
    }
    return cumulativeAdjustment;
}
class BinaryOrderService {
    static async createOrder({ userId, currency, pair, amount, side, type, durationId, durationType = "TIME", barrier, barrierLevelId, strikePrice, strikeLevelId, payoutPerPoint, closedAt, isDemo, idempotencyKey, }) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        validateCreateOrderInput({
            side,
            type,
            barrier,
            strikePrice,
            payoutPerPoint,
            durationType,
        });
        if (idempotencyKey) {
            const existingOrder = await db_1.models.binaryOrder.findOne({
                where: {
                    userId,
                    metadata: {
                        idempotencyKey: idempotencyKey,
                    },
                },
            });
            if (existingOrder) {
                console_1.logger.info("BINARY", `Idempotent request detected for user ${userId} with key ${idempotencyKey}. Returning existing order ${existingOrder.id}`);
                return existingOrder;
            }
        }
        const market = (await db_1.models.exchangeMarket.findOne({
            where: { currency, pair },
        }));
        if (!market || !market.metadata) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Market data not found" });
        }
        const metadata = typeof market.metadata === "string"
            ? JSON.parse(market.metadata)
            : market.metadata;
        const minAmount = Number((_c = (_b = (_a = metadata === null || metadata === void 0 ? void 0 : metadata.limits) === null || _a === void 0 ? void 0 : _a.amount) === null || _b === void 0 ? void 0 : _b.min) !== null && _c !== void 0 ? _c : ORDER_CONFIG.DEFAULT_MIN_AMOUNT);
        const maxAmount = Number((_f = (_e = (_d = metadata === null || metadata === void 0 ? void 0 : metadata.limits) === null || _d === void 0 ? void 0 : _d.amount) === null || _e === void 0 ? void 0 : _e.max) !== null && _f !== void 0 ? _f : ORDER_CONFIG.DEFAULT_MAX_AMOUNT);
        if (minAmount <= 0 || maxAmount <= 0 || maxAmount < minAmount) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Market configuration error: Invalid amount limits in market metadata",
            });
        }
        if (amount < minAmount || amount > maxAmount) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Amount must be between ${minAmount} and ${maxAmount} ${pair}`,
            });
        }
        const closeAtDate = new Date(closedAt);
        const now = Date.now();
        if (closeAtDate.getTime() <= now) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "closedAt must be a future time",
            });
        }
        const binarySettings = await (0, binary_settings_cache_1.getBinarySettings)();
        if (!binarySettings.global.enabled) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Binary trading is currently disabled",
            });
        }
        const orderTypeConfig = binarySettings.orderTypes[type];
        if (!orderTypeConfig || !orderTypeConfig.enabled) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Order type ${type} is not currently available`,
            });
        }
        const durationConfig = binarySettings.durations.find(d => d.id === durationId);
        if (!durationConfig || !durationConfig.enabled) {
            const availableDurations = binarySettings.durations
                .filter(d => d.enabled)
                .map(d => `${d.minutes}m`)
                .join(', ');
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Invalid or inactive duration selected. Available durations: ${availableDurations || 'none'}`,
            });
        }
        const durationOverride = (_g = durationConfig.orderTypeOverrides) === null || _g === void 0 ? void 0 : _g[type];
        if ((durationOverride === null || durationOverride === void 0 ? void 0 : durationOverride.enabled) === false) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Duration ${durationConfig.minutes}m is not available for ${type} orders`,
            });
        }
        const enabledDurations = binarySettings.durations.filter(d => d.enabled);
        const maxConfiguredDuration = Math.max(...enabledDurations.map(d => d.minutes));
        const maxDurationMs = maxConfiguredDuration * 60 * 1000;
        const actualDuration = closeAtDate.getTime() - now;
        if (actualDuration > maxDurationMs) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Order duration cannot exceed ${maxConfiguredDuration} minutes (maximum configured duration)`,
            });
        }
        const durationMinutes = durationConfig.minutes;
        const closeAtMinutes = closeAtDate.getMinutes();
        const closeAtSeconds = closeAtDate.getSeconds();
        const closeAtMs = closeAtDate.getMilliseconds();
        const isAlignedToBoundary = (closeAtMinutes % durationMinutes === 0) && closeAtSeconds <= 5 && closeAtMs <= 1000;
        const timeUntilExpiry = closeAtDate.getTime() - now;
        const minimumTimeBeforeExpiry = binarySettings.global.orderExpirationBuffer * 1000;
        if (!isAlignedToBoundary) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `closedAt timestamp must align to ${durationMinutes}-minute boundaries (e.g., ${Array.from({ length: Math.floor(60 / durationMinutes) }, (_, i) => `:${String(i * durationMinutes).padStart(2, '0')}`).join(', ')})`,
            });
        }
        if (timeUntilExpiry < minimumTimeBeforeExpiry) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Order must be placed at least ${binarySettings.global.orderExpirationBuffer} seconds before expiry. Time until expiry: ${Math.round(timeUntilExpiry / 1000)} seconds`,
            });
        }
        const tradingMode = isDemo ? 'demo' : 'live';
        if (orderTypeConfig.tradingModes && !orderTypeConfig.tradingModes[tradingMode]) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Order type ${type} is not available in ${tradingMode} mode`,
            });
        }
        if (amount <= 0) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Amount must be positive",
            });
        }
        let profitPercentage = orderTypeConfig.profitPercentage;
        let selectedBarrierLevel = null;
        let selectedStrikeLevel = null;
        if (type === "HIGHER_LOWER" || type === "TOUCH_NO_TOUCH" || type === "TURBO") {
            const barrierConfig = orderTypeConfig;
            const enabledBarrierLevels = ((_h = barrierConfig.barrierLevels) === null || _h === void 0 ? void 0 : _h.filter(l => l.enabled)) || [];
            if (enabledBarrierLevels.length === 0) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `No barrier levels are configured for ${type} orders`,
                });
            }
            if (barrier === undefined || barrier === null) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Barrier price is required for ${type} orders`,
                });
            }
            if (!barrierLevelId) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Barrier level selection is required for ${type} orders`,
                });
            }
            selectedBarrierLevel = enabledBarrierLevels.find(l => l.id === barrierLevelId) || null;
            if (!selectedBarrierLevel) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Invalid barrier level selected. Please choose from available levels.`,
                });
            }
            profitPercentage = selectedBarrierLevel.profitPercent;
            if (type === "TOUCH_NO_TOUCH") {
                const touchConfig = orderTypeConfig;
                if (side === "TOUCH") {
                    profitPercentage = profitPercentage * (touchConfig.touchProfitMultiplier || 1);
                }
                else if (side === "NO_TOUCH") {
                    profitPercentage = profitPercentage * (touchConfig.noTouchProfitMultiplier || 1);
                }
            }
            if (type === "TURBO") {
                const turboConfig = orderTypeConfig;
                if (payoutPerPoint === undefined || payoutPerPoint === null) {
                    throw (0, error_1.createError)({
                        statusCode: 400,
                        message: "Payout per point is required for TURBO orders",
                    });
                }
                const { min: minPayout, max: maxPayout } = turboConfig.payoutPerPointRange || { min: 0.1, max: 10 };
                if (payoutPerPoint < minPayout || payoutPerPoint > maxPayout) {
                    throw (0, error_1.createError)({
                        statusCode: 400,
                        message: `Payout per point must be between ${minPayout} and ${maxPayout}`,
                    });
                }
                const turboMaxDuration = turboConfig.maxDuration || 5;
                if (durationConfig.minutes > turboMaxDuration) {
                    throw (0, error_1.createError)({
                        statusCode: 400,
                        message: `TURBO orders cannot exceed ${turboMaxDuration} minute duration`,
                    });
                }
            }
        }
        if (type === "CALL_PUT") {
            const callPutConfig = orderTypeConfig;
            const enabledStrikeLevels = ((_j = callPutConfig.strikeLevels) === null || _j === void 0 ? void 0 : _j.filter((l) => l.enabled)) || [];
            if (enabledStrikeLevels.length === 0) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "No strike levels are configured for CALL_PUT orders",
                });
            }
            if (strikePrice === undefined || strikePrice === null) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Strike price is required for CALL_PUT orders",
                });
            }
            if (!strikeLevelId) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Strike level selection is required for CALL_PUT orders",
                });
            }
            selectedStrikeLevel = enabledStrikeLevels.find((l) => l.id === strikeLevelId) || null;
            if (!selectedStrikeLevel) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Invalid strike level selected. Please choose from available levels.",
                });
            }
            profitPercentage = selectedStrikeLevel.profitPercent;
        }
        const cumulativeAdjustment = calculateCumulativeProfitAdjustment(binarySettings, durationConfig.minutes, type);
        profitPercentage = profitPercentage + (profitPercentage * cumulativeAdjustment / 100);
        if (profitPercentage < 0 || profitPercentage > 1000) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Profit percentage must be between 0% and 1000%",
            });
        }
        const existingPendingOrders = await db_1.models.binaryOrder.count({
            where: {
                userId: userId,
                symbol: `${currency}/${pair}`,
                status: 'PENDING',
                closedAt: closeAtDate,
                amount: amount,
                side: side,
                type: type,
                createdAt: {
                    [sequelize_1.Op.gte]: new Date(Date.now() - ORDER_CONFIG.DUPLICATE_CHECK_WINDOW_MS),
                },
            },
        });
        if (existingPendingOrders > 0) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Duplicate order detected. Please wait before placing another identical order.",
            });
        }
        await (0, utils_1.ensureNotBanned)();
        return await db_1.sequelize.transaction(async (t) => {
            let wallet;
            if (!isDemo) {
                wallet = await db_1.models.wallet.findOne({
                    where: {
                        userId: userId,
                        currency: pair,
                        type: "SPOT",
                    },
                    transaction: t,
                    lock: t.LOCK.UPDATE,
                });
                if (!wallet) {
                    throw (0, error_1.createError)({
                        statusCode: 404,
                        message: `Wallet not found for currency ${pair}. Please ensure you have a ${pair} wallet.`
                    });
                }
                if (wallet.balance < amount) {
                    throw (0, error_1.createError)({
                        statusCode: 400,
                        message: "Insufficient balance",
                    });
                }
            }
            const exchange = await (0, utils_1.ensureExchange)();
            await (0, utils_1.ensureNotBanned)();
            let ticker;
            try {
                ticker = await exchange.fetchTicker(`${currency}/${pair}`);
            }
            catch (err) {
                console_1.logger.error("BINARY", `Error fetching market data for ${currency}/${pair}: ${err.message}`);
                throw (0, error_1.createError)({
                    statusCode: 500,
                    message: "Error fetching market data from exchange",
                });
            }
            const price = ticker === null || ticker === void 0 ? void 0 : ticker.last;
            if (!price || price <= 0 || isNaN(price) || !isFinite(price)) {
                throw (0, error_1.createError)({
                    statusCode: 500,
                    message: "Invalid price data from exchange. Please try again.",
                });
            }
            if (price < ORDER_CONFIG.MIN_PRICE_VALUE || price > ORDER_CONFIG.MAX_PRICE_VALUE) {
                throw (0, error_1.createError)({
                    statusCode: 500,
                    message: "Price data from exchange is outside acceptable range. Please contact support.",
                });
            }
            if (type === "CALL_PUT" && strikePrice !== undefined) {
                const minDifference = price * 0.0001;
                if (Math.abs(strikePrice - price) < minDifference) {
                    throw (0, error_1.createError)({
                        statusCode: 400,
                        message: "Strike price must be at least 0.01% away from current price to avoid guaranteed DRAW",
                    });
                }
                const maxDifference = price * 0.5;
                if (Math.abs(strikePrice - price) > maxDifference) {
                    throw (0, error_1.createError)({
                        statusCode: 400,
                        message: "Strike price must be within 50% of current price for risk management",
                    });
                }
            }
            const finalOrder = await db_1.models.binaryOrder.create({
                userId: userId,
                symbol: `${currency}/${pair}`,
                type: type,
                side: side,
                status: "PENDING",
                price: price,
                profit: 0,
                amount: amount,
                isDemo: isDemo,
                closedAt: closeAtDate,
                profitPercentage: profitPercentage,
                barrier: ["HIGHER_LOWER", "TOUCH_NO_TOUCH", "TURBO"].includes(type)
                    ? barrier
                    : undefined,
                strikePrice: type === "CALL_PUT" ? strikePrice : undefined,
                payoutPerPoint: type === "CALL_PUT" || type === "TURBO" ? payoutPerPoint : undefined,
                durationType: type === "TURBO" ? durationType : "TIME",
                metadata: idempotencyKey ? { idempotencyKey } : undefined,
            }, { transaction: t });
            if (!isDemo && wallet) {
                const debitIdempotencyKey = idempotencyKey
                    ? `binary_order_debit_${idempotencyKey}`
                    : `binary_order_debit_${userId}_${currency}_${pair}_${closedAt}`;
                await wallet_1.walletService.debit({
                    idempotencyKey: debitIdempotencyKey,
                    userId,
                    walletId: wallet.id,
                    walletType: "SPOT",
                    currency: pair,
                    amount,
                    operationType: "BINARY_ORDER",
                    referenceId: finalOrder.id,
                    description: `Binary ${type} order: ${currency}/${pair}`,
                    metadata: {
                        orderType: type,
                        currency,
                        pair,
                        side,
                        durationId,
                        orderId: finalOrder.id,
                    },
                    transaction: t,
                });
            }
            this.scheduleOrderProcessing(finalOrder, userId);
            return finalOrder;
        });
    }
    static async processOrder(userId, orderId, symbol) {
        const { redlock } = await Promise.resolve().then(() => __importStar(require("@b/utils/redis")));
        let lock;
        try {
            lock = await redlock.acquire([`binary:order:${orderId}`], ORDER_CONFIG.REDLOCK_TTL_MS);
        }
        catch (error) {
            console_1.logger.warn("BINARY", `Could not acquire lock for order ${orderId}. Another process is handling it.`);
            return;
        }
        try {
            await (0, utils_1.ensureNotBanned)();
            const exchange = await (0, utils_1.ensureExchange)();
            const ticker = await exchange.fetchTicker(symbol);
            const closePrice = ticker === null || ticker === void 0 ? void 0 : ticker.last;
            if (closePrice == null) {
                console_1.logger.error("BINARY", `No close price found for ${symbol}. Order: ${orderId}`);
                return;
            }
            await db_1.sequelize.transaction({
                isolationLevel: sequelize_1.Transaction.ISOLATION_LEVELS.REPEATABLE_READ
            }, async (t) => {
                const order = await db_1.models.binaryOrder.findOne({
                    where: {
                        id: orderId,
                        userId,
                        status: "PENDING"
                    },
                    transaction: t,
                    lock: t.LOCK.UPDATE
                });
                if (!order) {
                    console_1.logger.warn("BINARY", `Order ${orderId} already processed or not found. Skipping.`);
                    return;
                }
                let touched = false;
                if (order.type === "TOUCH_NO_TOUCH" &&
                    order.barrier != null &&
                    order.createdAt) {
                    touched = await this.checkIfBarrierTouched(exchange, order.symbol, order.createdAt, order.closedAt, order.barrier);
                }
                let turboBreached = false;
                if (order.type === "TURBO" &&
                    order.barrier != null &&
                    (order.side === "UP" || order.side === "DOWN") &&
                    order.createdAt) {
                    turboBreached = await this.checkTurboBarrierBreach(exchange, order.symbol, order.createdAt, order.closedAt, order.barrier, order.side);
                }
                const updateData = this.determineOrderStatus(order, closePrice, touched, turboBreached);
                await this.updateBinaryOrderWithTransaction(order.id, updateData, t);
                this.orderIntervals.delete(order.id);
            });
        }
        catch (error) {
            console_1.logger.error("BINARY", `Error processing order ${orderId}: ${error}`);
        }
        finally {
            if (lock) {
                try {
                    await lock.release();
                }
                catch (unlockError) {
                    console_1.logger.error("BINARY", `Error releasing lock for order ${orderId}: ${unlockError}`);
                }
            }
        }
    }
    static async checkTurboBarrierBreach(exchange, symbol, start, end, barrier, side) {
        const timeframe = "1m";
        const since = start.getTime();
        const until = end.getTime();
        let breached = false;
        let from = since;
        const limit = 1000;
        try {
            while (!breached && from < until) {
                const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, from, limit);
                if (!ohlcv || ohlcv.length === 0) {
                    console_1.logger.warn("BINARY", `No OHLCV data for ${symbol} between ${new Date(from)} and ${new Date(until)}. Assuming no more data.`);
                    break;
                }
                for (const candle of ohlcv) {
                    const [timestamp, , high, low] = candle;
                    if (side === "UP" && low < barrier) {
                        breached = true;
                        break;
                    }
                    else if (side === "DOWN" && high > barrier) {
                        breached = true;
                        break;
                    }
                    if (timestamp >= until) {
                        break;
                    }
                }
                const lastCandleTime = ohlcv[ohlcv.length - 1][0];
                if (lastCandleTime <= from) {
                    console_1.logger.warn("BINARY", "No progress in OHLCV time. Stopping fetch loop.");
                    break;
                }
                from = lastCandleTime + 60000;
            }
        }
        catch (err) {
            console_1.logger.error("BINARY", `Error fetching OHLC data for TURBO barrier check: ${err}`);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to check TURBO barrier: ${err}` });
        }
        return breached;
    }
    static async checkIfBarrierTouched(exchange, symbol, start, end, barrier) {
        const timeframe = "1m";
        const since = start.getTime();
        const until = end.getTime();
        let touched = false;
        let from = since;
        const limit = 1000;
        try {
            while (!touched && from < until) {
                const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, from, limit);
                if (!ohlcv || ohlcv.length === 0) {
                    console_1.logger.warn("BINARY", `No OHLCV data for ${symbol} between ${new Date(from)} and ${new Date(until)}.`);
                    break;
                }
                for (const candle of ohlcv) {
                    const [timestamp, , high, low] = candle;
                    if (high >= barrier && low <= barrier) {
                        touched = true;
                        break;
                    }
                    if (timestamp >= until)
                        break;
                }
                const lastCandleTime = ohlcv[ohlcv.length - 1][0];
                if (lastCandleTime <= from) {
                    console_1.logger.warn("BINARY", "No progress in OHLCV time. Stopping fetch loop.");
                    break;
                }
                from = lastCandleTime + 60000;
            }
        }
        catch (err) {
            console_1.logger.error("BINARY", `Error fetching OHLC data for TOUCH_NO_TOUCH barrier check: ${err}`);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to check barrier touch: ${err}` });
        }
        return touched;
    }
    static async cancelOrder(userId, orderId, percentage) {
        var _a, _b;
        const order = await (0, utils_1.getBinaryOrder)(userId, orderId);
        if (!order) {
            throw (0, error_1.createError)(404, "Order not found");
        }
        if (["CANCELED", "WIN", "LOSS", "DRAW"].includes(order.status)) {
            console_1.logger.error("BINARY", `Order ${orderId} is already ${order.status}. Cannot cancel again.`);
            return { message: "Order already processed or canceled." };
        }
        await (0, utils_1.ensureNotBanned)();
        const exchange = await (0, utils_1.ensureExchange)();
        const ticker = await exchange.fetchTicker(order.symbol);
        const currentPrice = ticker.last;
        if (!currentPrice) {
            throw (0, error_1.createError)(500, "Error fetching current price for the order symbol");
        }
        const binarySettings = await (0, binary_settings_cache_1.getBinarySettings)();
        if (!((_a = binarySettings.cancellation) === null || _a === void 0 ? void 0 : _a.enabled)) {
            throw (0, error_1.createError)(400, "Order cancellation is disabled");
        }
        const cancellationRule = (_b = binarySettings.cancellation.rules) === null || _b === void 0 ? void 0 : _b[order.type];
        if (!cancellationRule || !cancellationRule.enabled) {
            throw (0, error_1.createError)(400, `Cancellation is not available for ${order.type} orders`);
        }
        const now = Date.now();
        const expiryTime = new Date(order.closedAt).getTime();
        const timeUntilExpiry = expiryTime - now;
        const timeUntilExpirySeconds = timeUntilExpiry / 1000;
        const minTimeBeforeExpiry = cancellationRule.minTimeBeforeExpirySeconds * 1000;
        if (timeUntilExpiry <= minTimeBeforeExpiry) {
            throw (0, error_1.createError)(400, `Cannot cancel ${order.type} order within ${cancellationRule.minTimeBeforeExpirySeconds} seconds of expiry. Time remaining: ${Math.round(timeUntilExpirySeconds)} seconds`);
        }
        if (order.type === "TOUCH_NO_TOUCH" && order.barrier && order.createdAt) {
            try {
                const touched = await this.checkIfBarrierTouched(exchange, order.symbol, order.createdAt, new Date(), order.barrier);
                if (touched) {
                    throw (0, error_1.createError)(400, "Cannot cancel TOUCH_NO_TOUCH order: barrier has been touched");
                }
            }
            catch (error) {
                console_1.logger.warn("BINARY", `Could not check barrier touch status for order ${orderId}: ${error.message}`);
            }
        }
        if (order.type === "TURBO" && order.barrier && order.createdAt && (order.side === "UP" || order.side === "DOWN")) {
            if (order.durationType === "TICKS") {
                throw (0, error_1.createError)(400, "Cannot sell a TURBO contract with TICKS duration early.");
            }
            try {
                const breached = await this.checkTurboBarrierBreach(exchange, order.symbol, order.createdAt, new Date(), order.barrier, order.side);
                if (breached) {
                    throw (0, error_1.createError)(400, "Cannot cancel TURBO order: barrier has been breached");
                }
            }
            catch (error) {
                console_1.logger.warn("BINARY", `Could not check barrier breach status for order ${orderId}: ${error.message}`);
            }
        }
        let penaltyPercentage = cancellationRule.penaltyPercentage;
        if (cancellationRule.penaltyByTimeRemaining) {
            const graduated = cancellationRule.penaltyByTimeRemaining;
            if (timeUntilExpirySeconds > 60) {
                penaltyPercentage = graduated.above60Seconds;
            }
            else if (timeUntilExpirySeconds > 30) {
                penaltyPercentage = graduated.above30Seconds;
            }
            else {
                penaltyPercentage = graduated.below30Seconds;
            }
        }
        const finalPenaltyPercentage = percentage !== null && percentage !== void 0 ? percentage : penaltyPercentage;
        await this.processStandardCancel(order, currentPrice, finalPenaltyPercentage);
        return {
            message: "Order cancelled",
            penaltyApplied: finalPenaltyPercentage,
            refundPercentage: 100 - finalPenaltyPercentage
        };
    }
    static async processStandardCancel(order, currentPrice, percentage) {
        await db_1.sequelize.transaction(async (t) => {
            if (!order.isDemo) {
                let transactionRecord = await db_1.models.transaction.findOne({
                    where: { referenceId: order.id },
                    transaction: t,
                    lock: t.LOCK.UPDATE,
                });
                if (!transactionRecord) {
                    transactionRecord = await db_1.models.transaction.findOne({
                        where: {
                            userId: order.userId,
                            type: "BINARY",
                            status: "COMPLETED",
                            amount: order.amount,
                            [sequelize_1.Op.and]: db_1.sequelize.literal(`JSON_EXTRACT(metadata, '$.orderId') = '${order.id}'`),
                        },
                        transaction: t,
                        lock: t.LOCK.UPDATE,
                    });
                }
                let wallet;
                if (!transactionRecord) {
                    console_1.logger.warn("BINARY", `Transaction not found for cancelled order ${order.id}. Looking up wallet directly.`);
                    const [, quoteCurrency] = order.symbol.split("/");
                    wallet = await db_1.models.wallet.findOne({
                        where: {
                            userId: order.userId,
                            currency: quoteCurrency,
                            type: "SPOT",
                        },
                        transaction: t,
                        lock: t.LOCK.UPDATE,
                    });
                }
                else {
                    wallet = await db_1.models.wallet.findOne({
                        where: { id: transactionRecord.walletId },
                        transaction: t,
                        lock: t.LOCK.UPDATE,
                    });
                }
                if (!wallet) {
                    throw (0, error_1.createError)(404, "Wallet not found");
                }
                let partialReturn = order.amount;
                if (percentage !== undefined) {
                    const cutAmount = order.amount * (Math.abs(percentage) / 100);
                    partialReturn = order.amount - cutAmount;
                    if (partialReturn < 0)
                        partialReturn = 0;
                }
                if (partialReturn > 0) {
                    const idempotencyKey = `binary_cancel_${order.id}`;
                    await wallet_1.walletService.credit({
                        idempotencyKey,
                        userId: order.userId,
                        walletId: wallet.id,
                        walletType: "SPOT",
                        currency: wallet.currency,
                        amount: partialReturn,
                        operationType: "REFUND",
                        referenceId: order.id,
                        description: `Binary order cancelled - refund ${partialReturn} ${wallet.currency}`,
                        metadata: {
                            orderId: order.id,
                            refundPercentage: percentage || 100,
                            originalAmount: order.amount,
                        },
                        transaction: t,
                    });
                }
                if (transactionRecord) {
                    await db_1.models.transaction.update({
                        status: "CANCELLED",
                        metadata: JSON.stringify({
                            cancelledAt: Date.now(),
                            refundPercentage: percentage || 100,
                            refundAmount: partialReturn,
                            reason: "Order cancelled by user",
                        }),
                    }, {
                        where: { id: transactionRecord.id },
                        transaction: t,
                    });
                }
            }
            if (this.orderIntervals.has(order.id)) {
                clearTimeout(this.orderIntervals.get(order.id));
                this.orderIntervals.delete(order.id);
            }
            await db_1.models.binaryOrder.update({ status: "CANCELED", closePrice: currentPrice, profit: 0 }, { where: { id: order.id }, transaction: t });
        });
    }
    static async processPendingOrders(shouldBroadcast = true) {
        const cronName = "processPendingOrders";
        const { redlock } = await Promise.resolve().then(() => __importStar(require("@b/utils/redis")));
        try {
            const pendingOrders = await (0, utils_1.getBinaryOrdersByStatus)("PENDING");
            const currentTime = Date.now();
            const unmonitoredOrders = pendingOrders.filter((order) => {
                const closedAtTime = new Date(order.closedAt).getTime();
                return (closedAtTime <= currentTime && !this.orderIntervals.has(order.id));
            });
            const exchange = await (0, utils_1.ensureExchange)();
            const BATCH_SIZE = ORDER_CONFIG.BATCH_SIZE;
            const DELAY_BETWEEN_BATCHES = ORDER_CONFIG.DELAY_BETWEEN_BATCHES_MS;
            for (let i = 0; i < unmonitoredOrders.length; i += BATCH_SIZE) {
                const batch = unmonitoredOrders.slice(i, i + BATCH_SIZE);
                await Promise.all(batch.map(async (order) => {
                    let lock;
                    try {
                        lock = await redlock.acquire([`binary:order:${order.id}`], ORDER_CONFIG.REDLOCK_TTL_MS);
                    }
                    catch (lockError) {
                        if (shouldBroadcast) {
                            (0, broadcast_1.broadcastLog)(cronName, `Order ${order.id} is being processed by another instance. Skipping.`, "info");
                        }
                        return;
                    }
                    try {
                        if (order.status !== "PENDING") {
                            if (shouldBroadcast) {
                                (0, broadcast_1.broadcastLog)(cronName, `Order ${order.id} already processed as ${order.status}. Skipping.`, "error");
                            }
                            return;
                        }
                        const timeframe = "1m";
                        let closePrice;
                        try {
                            const expiryTimestamp = Number(order.closedAt);
                            const ohlcv = await exchange.fetchOHLCV(order.symbol, timeframe, expiryTimestamp - ORDER_CONFIG.CANDLE_LOOKBACK_MS, 3);
                            if (ohlcv && ohlcv.length > 0) {
                                const expiryCandle = ohlcv.find(candle => {
                                    const candleTime = candle[0];
                                    const candleCloseTime = candleTime + ORDER_CONFIG.MS_PER_MINUTE;
                                    return expiryTimestamp >= candleTime && expiryTimestamp < candleCloseTime;
                                });
                                if (expiryCandle) {
                                    closePrice = expiryCandle[4];
                                }
                                else {
                                    if (shouldBroadcast) {
                                        (0, broadcast_1.broadcastLog)(cronName, `No candle found containing expiry time for order ${order.id}. Using ticker.`, "warning");
                                    }
                                    const ticker = await exchange.fetchTicker(order.symbol);
                                    closePrice = ticker.last;
                                }
                            }
                            else {
                                if (shouldBroadcast) {
                                    (0, broadcast_1.broadcastLog)(cronName, `Not enough OHLCV data for order ${order.id} to determine closePrice. Using ticker.`, "warning");
                                }
                                const ticker = await exchange.fetchTicker(order.symbol);
                                closePrice = ticker.last;
                            }
                        }
                        catch (err) {
                            if (shouldBroadcast) {
                                (0, broadcast_1.broadcastLog)(cronName, `Error fetching OHLCV for pending order ${order.id}: ${err.message}`, "error");
                            }
                            const ticker = await exchange.fetchTicker(order.symbol);
                            closePrice = ticker.last;
                        }
                        if (closePrice === undefined) {
                            if (shouldBroadcast) {
                                (0, broadcast_1.broadcastLog)(cronName, `Unable to determine closePrice for order ${order.id}. Skipping.`, "error");
                            }
                            return;
                        }
                        const updateData = this.determineOrderStatus(order, closePrice);
                        await this.updateBinaryOrder(order.id, updateData);
                    }
                    finally {
                        if (lock) {
                            try {
                                await lock.release();
                            }
                            catch (unlockError) {
                                if (shouldBroadcast) {
                                    (0, broadcast_1.broadcastLog)(cronName, `Error releasing lock for order ${order.id}: ${unlockError}`, "error");
                                }
                            }
                        }
                    }
                }));
                if (i + BATCH_SIZE < unmonitoredOrders.length) {
                    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
                }
            }
        }
        catch (error) {
            if (shouldBroadcast) {
                (0, broadcast_1.broadcastLog)(cronName, `Error in processPendingOrders: ${error.message}`, "error");
            }
            throw error;
        }
    }
    static determineOrderStatus(order, closePrice, touched, turboBreached) {
        const updateData = {
            closePrice,
            profit: 0,
        };
        switch (order.type) {
            case "RISE_FALL":
                return determineRiseFallStatus(order, closePrice, updateData);
            case "HIGHER_LOWER":
                return determineHigherLowerStatus(order, closePrice, updateData);
            case "TOUCH_NO_TOUCH":
                return determineTouchNoTouchStatus(order, touched, updateData);
            case "CALL_PUT":
                return determineCallPutStatus(order, closePrice, updateData);
            case "TURBO":
                return determineTurboStatus(order, closePrice, turboBreached, updateData);
            default:
                updateData.status = "LOSS";
                return updateData;
        }
    }
    static async updateBinaryOrderWithTransaction(orderId, updateData, t) {
        const beforeOrder = await db_1.models.binaryOrder.findOne({
            where: { id: orderId },
            transaction: t,
        });
        if (beforeOrder && updateData.status) {
            console_1.logger.info("BINARY", `Order ${orderId} state transition: ${beforeOrder.status} -> ${updateData.status} | ` +
                `Entry Price: ${beforeOrder.price} | Close Price: ${updateData.closePrice || 'N/A'} | ` +
                `Profit: ${updateData.profit !== undefined ? updateData.profit : 'N/A'} | ` +
                `Type: ${beforeOrder.type} | Side: ${beforeOrder.side} | Amount: ${beforeOrder.amount}`);
        }
        await db_1.models.binaryOrder.update(updateData, {
            where: { id: orderId },
            transaction: t,
        });
        const order = (await db_1.models.binaryOrder.findOne({
            where: { id: orderId },
            transaction: t,
            lock: t.LOCK.UPDATE,
        }));
        if (!order)
            throw (0, error_1.createError)({ statusCode: 404, message: "Order not found after update" });
        if (!order.isDemo && ["WIN", "LOSS", "DRAW"].includes(order.status)) {
            let transactionRecord = await db_1.models.transaction.findOne({
                where: { referenceId: orderId },
                transaction: t,
            });
            if (!transactionRecord) {
                transactionRecord = await db_1.models.transaction.findOne({
                    where: {
                        userId: order.userId,
                        type: "BINARY",
                        status: "COMPLETED",
                        amount: order.amount,
                        [sequelize_1.Op.and]: db_1.sequelize.literal(`JSON_EXTRACT(metadata, '$.orderId') = '${orderId}'`),
                    },
                    transaction: t,
                });
            }
            let wallet;
            if (!transactionRecord) {
                console_1.logger.warn("BINARY", `Transaction not found for completed order ${orderId}. Looking up wallet directly.`);
                const [, quoteCurrency] = order.symbol.split("/");
                wallet = await db_1.models.wallet.findOne({
                    where: {
                        userId: order.userId,
                        currency: quoteCurrency,
                        type: "SPOT",
                    },
                    transaction: t,
                    lock: t.LOCK.UPDATE,
                });
            }
            else {
                await db_1.models.transaction.update({ status: "COMPLETED" }, { where: { id: transactionRecord.id }, transaction: t });
                wallet = await db_1.models.wallet.findOne({
                    where: { id: transactionRecord.walletId },
                    transaction: t,
                    lock: t.LOCK.UPDATE,
                });
            }
            if (!wallet)
                throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found to update balance" });
            let payoutAmount = 0;
            let operationType = "REFUND";
            if (order.status === "WIN") {
                payoutAmount = order.amount + order.profit;
                operationType = "BINARY_ORDER_WIN";
            }
            else if (order.status === "LOSS") {
                if (order.profit !== 0) {
                    payoutAmount = order.amount + order.profit;
                    if (payoutAmount > 0) {
                        operationType = "BINARY_ORDER_LOSS";
                    }
                }
            }
            else if (order.status === "DRAW") {
                payoutAmount = order.amount;
                operationType = "REFUND";
            }
            if (payoutAmount > 0) {
                const idempotencyKey = `binary_finalize_${orderId}_${order.status}`;
                console_1.logger.info("BINARY", `Crediting wallet for order ${orderId}: amount=${order.amount}, profit=${order.profit}, payout=${payoutAmount}, status=${order.status}`);
                try {
                    await wallet_1.walletService.credit({
                        idempotencyKey,
                        userId: order.userId,
                        walletId: wallet.id,
                        walletType: "SPOT",
                        currency: wallet.currency,
                        amount: payoutAmount,
                        operationType,
                        referenceId: `${orderId}_payout`,
                        description: `Binary order ${order.status}: ${order.symbol}`,
                        metadata: {
                            orderId,
                            orderStatus: order.status,
                            originalAmount: order.amount,
                            profit: order.profit,
                        },
                        transaction: t,
                    });
                    console_1.logger.info("BINARY", `Successfully credited ${payoutAmount} ${wallet.currency} for order ${orderId}`);
                }
                catch (creditError) {
                    console_1.logger.error("BINARY", `Failed to credit wallet for order ${orderId}: ${creditError.message}`, creditError);
                    throw creditError;
                }
            }
            else {
                console_1.logger.info("BINARY", `No payout for order ${orderId}: status=${order.status}, amount=${order.amount}, profit=${order.profit}`);
            }
            const updatedWallet = await db_1.models.wallet.findOne({
                where: { id: wallet.id },
                transaction: t,
            });
            await Websocket_1.messageBroker.broadcastToSubscribedClients("/api/finance/wallet", { type: "wallet", userId: order.userId, currency: wallet.currency }, {
                type: "BALANCE_UPDATED",
                currency: wallet.currency,
                balance: (updatedWallet === null || updatedWallet === void 0 ? void 0 : updatedWallet.balance) || wallet.balance,
                timestamp: Date.now(),
            });
        }
        if (["WIN", "LOSS", "DRAW"].includes(order.status)) {
            await Websocket_1.messageBroker.broadcastToSubscribedClients("/api/exchange/binary/order", { type: "order", symbol: order.symbol, userId: order.userId }, {
                type: "ORDER_COMPLETED",
                order,
            });
            const user = await db_1.models.user.findOne({
                where: { id: order.userId },
                transaction: t,
            });
            if (user) {
                try {
                    await (0, emails_1.sendBinaryOrderEmail)(user, order);
                    await (0, notifications_1.createNotification)({
                        userId: user.id,
                        relatedId: order.id,
                        title: "Binary Order Completed",
                        message: `Your binary order for ${order.symbol} has been completed with a status of ${order.status}`,
                        type: "system",
                        link: `/binary?symbol=${encodeURIComponent(order.symbol)}`,
                        actions: [
                            {
                                label: "View Trade",
                                link: `/binary?symbol=${encodeURIComponent(order.symbol)}`,
                                primary: true,
                            },
                        ],
                    });
                }
                catch (error) {
                    console_1.logger.error("BINARY", `Error sending binary order email for user ${user.id}, order ${order.id}: ${error}`);
                }
            }
        }
    }
    static async updateBinaryOrder(orderId, updateData) {
        await db_1.sequelize.transaction(async (t) => {
            await this.updateBinaryOrderWithTransaction(orderId, updateData, t);
        });
    }
    static async initializePendingOrders() {
        try {
            const pendingOrders = await db_1.models.binaryOrder.findAll({
                where: { status: 'PENDING' },
            });
            const now = Date.now();
            let processedCount = 0;
            let rescheduledCount = 0;
            for (const order of pendingOrders) {
                const closedAt = new Date(order.closedAt).getTime();
                if (closedAt <= now) {
                    await this.processOrder(order.userId, order.id, order.symbol);
                    processedCount++;
                }
                else {
                    this.scheduleOrderProcessing(order, order.userId);
                    rescheduledCount++;
                }
            }
            console_1.logger.info("BINARY", `Initialized pending orders: ${processedCount} processed immediately, ${rescheduledCount} rescheduled`);
        }
        catch (error) {
            console_1.logger.error("BINARY", `Failed to initialize pending orders: ${error.message}`);
        }
    }
    static scheduleOrderProcessing(order, userId) {
        const currentTimeUtc = Date.now();
        const closedAt = order.closedAt.getTime();
        const delay = closedAt - currentTimeUtc;
        if (delay < 0) {
            console_1.logger.warn("BINARY", `Order ${order.id} closedAt is in the past. Processing immediately.`);
            this.processOrder(userId, order.id, order.symbol);
            return;
        }
        const timer = setTimeout(() => {
            this.processOrder(userId, order.id, order.symbol);
        }, delay);
        this.orderIntervals.set(order.id, timer);
    }
}
exports.BinaryOrderService = BinaryOrderService;
BinaryOrderService.orderIntervals = new Map();
function applyFinalPayout(order, balance) {
    switch (order.status) {
        case "WIN":
            return balance + order.amount + order.profit;
        case "LOSS":
            if (order.profit === 0) {
                return balance;
            }
            else {
                return balance + order.amount + order.profit;
            }
        case "DRAW":
            return balance + order.amount;
        default:
            return balance;
    }
}
function determineRiseFallStatus(order, closePrice, updateData) {
    const profitPercentage = order.profitPercentage || 85;
    if (order.side === "RISE") {
        if (closePrice > order.price) {
            updateData.status = "WIN";
            updateData.profit = order.amount * (profitPercentage / 100);
        }
        else if (closePrice === order.price) {
            updateData.status = "DRAW";
        }
        else {
            updateData.status = "LOSS";
            updateData.profit = 0;
        }
    }
    else {
        if (closePrice < order.price) {
            updateData.status = "WIN";
            updateData.profit = order.amount * (profitPercentage / 100);
        }
        else if (closePrice === order.price) {
            updateData.status = "DRAW";
        }
        else {
            updateData.status = "LOSS";
            updateData.profit = 0;
        }
    }
    return updateData;
}
function determineHigherLowerStatus(order, closePrice, updateData) {
    const profitPercentage = order.profitPercentage || 85;
    const hlBarrier = order.barrier;
    if (order.side === "HIGHER") {
        if (closePrice > hlBarrier) {
            updateData.status = "WIN";
            updateData.profit = order.amount * (profitPercentage / 100);
        }
        else if (closePrice === hlBarrier) {
            updateData.status = "DRAW";
        }
        else {
            updateData.status = "LOSS";
            updateData.profit = 0;
        }
    }
    else {
        if (closePrice < hlBarrier) {
            updateData.status = "WIN";
            updateData.profit = order.amount * (profitPercentage / 100);
        }
        else if (closePrice === hlBarrier) {
            updateData.status = "DRAW";
        }
        else {
            updateData.status = "LOSS";
            updateData.profit = 0;
        }
    }
    return updateData;
}
function determineTouchNoTouchStatus(order, touched, updateData) {
    const profitPercentage = order.profitPercentage || 85;
    if (order.side === "TOUCH") {
        if (touched) {
            updateData.status = "WIN";
            updateData.profit = order.amount * (profitPercentage / 100);
        }
        else {
            updateData.status = "LOSS";
            updateData.profit = 0;
        }
    }
    else {
        if (!touched) {
            updateData.status = "WIN";
            updateData.profit = order.amount * (profitPercentage / 100);
        }
        else {
            updateData.status = "LOSS";
            updateData.profit = 0;
        }
    }
    return updateData;
}
function determineCallPutStatus(order, closePrice, updateData) {
    const profitPercentage = order.profitPercentage || 85;
    const { strikePrice } = order;
    if (!strikePrice) {
        console_1.logger.error("BINARY", `CALL_PUT order ${order.id} missing strikePrice. Defaulting to LOSS.`);
        updateData.status = "LOSS";
        updateData.profit = 0;
        return updateData;
    }
    if (order.side === "CALL") {
        if (closePrice > strikePrice) {
            updateData.status = "WIN";
            updateData.profit = order.amount * (profitPercentage / 100);
        }
        else if (closePrice === strikePrice) {
            updateData.status = "DRAW";
        }
        else {
            updateData.status = "LOSS";
            updateData.profit = 0;
        }
    }
    else {
        if (closePrice < strikePrice) {
            updateData.status = "WIN";
            updateData.profit = order.amount * (profitPercentage / 100);
        }
        else if (closePrice === strikePrice) {
            updateData.status = "DRAW";
        }
        else {
            updateData.status = "LOSS";
            updateData.profit = 0;
        }
    }
    return updateData;
}
function determineTurboStatus(order, closePrice, turboBreached, updateData) {
    const { barrier, payoutPerPoint } = order;
    if (!barrier || !payoutPerPoint) {
        console_1.logger.error("BINARY", `TURBO order ${order.id} missing barrier or payoutPerPoint. Defaulting to LOSS.`);
        updateData.status = "LOSS";
        updateData.profit = -order.amount;
        return updateData;
    }
    if (turboBreached) {
        updateData.status = "LOSS";
        updateData.profit = -order.amount;
        return updateData;
    }
    let payoutValue = 0;
    if (order.side === "UP") {
        if (closePrice > barrier) {
            payoutValue = (closePrice - barrier) * payoutPerPoint;
            if (payoutValue > order.amount) {
                updateData.status = "WIN";
                updateData.profit = payoutValue - order.amount;
            }
            else if (payoutValue === order.amount) {
                updateData.status = "DRAW";
            }
            else {
                updateData.status = "LOSS";
                updateData.profit = payoutValue - order.amount;
            }
        }
        else if (closePrice === barrier) {
            updateData.status = "DRAW";
        }
        else {
            updateData.status = "LOSS";
            updateData.profit = -order.amount;
        }
    }
    else {
        if (closePrice < barrier) {
            payoutValue = (barrier - closePrice) * payoutPerPoint;
            if (payoutValue > order.amount) {
                updateData.status = "WIN";
                updateData.profit = payoutValue - order.amount;
            }
            else if (payoutValue === order.amount) {
                updateData.status = "DRAW";
            }
            else {
                updateData.status = "LOSS";
                updateData.profit = payoutValue - order.amount;
            }
        }
        else if (closePrice === barrier) {
            updateData.status = "DRAW";
        }
        else {
            updateData.status = "LOSS";
            updateData.profit = -order.amount;
        }
    }
    return updateData;
}
function validateIsPositiveNumber(value, fieldName, errors) {
    if (typeof value !== "number" || isNaN(value) || value <= 0) {
        errors.push(`${fieldName} is required and must be a positive number`);
    }
}
function validateNumberInRange(value, fieldName, min, max, errors) {
    if (typeof value !== "number" || isNaN(value) || value < min || value > max) {
        errors.push(`${fieldName} must be between ${min} and ${max}`);
    }
}
function validateAllowedValues(value, allowedValues, fieldName, errors) {
    if (!allowedValues.includes(value)) {
        errors.push(`Invalid ${fieldName}: ${value}`);
    }
}
const typeConfig = {
    RISE_FALL: { validSides: ["RISE", "FALL"] },
    HIGHER_LOWER: {
        validSides: ["HIGHER", "LOWER"],
        requiresBarrier: true,
    },
    TOUCH_NO_TOUCH: {
        validSides: ["TOUCH", "NO_TOUCH"],
        requiresBarrier: true,
    },
    CALL_PUT: {
        validSides: ["CALL", "PUT"],
        requiresStrikePrice: true,
        requiresPayoutPerPoint: true,
    },
    TURBO: {
        validSides: ["UP", "DOWN"],
        requiresBarrier: true,
        requiresPayoutPerPoint: true,
        requiresDurationType: ["TIME", "TICKS"],
    },
};
function validateCreateOrderInput(params) {
    const { side, type, barrier, strikePrice, payoutPerPoint, durationType } = params;
    const errors = [];
    if (!(type in typeConfig)) {
        throw (0, error_1.createError)({ statusCode: 400, message: `Invalid type: ${type}` });
    }
    const config = typeConfig[type];
    validateAllowedValues(side, config.validSides, "side", errors);
    if (config.requiresBarrier) {
        validateIsPositiveNumber(barrier, "barrier", errors);
    }
    if (config.requiresStrikePrice) {
        validateIsPositiveNumber(strikePrice, "strikePrice", errors);
    }
    if (config.requiresPayoutPerPoint) {
        validateNumberInRange(payoutPerPoint, "payoutPerPoint", 0.01, 1000, errors);
    }
    if (config.requiresDurationType) {
        if (!durationType) {
            errors.push("durationType is required");
        }
        else {
            validateAllowedValues(durationType, config.requiresDurationType, "durationType", errors);
        }
    }
    else {
        if (durationType && durationType !== "TIME") {
            errors.push(`durationType "${durationType}" is not valid for ${type} orders. Only TURBO orders support TICKS duration type.`);
        }
    }
    if (errors.length > 0) {
        const errorMessage = errors.join(", ");
        throw (0, error_1.createError)({ statusCode: 400, message: errorMessage });
    }
}
