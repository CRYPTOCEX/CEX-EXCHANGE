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
const marketSource_1 = require("./marketSource");
const broadcast_1 = require("@b/cron/broadcast");
const console_1 = require("@b/utils/console");
const binary_settings_cache_1 = require("@b/utils/binary-settings-cache");
const rust_owns_1 = require("@b/utils/rust-owns");
const wallet_1 = require("@b/services/wallet");
const fees_1 = require("@b/utils/fees");
const settlement_math_1 = require("./settlement-math");
const safe_imports_1 = require("@b/utils/safe-imports");
const ORDER_CONFIG = {
    DUPLICATE_CHECK_WINDOW_MS: 5000,
    REDLOCK_TTL_MS: 60000,
    MIN_PRICE_VALUE: 0.00000001,
    MAX_PRICE_VALUE: 1000000000,
    DEFAULT_MIN_AMOUNT: 1,
    DEFAULT_MAX_AMOUNT: 100000,
    MS_PER_MINUTE: 60000,
    CANDLE_LOOKBACK_MS: 120000,
    MONITORED_GRACE_MS: 120000,
    BATCH_SIZE: 10,
    DELAY_BETWEEN_BATCHES_MS: 1000,
    IDEMPOTENCY_CLAIM_TTL_MS: 15000,
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
function resolveOrderWalletType(order) {
    try {
        const raw = order === null || order === void 0 ? void 0 : order.metadata;
        const meta = typeof raw === "string" ? JSON.parse(raw) : raw;
        return (meta === null || meta === void 0 ? void 0 : meta.walletType) === "COPY_TRADING" ? "COPY_TRADING" : "SPOT";
    }
    catch (_a) {
        return "SPOT";
    }
}
class BinaryOrderService {
    static findByIdempotencyKey(userId, idempotencyKey) {
        return db_1.models.binaryOrder.findOne({
            where: {
                userId,
                metadata: {
                    idempotencyKey: idempotencyKey,
                },
            },
        });
    }
    static async createOrder(params) {
        const { userId, idempotencyKey } = params;
        if (!idempotencyKey)
            return this.createOrderClaimed(params);
        const { redlock } = await Promise.resolve().then(() => __importStar(require("@b/utils/redis")));
        const claimKey = `binary:order:idem:${userId}:${idempotencyKey}`;
        let claim;
        try {
            claim = await redlock.acquire([claimKey], ORDER_CONFIG.IDEMPOTENCY_CLAIM_TTL_MS);
        }
        catch (_a) {
            const existing = await this.findByIdempotencyKey(userId, idempotencyKey);
            if (existing)
                return existing;
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "An order with this idempotency-key is still being processed. Retry in a moment.",
            });
        }
        try {
            return await this.createOrderClaimed(params);
        }
        finally {
            try {
                await claim.release();
            }
            catch (unlockError) {
                console_1.logger.error("BINARY", `Error releasing idempotency claim ${claimKey}: ${unlockError}`);
            }
        }
    }
    static async createOrderClaimed({ userId, currency, pair, amount, side, type, durationId, durationType = "TIME", barrier, barrierLevelId, strikePrice, strikeLevelId, payoutPerPoint, closedAt, isDemo, idempotencyKey, walletType = "SPOT", replication, }) {
        var _a, _b, _c;
        validateCreateOrderInput({
            side,
            type,
            barrier,
            strikePrice,
            payoutPerPoint,
            durationType,
        });
        if (idempotencyKey) {
            const existingOrder = await this.findByIdempotencyKey(userId, idempotencyKey);
            if (existingOrder) {
                console_1.logger.info("BINARY", `Idempotent request detected for user ${userId} with key ${idempotencyKey}. Returning existing order ${existingOrder.id}`);
                return existingOrder;
            }
        }
        const resolvedMarket = await (0, marketSource_1.resolveBinaryMarket)(currency, pair);
        const minAmount = resolvedMarket.minAmount;
        const maxAmount = resolvedMarket.maxAmount;
        if (resolvedMarket.source === "ECOSYSTEM" &&
            (type === "TOUCH_NO_TOUCH" || type === "TURBO")) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `${type} orders are not available on ecosystem markets`,
            });
        }
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
        if (!isDemo) {
            const exposureLimit = await (0, safe_imports_1.getBinaryAiMaxOrderExposure)(`${currency}/${pair}`);
            if (exposureLimit != null && amount > exposureLimit) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Amount exceeds the maximum single-order exposure of ${exposureLimit} ${pair} for this market`,
                });
            }
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
        let durationConfig = replication
            ? undefined
            : binarySettings.durations.find(d => d.id === durationId);
        if (!replication) {
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
            const durationOverride = (_a = durationConfig.orderTypeOverrides) === null || _a === void 0 ? void 0 : _a[type];
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
            if (!isAlignedToBoundary) {
                const examples = Array.from({ length: Math.min(4, Math.floor(60 / durationMinutes)) }, (_, i) => `:${String(i * durationMinutes).padStart(2, "0")}:00`).join(", ");
                const problem = closeAtMinutes % durationMinutes !== 0
                    ? `the minute (:${String(closeAtMinutes).padStart(2, "0")}) is not a multiple of ${durationMinutes}`
                    : `the seconds (:${String(closeAtSeconds).padStart(2, "0")}) must be within 5 of the minute`;
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `closedAt must land on a ${durationMinutes}-minute boundary — ${problem}. ` +
                        `Valid times look like ${examples}${durationMinutes < 15 ? ", …" : ""}`,
                });
            }
        }
        const timeUntilExpiry = closeAtDate.getTime() - now;
        const minimumTimeBeforeExpiry = binarySettings.global.orderExpirationBuffer * 1000;
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
        if (replication) {
            profitPercentage = replication.profitPercentage;
        }
        if (!replication && (type === "HIGHER_LOWER" || type === "TOUCH_NO_TOUCH" || type === "TURBO")) {
            const barrierConfig = orderTypeConfig;
            const enabledBarrierLevels = ((_b = barrierConfig.barrierLevels) === null || _b === void 0 ? void 0 : _b.filter(l => l.enabled)) || [];
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
                if (durationConfig && durationConfig.minutes > turboMaxDuration) {
                    throw (0, error_1.createError)({
                        statusCode: 400,
                        message: `TURBO orders cannot exceed ${turboMaxDuration} minute duration`,
                    });
                }
            }
        }
        if (!replication && type === "CALL_PUT") {
            const callPutConfig = orderTypeConfig;
            const enabledStrikeLevels = ((_c = callPutConfig.strikeLevels) === null || _c === void 0 ? void 0 : _c.filter((l) => l.enabled)) || [];
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
        if (!replication && durationConfig) {
            const cumulativeAdjustment = calculateCumulativeProfitAdjustment(binarySettings, durationConfig.minutes, type);
            profitPercentage = profitPercentage + (profitPercentage * cumulativeAdjustment / 100);
        }
        if (!Number.isFinite(profitPercentage) ||
            profitPercentage < 0 ||
            profitPercentage > 1000) {
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
        if (!isDemo && !replication) {
            const { maxConcurrentOrders, maxDailyOrders, cooldownSeconds } = binarySettings.global;
            if (maxConcurrentOrders > 0) {
                const concurrentCount = await db_1.models.binaryOrder.count({
                    where: {
                        userId,
                        isDemo: false,
                        status: "PENDING",
                    },
                });
                if (concurrentCount >= maxConcurrentOrders) {
                    throw (0, error_1.createError)({
                        statusCode: 429,
                        message: `You have reached the maximum of ${maxConcurrentOrders} concurrent open orders.`,
                    });
                }
            }
            if (maxDailyOrders > 0) {
                const dailyCount = await db_1.models.binaryOrder.count({
                    where: {
                        userId,
                        isDemo: false,
                        createdAt: {
                            [sequelize_1.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000),
                        },
                    },
                });
                if (dailyCount >= maxDailyOrders) {
                    throw (0, error_1.createError)({
                        statusCode: 429,
                        message: `You have reached the daily limit of ${maxDailyOrders} orders. Please try again later.`,
                    });
                }
            }
            if (cooldownSeconds > 0) {
                const lastOrder = await db_1.models.binaryOrder.findOne({
                    where: {
                        userId,
                        isDemo: false,
                    },
                    order: [["createdAt", "DESC"]],
                });
                if (lastOrder === null || lastOrder === void 0 ? void 0 : lastOrder.createdAt) {
                    const elapsedMs = Date.now() - new Date(lastOrder.createdAt).getTime();
                    const cooldownMs = cooldownSeconds * 1000;
                    if (elapsedMs < cooldownMs) {
                        const remaining = Math.ceil((cooldownMs - elapsedMs) / 1000);
                        throw (0, error_1.createError)({
                            statusCode: 429,
                            message: `Please wait ${remaining} second(s) before placing another order.`,
                        });
                    }
                }
            }
        }
        await (0, utils_1.ensureNotBanned)();
        let price;
        try {
            price = await (0, marketSource_1.getBinaryMarketPrice)(currency, pair, resolvedMarket.source);
        }
        catch (err) {
            if (err === null || err === void 0 ? void 0 : err.statusCode)
                throw err;
            console_1.logger.error("BINARY", `Error fetching market data for ${currency}/${pair}: ${err.message}`);
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Error fetching market data from exchange",
            });
        }
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
        return await db_1.sequelize.transaction(async (t) => {
            let wallet;
            if (!isDemo) {
                wallet = await db_1.models.wallet.findOne({
                    where: {
                        userId: userId,
                        currency: pair,
                        type: walletType,
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
                metadata: idempotencyKey || walletType !== "SPOT" || replication
                    ? {
                        ...(idempotencyKey ? { idempotencyKey } : {}),
                        ...(walletType !== "SPOT" ? { walletType } : {}),
                        ...((replication === null || replication === void 0 ? void 0 : replication.copiedFromOrderId)
                            ? { copiedFromOrderId: replication.copiedFromOrderId }
                            : {}),
                    }
                    : undefined,
            }, { transaction: t });
            if (!isDemo && wallet) {
                const holdIdempotencyKey = `binary_order_${finalOrder.id}_hold`;
                await wallet_1.walletService.hold({
                    idempotencyKey: holdIdempotencyKey,
                    userId,
                    walletId: wallet.id,
                    walletType,
                    currency: pair,
                    amount,
                    operationType: "BINARY_ORDER",
                    description: `Binary ${type} order: ${currency}/${pair}`,
                    metadata: {
                        orderType: type,
                        currency,
                        pair,
                        side,
                        durationId,
                        orderId: finalOrder.id,
                        referenceId: finalOrder.id,
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
            const [currency, pair] = symbol.split("/");
            const { source } = await (0, marketSource_1.resolveBinaryMarket)(currency, pair);
            let exchange = null;
            if (source === "EXCHANGE") {
                await (0, utils_1.ensureNotBanned)();
                exchange = await (0, utils_1.ensureExchange)();
            }
            const expiryMs = await this.getOrderExpiryMs(orderId);
            let closePrice;
            try {
                closePrice =
                    expiryMs != null
                        ? await (0, marketSource_1.getBinarySettlementPrice)(currency, pair, expiryMs, source)
                        : await (0, marketSource_1.getBinaryMarketPrice)(currency, pair, source);
            }
            catch (priceError) {
                console_1.logger.error("BINARY", `No close price found for ${symbol} (${source}). Order: ${orderId}: ${priceError === null || priceError === void 0 ? void 0 : priceError.message}`);
                return;
            }
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
                    order.createdAt &&
                    exchange) {
                    touched = await this.checkIfBarrierTouched(exchange, order.symbol, order.createdAt, order.closedAt, order.barrier);
                }
                let turboBreached = false;
                if (order.type === "TURBO" &&
                    order.barrier != null &&
                    (order.side === "UP" || order.side === "DOWN") &&
                    order.createdAt &&
                    exchange) {
                    turboBreached = await this.checkTurboBarrierBreach(exchange, order.symbol, order.createdAt, order.closedAt, order.barrier, order.side);
                }
                const effectiveClosePrice = await (0, safe_imports_1.getBinaryAiSettlementPrice)(order, closePrice);
                const updateData = this.determineOrderStatus(order, effectiveClosePrice, touched, turboBreached);
                await this.updateBinaryOrderWithTransaction(order.id, updateData, t);
            });
        }
        catch (error) {
            console_1.logger.error("BINARY", `Error processing order ${orderId}: ${error}`);
        }
        finally {
            this.orderIntervals.delete(orderId);
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
    static async cancelOrder(userId, orderId) {
        var _a, _b;
        const order = await (0, utils_1.getBinaryOrder)(userId, orderId);
        if (!order) {
            throw (0, error_1.createError)(404, "Order not found");
        }
        if (["CANCELED", "WIN", "LOSS", "DRAW"].includes(order.status)) {
            console_1.logger.error("BINARY", `Order ${orderId} is already ${order.status}. Cannot cancel again.`);
            return { message: "Order already processed or canceled." };
        }
        const [cancelCurrency, cancelPair] = order.symbol.split("/");
        const { source: cancelSource } = await (0, marketSource_1.resolveBinaryMarket)(cancelCurrency, cancelPair);
        let cancelExchange = null;
        if (cancelSource === "EXCHANGE") {
            await (0, utils_1.ensureNotBanned)();
            cancelExchange = await (0, utils_1.ensureExchange)();
        }
        let currentPrice;
        try {
            currentPrice = await (0, marketSource_1.getBinaryMarketPrice)(cancelCurrency, cancelPair, cancelSource);
        }
        catch (err) {
            if (err === null || err === void 0 ? void 0 : err.statusCode)
                throw err;
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
        if (order.type === "TOUCH_NO_TOUCH" &&
            order.barrier &&
            order.createdAt &&
            cancelExchange) {
            try {
                const touched = await this.checkIfBarrierTouched(cancelExchange, order.symbol, order.createdAt, new Date(), order.barrier);
                if (touched) {
                    throw (0, error_1.createError)(400, "Cannot cancel TOUCH_NO_TOUCH order: barrier has been touched");
                }
            }
            catch (error) {
                if (error === null || error === void 0 ? void 0 : error.statusCode)
                    throw error;
                console_1.logger.warn("BINARY", `Could not check barrier touch status for order ${orderId}: ${error.message}`);
            }
        }
        if (order.type === "TURBO" &&
            order.barrier &&
            order.createdAt &&
            (order.side === "UP" || order.side === "DOWN")) {
            if (order.durationType === "TICKS") {
                throw (0, error_1.createError)(400, "Cannot sell a TURBO contract with TICKS duration early.");
            }
            try {
                const breached = cancelExchange
                    ? await this.checkTurboBarrierBreach(cancelExchange, order.symbol, order.createdAt, new Date(), order.barrier, order.side)
                    : false;
                if (breached) {
                    throw (0, error_1.createError)(400, "Cannot cancel TURBO order: barrier has been breached");
                }
            }
            catch (error) {
                if (error === null || error === void 0 ? void 0 : error.statusCode)
                    throw error;
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
        const finalPenaltyPercentage = penaltyPercentage;
        const { redlock } = await Promise.resolve().then(() => __importStar(require("@b/utils/redis")));
        let lock;
        try {
            lock = await redlock.acquire([`binary:order:${orderId}`], ORDER_CONFIG.REDLOCK_TTL_MS);
        }
        catch (lockError) {
            throw (0, error_1.createError)(409, "Order is currently being processed. Please try again.");
        }
        try {
            await this.processStandardCancel(order, currentPrice, finalPenaltyPercentage);
        }
        finally {
            try {
                await lock.release();
            }
            catch (unlockError) {
                console_1.logger.error("BINARY", `Error releasing lock for order ${orderId}: ${unlockError}`);
            }
        }
        return {
            message: "Order cancelled",
            penaltyApplied: finalPenaltyPercentage,
            refundPercentage: 100 - finalPenaltyPercentage
        };
    }
    static async processStandardCancel(order, currentPrice, percentage) {
        const orderWalletType = resolveOrderWalletType(order);
        let refundedForHook = Number(order.amount) || 0;
        await db_1.sequelize.transaction(async (t) => {
            var _a;
            const locked = await db_1.models.binaryOrder.findOne({
                where: { id: order.id, userId: order.userId, status: "PENDING" },
                transaction: t,
                lock: t.LOCK.UPDATE,
            });
            if (!locked) {
                throw (0, error_1.createError)(409, "Order is no longer pending");
            }
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
                            type: "BINARY_ORDER",
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
                            type: orderWalletType,
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
                const { partialReturn, penalty } = (0, settlement_math_1.resolveBinaryCancelSplit)(order.amount, percentage);
                refundedForHook = partialReturn;
                const stakeHeld = Number((_a = wallet.inOrder) !== null && _a !== void 0 ? _a : 0) >= Number(order.amount);
                if (stakeHeld) {
                    if (partialReturn > 0) {
                        await wallet_1.walletService.release({
                            idempotencyKey: `binary_cancel_${order.id}_release`,
                            userId: order.userId,
                            walletId: wallet.id,
                            walletType: orderWalletType,
                            currency: wallet.currency,
                            amount: partialReturn,
                            operationType: "RELEASE",
                            description: `Binary order cancelled - release ${partialReturn} ${wallet.currency}`,
                            metadata: {
                                orderId: order.id,
                                refundPercentage: percentage !== undefined ? 100 - Math.abs(percentage) : 100,
                                originalAmount: order.amount,
                            },
                            transaction: t,
                        });
                    }
                    if (penalty > 0) {
                        await wallet_1.walletService.executeFromHold({
                            idempotencyKey: `binary_cancel_${order.id}_penalty`,
                            userId: order.userId,
                            walletId: wallet.id,
                            walletType: orderWalletType,
                            currency: wallet.currency,
                            amount: penalty,
                            operationType: "BINARY_ORDER_LOSS",
                            referenceId: order.id,
                            description: `Binary order cancel penalty: ${penalty} ${wallet.currency}`,
                            metadata: {
                                orderId: order.id,
                                penaltyPercentage: percentage || 0,
                                originalAmount: order.amount,
                            },
                            transaction: t,
                        });
                    }
                }
                else if (partialReturn > 0) {
                    await wallet_1.walletService.credit({
                        idempotencyKey: `binary_cancel_${order.id}`,
                        userId: order.userId,
                        walletId: wallet.id,
                        walletType: orderWalletType,
                        currency: wallet.currency,
                        amount: partialReturn,
                        operationType: "REFUND",
                        referenceId: order.id,
                        description: `Binary order cancelled - refund ${partialReturn} ${wallet.currency}`,
                        metadata: {
                            orderId: order.id,
                            refundPercentage: percentage !== undefined ? 100 - Math.abs(percentage) : 100,
                            originalAmount: order.amount,
                        },
                        transaction: t,
                    });
                }
                if (penalty > 0) {
                    await (0, fees_1.collectPlatformFee)({
                        userId: order.userId,
                        currency: wallet.currency,
                        walletType: "SPOT",
                        feeAmount: penalty,
                        type: "BINARY_ORDER",
                        description: `Binary order cancel penalty: ${order.symbol} (${order.id})`,
                        referenceId: `${order.id}_cancel`,
                        metadata: {
                            orderId: order.id,
                            penaltyPercentage: percentage !== null && percentage !== void 0 ? percentage : 0,
                            originalAmount: order.amount,
                            refundedAmount: partialReturn,
                            stakeHeld,
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
            const existingMetadata = (() => {
                try {
                    const raw = order.metadata;
                    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
                    return parsed && typeof parsed === "object" ? parsed : {};
                }
                catch (_a) {
                    return {};
                }
            })();
            await db_1.models.binaryOrder.update({
                status: "CANCELED",
                closePrice: currentPrice,
                profit: 0,
                metadata: {
                    ...existingMetadata,
                    refundedAmount: refundedForHook,
                    cancelPenalty: Number(order.amount) - refundedForHook,
                },
            }, { where: { id: order.id }, transaction: t });
            if (!order.isDemo) {
                t.afterCommit(() => {
                    (0, safe_imports_1.triggerCopyTradingBinaryCanceled)(order.id, order.userId, refundedForHook).catch(() => {
                    });
                });
            }
        });
    }
    static async processPendingOrders(shouldBroadcast = true) {
        const cronName = "processPendingOrders";
        const { redlock } = await Promise.resolve().then(() => __importStar(require("@b/utils/redis")));
        try {
            const currentTime = Date.now();
            const pendingOrders = await db_1.models.binaryOrder.findAll({
                where: { status: "PENDING", closedAt: { [sequelize_1.Op.lte]: new Date(currentTime) } },
            });
            const unmonitoredOrders = pendingOrders.filter((order) => {
                const closedAtTime = new Date(order.closedAt).getTime();
                if (closedAtTime > currentTime)
                    return false;
                if (currentTime - closedAtTime > ORDER_CONFIG.MONITORED_GRACE_MS) {
                    return true;
                }
                return !this.orderIntervals.has(order.id);
            });
            if (unmonitoredOrders.length === 0) {
                return;
            }
            const marketSources = new Map();
            for (const order of unmonitoredOrders) {
                if (marketSources.has(order.symbol))
                    continue;
                const [c, p] = order.symbol.split("/");
                try {
                    marketSources.set(order.symbol, (await (0, marketSource_1.resolveBinaryMarket)(c, p)).source);
                }
                catch (_a) {
                    marketSources.set(order.symbol, "EXCHANGE");
                }
            }
            const needsExchange = [...marketSources.values()].some((v) => v === "EXCHANGE");
            const exchange = needsExchange ? await (0, utils_1.ensureExchange)() : null;
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
                        if (marketSources.get(order.symbol) === "ECOSYSTEM") {
                            const [c, p] = order.symbol.split("/");
                            try {
                                closePrice = await (0, marketSource_1.getBinarySettlementPrice)(c, p, new Date(order.closedAt).getTime(), "ECOSYSTEM");
                            }
                            catch (ecoError) {
                                if (shouldBroadcast) {
                                    (0, broadcast_1.broadcastLog)(cronName, `No ecosystem price for order ${order.id}: ${ecoError === null || ecoError === void 0 ? void 0 : ecoError.message}. Skipping.`, "error");
                                }
                                return;
                            }
                            const effectiveEcoClose = await (0, safe_imports_1.getBinaryAiSettlementPrice)(order, closePrice);
                            await this.updateBinaryOrder(order.id, this.determineOrderStatus(order, effectiveEcoClose));
                            return;
                        }
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
                        const isPathDependent = order.type === "TOUCH_NO_TOUCH" || order.type === "TURBO";
                        if (isPathDependent) {
                            if (shouldBroadcast) {
                                (0, broadcast_1.broadcastLog)(cronName, `Order ${order.id} is ${order.type}: its outcome depends on the price path, which this ` +
                                    `backstop never observed. Flagging for manual review rather than settling it blind.`, "warning");
                            }
                            console_1.logger.warn("BINARY", `Backstop refusing to settle path-dependent order ${order.id} (${order.type}): no barrier history available`);
                            await this.updateBinaryOrder(order.id, {
                                status: "ERROR",
                                closePrice,
                            });
                            return;
                        }
                        const effectiveClosePrice = await (0, safe_imports_1.getBinaryAiSettlementPrice)(order, closePrice);
                        const updateData = this.determineOrderStatus(order, effectiveClosePrice);
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
        var _a, _b, _c;
        const beforeOrder = await db_1.models.binaryOrder.findOne({
            where: { id: orderId, status: "PENDING" },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!beforeOrder) {
            console_1.logger.warn("BINARY", `Order ${orderId} is no longer PENDING. Skipping settlement.`);
            return;
        }
        if (updateData.status) {
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
        const orderWalletType = resolveOrderWalletType(order);
        if (!order.isDemo && ["WIN", "LOSS", "DRAW"].includes(order.status)) {
            let transactionRecord = await db_1.models.transaction.findOne({
                where: { referenceId: orderId },
                transaction: t,
            });
            if (!transactionRecord) {
                transactionRecord = await db_1.models.transaction.findOne({
                    where: {
                        userId: order.userId,
                        type: "BINARY_ORDER",
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
                        type: orderWalletType,
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
            const stakeHeld = Number((_a = wallet.inOrder) !== null && _a !== void 0 ? _a : 0) >= Number(order.amount);
            const profit = Number((_b = order.profit) !== null && _b !== void 0 ? _b : 0);
            const stakeAmount = Number(order.amount);
            const sharedReleaseParams = {
                userId: order.userId,
                walletId: wallet.id,
                walletType: orderWalletType,
                currency: wallet.currency,
            };
            const sharedCreditParams = {
                userId: order.userId,
                walletId: wallet.id,
                walletType: orderWalletType,
                currency: wallet.currency,
                referenceId: `${orderId}_payout`,
                description: `Binary order ${order.status}: ${order.symbol}`,
                metadata: {
                    orderId,
                    orderStatus: order.status,
                    originalAmount: order.amount,
                    profit: order.profit,
                },
            };
            const sharedExecuteParams = {
                userId: order.userId,
                walletId: wallet.id,
                walletType: orderWalletType,
                currency: wallet.currency,
                referenceId: `${orderId}_payout`,
                description: `Binary order ${order.status}: ${order.symbol}`,
                metadata: {
                    orderId,
                    orderStatus: order.status,
                    originalAmount: order.amount,
                    profit: order.profit,
                },
            };
            console_1.logger.info("BINARY", `Settling order ${orderId}: amount=${stakeAmount}, profit=${profit}, status=${order.status}, stakeHeld=${stakeHeld}, inOrder=${wallet.inOrder}`);
            try {
                if (order.status === "WIN") {
                    if (stakeHeld) {
                        await wallet_1.walletService.release({
                            idempotencyKey: `binary_finalize_${orderId}_WIN_release`,
                            ...sharedReleaseParams,
                            amount: stakeAmount,
                            operationType: "RELEASE",
                            description: `Binary order WIN release: ${order.symbol}`,
                            metadata: {
                                orderId,
                                orderStatus: order.status,
                                originalAmount: order.amount,
                                profit: order.profit,
                            },
                            transaction: t,
                        });
                        if (profit > 0) {
                            await wallet_1.walletService.credit({
                                idempotencyKey: `binary_finalize_${orderId}_WIN_credit`,
                                ...sharedCreditParams,
                                amount: profit,
                                operationType: "BINARY_ORDER_WIN",
                                transaction: t,
                            });
                        }
                    }
                    else {
                        await wallet_1.walletService.credit({
                            idempotencyKey: `binary_finalize_${orderId}_WIN`,
                            ...sharedCreditParams,
                            amount: stakeAmount + profit,
                            operationType: "BINARY_ORDER_WIN",
                            transaction: t,
                        });
                    }
                    if (profit > 0) {
                        await (0, fees_1.recordPlatformLoss)({
                            currency: wallet.currency,
                            walletType: "SPOT",
                            lossAmount: profit,
                            type: "BINARY_ORDER",
                            description: `Binary order WIN payout: ${order.symbol} (${orderId})`,
                            referenceId: orderId,
                            metadata: {
                                orderId,
                                orderStatus: order.status,
                                symbol: order.symbol,
                                stakeAmount,
                                profit,
                            },
                            transaction: t,
                        });
                    }
                }
                else if (order.status === "LOSS") {
                    const { payout, consumed } = (0, settlement_math_1.resolveBinaryLossSplit)(stakeAmount, profit);
                    if (profit !== 0) {
                        if (stakeHeld) {
                            if (payout > 0) {
                                await wallet_1.walletService.release({
                                    idempotencyKey: `binary_finalize_${orderId}_LOSS_release`,
                                    ...sharedReleaseParams,
                                    amount: payout,
                                    operationType: "RELEASE",
                                    description: `Binary order LOSS partial release: ${order.symbol}`,
                                    metadata: {
                                        orderId,
                                        orderStatus: order.status,
                                        originalAmount: order.amount,
                                        profit: order.profit,
                                    },
                                    transaction: t,
                                });
                            }
                            if (consumed > 0) {
                                await wallet_1.walletService.executeFromHold({
                                    idempotencyKey: `binary_finalize_${orderId}_LOSS_execute`,
                                    ...sharedExecuteParams,
                                    amount: consumed,
                                    operationType: "BINARY_ORDER_LOSS",
                                    transaction: t,
                                });
                            }
                        }
                        else {
                            if (payout > 0) {
                                await wallet_1.walletService.credit({
                                    idempotencyKey: `binary_finalize_${orderId}_LOSS`,
                                    ...sharedCreditParams,
                                    amount: payout,
                                    operationType: "BINARY_ORDER_LOSS",
                                    transaction: t,
                                });
                            }
                        }
                    }
                    else {
                        if (stakeHeld) {
                            await wallet_1.walletService.executeFromHold({
                                idempotencyKey: `binary_finalize_${orderId}_LOSS_execute`,
                                ...sharedExecuteParams,
                                amount: consumed,
                                operationType: "BINARY_ORDER_LOSS",
                                transaction: t,
                            });
                        }
                    }
                    if (consumed > 0) {
                        await (0, fees_1.collectPlatformFee)({
                            userId: order.userId,
                            currency: wallet.currency,
                            walletType: "SPOT",
                            feeAmount: consumed,
                            type: "BINARY_ORDER",
                            description: `Binary order LOSS house take: ${order.symbol} (${orderId})`,
                            referenceId: orderId,
                            metadata: {
                                orderId,
                                orderStatus: order.status,
                                symbol: order.symbol,
                                stakeAmount,
                                consumed,
                                stakeHeld,
                            },
                            transaction: t,
                        });
                    }
                }
                else if (order.status === "DRAW") {
                    if (stakeHeld) {
                        await wallet_1.walletService.release({
                            idempotencyKey: `binary_finalize_${orderId}_DRAW_release`,
                            ...sharedReleaseParams,
                            amount: stakeAmount,
                            operationType: "RELEASE",
                            description: `Binary order DRAW release: ${order.symbol}`,
                            metadata: {
                                orderId,
                                orderStatus: order.status,
                                originalAmount: order.amount,
                                profit: order.profit,
                            },
                            transaction: t,
                        });
                    }
                    else {
                        await wallet_1.walletService.credit({
                            idempotencyKey: `binary_finalize_${orderId}_DRAW`,
                            ...sharedCreditParams,
                            amount: stakeAmount,
                            operationType: "REFUND",
                            transaction: t,
                        });
                    }
                }
                console_1.logger.info("BINARY", `Successfully settled order ${orderId} (${order.status})`);
            }
            catch (settleError) {
                console_1.logger.error("BINARY", `Failed to settle wallet for order ${orderId}: ${settleError.message}`, settleError);
                throw settleError;
            }
            const updatedWallet = await db_1.models.wallet.findOne({
                where: { id: wallet.id },
                transaction: t,
            });
            const settledWallet = wallet;
            const settledBalance = (_c = updatedWallet === null || updatedWallet === void 0 ? void 0 : updatedWallet.balance) !== null && _c !== void 0 ? _c : wallet.balance;
            t.afterCommit(() => {
                Websocket_1.messageBroker.broadcastToSubscribedClients("/api/exchange/binary/order", {
                    type: "balance",
                    userId: order.userId,
                    currency: settledWallet.currency,
                }, {
                    type: "BALANCE_UPDATED",
                    currency: settledWallet.currency,
                    balance: settledBalance,
                    timestamp: Date.now(),
                });
            });
        }
        if (!order.isDemo && ["WIN", "LOSS", "DRAW"].includes(order.status)) {
            const settledOrder = order;
            t.afterCommit(() => {
                (0, safe_imports_1.triggerCopyTradingBinarySettled)(settledOrder.id, settledOrder.status, Number(settledOrder.profit || 0), settledOrder.closePrice != null
                    ? Number(settledOrder.closePrice)
                    : undefined).catch(() => {
                });
            });
        }
        if (["WIN", "LOSS", "DRAW"].includes(order.status)) {
            const settledOrder = order;
            t.afterCommit(() => {
                (0, safe_imports_1.triggerBinaryAiReconcile)(settledOrder).catch(() => {
                });
            });
        }
        if (["WIN", "LOSS", "DRAW"].includes(order.status)) {
            const settledOrder = order;
            t.afterCommit(() => {
                Websocket_1.messageBroker.broadcastToSubscribedClients("/api/exchange/binary/order", {
                    type: "order",
                    symbol: settledOrder.symbol,
                    userId: settledOrder.userId,
                }, {
                    type: "ORDER_COMPLETED",
                    order: settledOrder,
                });
                (async () => {
                    const user = await db_1.models.user.findOne({
                        where: { id: settledOrder.userId },
                    });
                    if (!user)
                        return;
                    await (0, emails_1.sendBinaryOrderEmail)(user, settledOrder);
                    await (0, notifications_1.createNotification)({
                        userId: user.id,
                        relatedId: settledOrder.id,
                        title: "Binary Order Completed",
                        message: `Your binary order for ${settledOrder.symbol} has been completed with a status of ${settledOrder.status}`,
                        type: "system",
                        link: `/binary?symbol=${encodeURIComponent(settledOrder.symbol)}`,
                        actions: [
                            {
                                label: "View Trade",
                                link: `/binary?symbol=${encodeURIComponent(settledOrder.symbol)}`,
                                primary: true,
                            },
                        ],
                    });
                })().catch((error) => {
                    console_1.logger.error("BINARY", `Error sending binary order email for user ${settledOrder.userId}, order ${settledOrder.id}: ${error}`);
                });
            });
        }
    }
    static async updateBinaryOrder(orderId, updateData) {
        await db_1.sequelize.transaction(async (t) => {
            await this.updateBinaryOrderWithTransaction(orderId, updateData, t);
        });
    }
    static async initializePendingOrders() {
        if ((0, rust_owns_1.rustOwns)("binary.settlement")) {
            console_1.logger.info("BINARY", "RUST_OWNS binary.settlement — the Rust settler owns expiry; not sweeping or arming timers here");
            return;
        }
        try {
            const pendingOrders = await db_1.models.binaryOrder.findAll({
                where: { status: 'PENDING' },
            });
            const now = Date.now();
            let rescheduledCount = 0;
            const expired = [];
            for (const order of pendingOrders) {
                const closedAt = new Date(order.closedAt).getTime();
                if (closedAt <= now) {
                    expired.push(order);
                }
                else {
                    this.scheduleOrderProcessing(order, order.userId);
                    rescheduledCount++;
                }
            }
            const SETTLE_CONCURRENCY = 10;
            for (let i = 0; i < expired.length; i += SETTLE_CONCURRENCY) {
                const batch = expired.slice(i, i + SETTLE_CONCURRENCY);
                await Promise.all(batch.map((order) => this.processOrder(order.userId, order.id, order.symbol).catch((error) => { var _a; return console_1.logger.error("BINARY", `Startup settlement failed for order ${order.id}: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`); })));
            }
            console_1.logger.info("BINARY", `Initialized pending orders: ${expired.length} processed immediately, ${rescheduledCount} rescheduled`);
        }
        catch (error) {
            console_1.logger.error("BINARY", `Failed to initialize pending orders: ${error.message}`);
        }
    }
    static async getOrderExpiryMs(orderId) {
        try {
            const row = await db_1.models.binaryOrder.findOne({
                where: { id: orderId },
                attributes: ["closedAt"],
            });
            const ms = (row === null || row === void 0 ? void 0 : row.closedAt) ? new Date(row.closedAt).getTime() : NaN;
            return Number.isFinite(ms) ? ms : null;
        }
        catch (_a) {
            return null;
        }
    }
    static scheduleOrderProcessing(order, userId) {
        if ((0, rust_owns_1.rustOwns)("binary.settlement"))
            return;
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
const FALLBACK_PROFIT_PERCENTAGE = {
    RISE_FALL: 72,
    HIGHER_LOWER: 68,
    TOUCH_NO_TOUCH: 95,
    CALL_PUT: 72,
};
function resolveProfitPercentage(order) {
    var _a;
    const configured = Number(order.profitPercentage);
    if (Number.isFinite(configured) && configured >= 0)
        return configured;
    const fallback = (_a = FALLBACK_PROFIT_PERCENTAGE[order.type]) !== null && _a !== void 0 ? _a : 72;
    console_1.logger.warn("BINARY", `Order ${order.id} (${order.type}) has no profitPercentage; settling at the ${fallback}% default`);
    return fallback;
}
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
    const profitPercentage = resolveProfitPercentage(order);
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
    const profitPercentage = resolveProfitPercentage(order);
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
    const profitPercentage = resolveProfitPercentage(order);
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
    const profitPercentage = resolveProfitPercentage(order);
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
