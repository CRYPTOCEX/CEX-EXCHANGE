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
exports.metadata = void 0;
exports.default = handler;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/finance/wallet/utils");
const notifications_1 = require("@b/api/(ext)/p2p/utils/notifications");
const audit_1 = require("@b/api/(ext)/p2p/utils/audit");
const sequelize_1 = require("sequelize");
const json_parser_1 = require("@b/api/(ext)/p2p/utils/json-parser");
const safe_imports_1 = require("@b/utils/safe-imports");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
const redis_1 = require("@b/utils/redis");
exports.metadata = {
    summary: "Initiate Trade from P2P Offer",
    description: "Creates a new trade from an active P2P offer with proper validation and balance locking",
    operationId: "initiateP2PTrade",
    tags: ["P2P", "Trade"],
    requiresAuth: true,
    logModule: "P2P_TRADE",
    logTitle: "Initiate P2P trade",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "Offer ID",
            required: true,
            schema: { type: "string", format: "uuid" },
        },
    ],
    requestBody: {
        description: "Trade initiation details",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        amount: {
                            type: "number",
                            minimum: 0,
                            description: "Amount to trade"
                        },
                        paymentMethodId: {
                            type: "string",
                            format: "uuid",
                            description: "Selected payment method ID"
                        },
                        message: {
                            type: "string",
                            maxLength: 500,
                            description: "Optional initial message"
                        }
                    },
                    required: ["amount", "paymentMethodId"],
                },
            },
        },
    },
    responses: {
        200: { description: "Trade initiated successfully." },
        400: { description: "Bad Request - Invalid offer or amount." },
        401: { description: "Unauthorized." },
        404: { description: "Offer not found." },
        409: { description: "Conflict - Offer unavailable or insufficient balance." },
        500: { description: "Internal Server Error." },
    },
};
async function handler(data) {
    var _a, _b, _c, _d;
    const { id } = data.params || {};
    const { amount, paymentMethodId, message } = data.body;
    const { user, ctx } = data;
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Amount must be a positive finite number" });
    }
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding and locking offer");
    let transaction;
    let redis = null;
    let lockAcquired = false;
    try {
        redis = redis_1.RedisSingleton.getInstance();
        const lockKey = `p2p:initiate:${id}:lock`;
        lockAcquired = !!(await redis.set(lockKey, "1", "EX", 30, "NX"));
        if (!lockAcquired) {
            throw (0, error_1.createError)({ statusCode: 409, message: "Trade initiation already in progress for this offer. Please try again." });
        }
    }
    catch (lockError) {
        if (lockError.statusCode === 409)
            throw lockError;
        throw (0, error_1.createError)({ statusCode: 503, message: "Service temporarily unavailable. Please retry." });
    }
    try {
        transaction = await db_1.sequelize.transaction({
            isolationLevel: db_1.sequelize.constructor.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
        });
        const offer = await db_1.models.p2pOffer.findOne({
            where: {
                id,
                status: "ACTIVE",
                userId: { [sequelize_1.Op.ne]: user.id }
            },
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "email"],
                },
                {
                    model: db_1.models.p2pPaymentMethod,
                    as: "paymentMethods",
                    through: { attributes: [] },
                }
            ],
            lock: true,
            transaction,
        });
        if (!offer) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Offer not found or unavailable"
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating trade amount against offer limits");
        const amountConfig = (0, json_parser_1.parseAmountConfig)(offer.amountConfig);
        const priceConfig = (0, json_parser_1.parsePriceConfig)(offer.priceConfig);
        const { min, max, total } = amountConfig;
        const price = priceConfig.finalPrice;
        if (price <= 0) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: `Invalid offer configuration: price must be greater than 0`
            });
        }
        const fiatCurrency = await db_1.models.currency.findOne({
            where: { id: offer.currency, status: true },
            transaction
        });
        const isOfferFiatCurrency = !!fiatCurrency;
        let minAmount, maxAmount;
        if (isOfferFiatCurrency) {
            minAmount = min || 0;
            maxAmount = max || total || 0;
        }
        else {
            minAmount = (min || 0) / price;
            maxAmount = max ? (max / price) : total;
        }
        if (amount < minAmount || amount > maxAmount) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Amount must be between ${minAmount} and ${maxAmount} ${offer.currency}`
            });
        }
        if (total < amount) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: `Insufficient offer amount. Available: ${total} ${offer.currency}, Requested: ${amount} ${offer.currency}`
            });
        }
        const existingActiveTrade = await db_1.models.p2pTrade.findOne({
            where: {
                offerId: offer.id,
                [sequelize_1.Op.or]: [
                    { buyerId: user.id },
                    { sellerId: user.id },
                ],
                status: { [sequelize_1.Op.in]: ["PENDING", "PAYMENT_SENT"] },
            },
            transaction,
        });
        if (existingActiveTrade) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: `You already have an active trade on this offer (ID: ${existingActiveTrade.id.slice(0, 8)}...). Please complete or cancel it first.`
            });
        }
        const { parseUserRequirements } = await Promise.resolve().then(() => __importStar(require("../../utils/json-parser")));
        const userReqs = parseUserRequirements(offer.userRequirements);
        if (userReqs) {
            const tradingUserId = user.id;
            if (userReqs.minCompletedTrades) {
                const completedCount = await db_1.models.p2pTrade.count({
                    where: {
                        [sequelize_1.Op.or]: [{ buyerId: tradingUserId }, { sellerId: tradingUserId }],
                        status: "COMPLETED",
                    },
                    transaction,
                });
                if (completedCount < userReqs.minCompletedTrades) {
                    throw (0, error_1.createError)({
                        statusCode: 403,
                        message: `This offer requires at least ${userReqs.minCompletedTrades} completed trades. You have ${completedCount}.`
                    });
                }
            }
            if (userReqs.minSuccessRate) {
                const totalUserTrades = await db_1.models.p2pTrade.count({
                    where: {
                        [sequelize_1.Op.or]: [{ buyerId: tradingUserId }, { sellerId: tradingUserId }],
                        status: { [sequelize_1.Op.in]: ["COMPLETED", "CANCELLED", "EXPIRED"] },
                    },
                    transaction,
                });
                const completedUserTrades = await db_1.models.p2pTrade.count({
                    where: {
                        [sequelize_1.Op.or]: [{ buyerId: tradingUserId }, { sellerId: tradingUserId }],
                        status: "COMPLETED",
                    },
                    transaction,
                });
                const successRate = totalUserTrades > 0 ? (completedUserTrades / totalUserTrades) * 100 : 100;
                if (successRate < userReqs.minSuccessRate) {
                    throw (0, error_1.createError)({
                        statusCode: 403,
                        message: `This offer requires a minimum success rate of ${userReqs.minSuccessRate}%. Your rate is ${successRate.toFixed(1)}%.`
                    });
                }
            }
            if (userReqs.minAccountAge) {
                const tradingUser = await db_1.models.user.findByPk(tradingUserId, { attributes: ["createdAt"], transaction });
                if (tradingUser) {
                    const accountAgeDays = Math.floor((Date.now() - new Date((_a = tradingUser.createdAt) !== null && _a !== void 0 ? _a : 0).getTime()) / (1000 * 60 * 60 * 24));
                    if (accountAgeDays < userReqs.minAccountAge) {
                        throw (0, error_1.createError)({
                            statusCode: 403,
                            message: `This offer requires an account age of at least ${userReqs.minAccountAge} days. Your account is ${accountAgeDays} days old.`
                        });
                    }
                }
            }
        }
        const { validateMinimumTradeAmount } = await Promise.resolve().then(() => __importStar(require("../../utils/fees")));
        const minimumValidation = await validateMinimumTradeAmount(amount, offer.currency);
        if (!minimumValidation.valid) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: minimumValidation.message || `Amount below minimum for ${offer.currency}`,
            });
        }
        const { CacheManager } = await Promise.resolve().then(() => __importStar(require("@b/utils/cache")));
        const cacheManager = CacheManager.getInstance();
        const platformMinTradeAmount = await cacheManager.getSetting("p2pMinimumTradeAmount");
        const platformMaxTradeAmount = await cacheManager.getSetting("p2pMaximumTradeAmount");
        const tradeValueInPriceCurrency = isOfferFiatCurrency ? amount : amount * price;
        if (platformMinTradeAmount && tradeValueInPriceCurrency < platformMinTradeAmount) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Trade amount (${tradeValueInPriceCurrency.toFixed(2)} ${priceConfig.currency || 'USD'}) is below platform minimum of ${platformMinTradeAmount}`,
            });
        }
        if (platformMaxTradeAmount && tradeValueInPriceCurrency > platformMaxTradeAmount) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Trade amount (${tradeValueInPriceCurrency.toFixed(2)} ${priceConfig.currency || 'USD'}) exceeds platform maximum of ${platformMaxTradeAmount}`,
            });
        }
        const allowedPaymentMethodIds = (offer.paymentMethods || []).map((pm) => pm.id);
        if (!allowedPaymentMethodIds.includes(paymentMethodId)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Selected payment method not allowed for this offer"
            });
        }
        const selectedPaymentMethod = await db_1.models.p2pPaymentMethod.findOne({
            where: {
                id: paymentMethodId,
                available: true
            },
            transaction,
        });
        if (!selectedPaymentMethod) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid or unavailable payment method"
            });
        }
        const isBuyOffer = offer.type === "BUY";
        const buyerId = isBuyOffer ? offer.userId : user.id;
        const sellerId = isBuyOffer ? user.id : offer.userId;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying seller balance and locking funds");
        let sellerWallet = await (0, utils_1.getWalletSafe)(sellerId, offer.walletType, offer.currency, false, ctx);
        if (isBuyOffer) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step(`Locking ${amount} ${offer.currency} for seller (BUY offer)`);
            if (!sellerWallet) {
                if (offer.walletType === "ECO") {
                    const ecosystemUtils = await (0, safe_imports_1.getEcosystemWalletUtils)();
                    if (!(0, safe_imports_1.isServiceAvailable)(ecosystemUtils)) {
                        throw (0, error_1.createError)({
                            statusCode: 503,
                            message: "Ecosystem wallet service is not available"
                        });
                    }
                    const { getWalletByUserIdAndCurrency } = ecosystemUtils;
                    const seller = await db_1.models.user.findByPk(sellerId, { transaction });
                    sellerWallet = await getWalletByUserIdAndCurrency(seller, offer.currency);
                }
                else {
                    const walletResult = await wallet_1.walletCreationService.getOrCreateWallet(sellerId, offer.walletType, offer.currency, transaction);
                    sellerWallet = walletResult.wallet;
                }
            }
            if (!sellerWallet) {
                throw (0, error_1.createError)({
                    statusCode: 500,
                    message: "Failed to create or retrieve seller wallet"
                });
            }
            const availableBalance = sellerWallet.balance;
            if (availableBalance < amount) {
                throw (0, error_1.createError)({
                    statusCode: 409,
                    message: `Insufficient balance. Available: ${availableBalance} ${offer.currency}, Required: ${amount} ${offer.currency}. Please deposit more funds to your ${offer.walletType} wallet.`
                });
            }
            const idempotencyKey = `p2p_trade_lock_${offer.id}_${user.id}`;
            await wallet_1.walletService.hold({
                idempotencyKey,
                userId: sellerId,
                walletId: sellerWallet.id,
                walletType: offer.walletType,
                currency: offer.currency,
                amount,
                operationType: "P2P_TRADE_LOCK",
                description: `Lock ${amount} ${offer.currency} for P2P BUY offer trade`,
                metadata: {
                    offerId: offer.id,
                    offerType: offer.type,
                    initiatedBy: user.id,
                },
                transaction,
            });
        }
        else {
            if (!sellerWallet) {
                throw (0, error_1.createError)({
                    statusCode: 500,
                    message: "Seller wallet not found. The offer may be invalid."
                });
            }
            if (((_b = sellerWallet.inOrder) !== null && _b !== void 0 ? _b : 0) < amount) {
                throw (0, error_1.createError)({
                    statusCode: 409,
                    message: `Insufficient locked funds for this offer. The offer may have been partially consumed by another trade.`
                });
            }
        }
        (0, audit_1.createP2PAuditLog)({
            userId: sellerId,
            eventType: audit_1.P2PAuditEventType.TRADE_INITIATED,
            entityType: "TRADE",
            entityId: offer.id,
            metadata: {
                offerId: offer.id,
                amount,
                currency: offer.currency,
                walletType: offer.walletType,
                walletInOrder: sellerWallet.inOrder,
                note: offer.walletType === "FIAT"
                    ? "FIAT trade - balance locked on platform, payment happens peer-to-peer"
                    : "Trade initiated - funds locked in escrow at trade initiation",
                initiatedBy: user.id,
            },
            riskLevel: audit_1.P2PRiskLevel.HIGH,
        }).catch(err => console_1.logger.error("P2P_TRADE", "Failed to create audit log", err));
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating trade fees");
        const { calculateEscrowFee } = await Promise.resolve().then(() => __importStar(require("../../utils/fees")));
        const escrowFee = await calculateEscrowFee(amount, offer.currency);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating trade record");
        let parsedMetadata = {};
        if (selectedPaymentMethod.metadata) {
            if (typeof selectedPaymentMethod.metadata === "string") {
                try {
                    parsedMetadata = JSON.parse(selectedPaymentMethod.metadata);
                }
                catch (_e) {
                    parsedMetadata = {};
                }
            }
            else if (typeof selectedPaymentMethod.metadata === "object") {
                parsedMetadata = selectedPaymentMethod.metadata;
            }
        }
        const paymentDetails = {
            name: selectedPaymentMethod.name,
            icon: selectedPaymentMethod.icon,
            instructions: selectedPaymentMethod.instructions || null,
            processingTime: selectedPaymentMethod.processingTime || null,
            ...parsedMetadata,
        };
        const trade = await db_1.models.p2pTrade.create({
            offerId: offer.id,
            buyerId,
            sellerId,
            type: offer.type,
            amount,
            price: priceConfig.finalPrice,
            total: amount * priceConfig.finalPrice,
            currency: offer.currency,
            paymentMethod: paymentMethodId,
            paymentDetails,
            status: "PENDING",
            escrowFee: escrowFee.toString(),
            timeline: [
                {
                    event: "TRADE_INITIATED",
                    message: "Trade initiated",
                    userId: user.id,
                    createdAt: new Date().toISOString(),
                },
                ...(message ? [{
                        event: "MESSAGE",
                        message,
                        userId: user.id,
                        createdAt: new Date().toISOString(),
                    }] : [])
            ],
        }, { transaction });
        const newTotal = amountConfig.total - amount;
        if (newTotal < 0) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: `Insufficient offer amount. Available: ${amountConfig.total} ${offer.currency}, Requested: ${amount} ${offer.currency}`
            });
        }
        const originalTotal = (_c = amountConfig.originalTotal) !== null && _c !== void 0 ? _c : amountConfig.total + amount;
        await offer.update({ amountConfig: { ...amountConfig, total: newTotal, originalTotal } }, { transaction });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating offer available amount");
        await transaction.commit();
        if (redis) {
            try {
                await redis.del(`p2p:initiate:${id}:lock`);
            }
            catch (_) { }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Initiated ${offer.type} trade: ${amount} ${offer.currency} @ ${priceConfig.finalPrice}`);
        (0, audit_1.createP2PAuditLog)({
            userId: user.id,
            eventType: audit_1.P2PAuditEventType.TRADE_INITIATED,
            entityType: "TRADE",
            entityId: trade.id,
            metadata: {
                offerId: offer.id,
                amount,
                currency: offer.currency,
                price: priceConfig.finalPrice,
                paymentMethodId,
                buyerId,
                sellerId,
                escrowFee,
                totalValue: amount * priceConfig.finalPrice,
                offerType: offer.type,
                walletType: offer.walletType,
            },
            riskLevel: amount > 1000 ? audit_1.P2PRiskLevel.HIGH : audit_1.P2PRiskLevel.MEDIUM,
        }).catch(err => console_1.logger.error("P2P_TRADE", "Failed to create audit log", err));
        db_1.models.p2pOffer.increment("views", { where: { id } }).catch((err) => {
            console_1.logger.error("P2P_OFFER", "Failed to increment views", err);
        });
        (0, notifications_1.notifyTradeEvent)(trade.id, "TRADE_INITIATED", {
            buyerId,
            sellerId,
            amount,
            currency: offer.currency,
            initiatorId: user.id,
        }).catch((err) => console_1.logger.error("P2P_TRADE", "Failed to send trade initiation notification", err));
        return {
            message: "Trade initiated successfully",
            trade: {
                id: trade.id,
                amount: trade.amount,
                total: trade.total,
                status: trade.status,
                buyer: isBuyOffer ? offer.user : { id: user.id },
                seller: isBuyOffer ? { id: user.id } : offer.user,
                fees: {
                    escrowFee,
                    platformFee: escrowFee,
                },
                netAmount: amount - escrowFee,
            }
        };
    }
    catch (error) {
        if (redis && lockAcquired) {
            try {
                await redis.del(`p2p:initiate:${id}:lock`);
            }
            catch (_) { }
        }
        if (transaction) {
            try {
                if (!transaction.finished) {
                    await transaction.rollback();
                }
            }
            catch (rollbackError) {
                if (!((_d = rollbackError.message) === null || _d === void 0 ? void 0 : _d.includes("already been finished"))) {
                    console_1.logger.error("P2P_TRADE", "Transaction rollback failed", rollbackError);
                }
            }
        }
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to initiate trade: ${error.message}`,
        });
    }
}
