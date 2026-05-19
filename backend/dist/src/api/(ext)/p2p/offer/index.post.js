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
const sequelize_1 = require("sequelize");
const cache_1 = require("@b/utils/cache");
const wallet_1 = require("@b/services/wallet");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Create a P2P Offer",
    description: "Creates a new offer with structured configurations for the authenticated user, and associates payment methods.",
    operationId: "createP2POffer",
    tags: ["P2P", "Offer"],
    requiresAuth: true,
    middleware: ["p2pOfferCreateRateLimit"],
    logModule: "P2P_OFFER",
    logTitle: "Create P2P offer",
    requestBody: {
        description: "Complete P2P offer payload",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        type: { type: "string", enum: ["BUY", "SELL"] },
                        currency: { type: "string" },
                        walletType: { type: "string", enum: ["FIAT", "SPOT", "ECO"] },
                        amountConfig: {
                            type: "object",
                            properties: {
                                total: { type: "number" },
                                min: { type: "number" },
                                max: { type: "number" },
                                availableBalance: { type: "number" },
                            },
                            required: ["total"],
                        },
                        priceConfig: {
                            type: "object",
                            properties: {
                                model: { type: "string", enum: ["FIXED", "MARGIN"] },
                                value: { type: "number" },
                                marketPrice: { type: "number" },
                                finalPrice: { type: "number" },
                            },
                            required: ["model", "value", "finalPrice"],
                        },
                        tradeSettings: {
                            type: "object",
                            properties: {
                                autoCancel: { type: "number" },
                                kycRequired: { type: "boolean", default: false },
                                visibility: {
                                    type: "string",
                                    enum: ["PUBLIC", "PRIVATE"],
                                },
                                termsOfTrade: { type: "string", minLength: 1 },
                                additionalNotes: { type: "string" },
                            },
                            required: ["autoCancel", "visibility", "termsOfTrade"],
                        },
                        locationSettings: {
                            type: "object",
                            properties: {
                                country: { type: "string", minLength: 1 },
                                region: { type: "string" },
                                city: { type: "string" },
                                restrictions: { type: "array", items: { type: "string" } },
                            },
                            required: ["country"],
                        },
                        userRequirements: {
                            type: "object",
                            properties: {
                                minCompletedTrades: { type: "number" },
                                minSuccessRate: { type: "number" },
                                minAccountAge: { type: "number" },
                                trustedOnly: { type: "boolean" },
                            },
                        },
                        paymentMethodIds: {
                            type: "array",
                            items: { type: "string", format: "uuid" },
                            description: "Array of P2P payment‐method IDs to attach",
                            minItems: 1,
                        },
                    },
                    required: [
                        "type",
                        "currency",
                        "walletType",
                        "amountConfig",
                        "priceConfig",
                        "tradeSettings",
                        "locationSettings",
                        "paymentMethodIds",
                    ],
                },
            },
        },
    },
    responses: {
        200: { description: "Offer created successfully." },
        400: { description: "Bad Request." },
        401: { description: "Unauthorized." },
        500: { description: "Internal Server Error." },
    },
};
async function handler(data) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating required fields");
    if (!((_a = body.locationSettings) === null || _a === void 0 ? void 0 : _a.country)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Location country is required for P2P offers",
        });
    }
    if (!((_c = (_b = body.tradeSettings) === null || _b === void 0 ? void 0 : _b.termsOfTrade) === null || _c === void 0 ? void 0 : _c.trim())) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Trade terms are required for P2P offers",
        });
    }
    console_1.logger.debug("P2P", "Received body", {
        type: body.type,
        currency: body.currency,
        paymentMethodIds: body.paymentMethodIds,
    });
    if (!body.paymentMethodIds || !Array.isArray(body.paymentMethodIds) || body.paymentMethodIds.length === 0) {
        console_1.logger.error("P2P", "Invalid payment methods", body.paymentMethodIds);
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "At least one payment method is required for P2P offers",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking offer type and requirements");
    if (!((_d = body.amountConfig) === null || _d === void 0 ? void 0 : _d.total) || body.amountConfig.total <= 0) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Total amount must be greater than 0" });
    }
    if (body.amountConfig.min && body.amountConfig.max && body.amountConfig.min > body.amountConfig.max) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Minimum amount cannot exceed maximum amount" });
    }
    const finalPrice = (_e = body.priceConfig) === null || _e === void 0 ? void 0 : _e.finalPrice;
    if (finalPrice && finalPrice > 0 && body.amountConfig.total) {
        const minInCrypto = body.amountConfig.min ? body.amountConfig.min / finalPrice : 0;
        const maxInCrypto = body.amountConfig.max ? body.amountConfig.max / finalPrice : 0;
        if (minInCrypto > 0 && minInCrypto > body.amountConfig.total) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Minimum amount cannot exceed total amount" });
        }
        if (maxInCrypto > 0 && maxInCrypto > body.amountConfig.total) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Maximum amount cannot exceed total amount" });
        }
    }
    let sellerWallet = null;
    let requiredAmount = 0;
    if (body.type === "SELL") {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking seller balance for SELL offer");
        requiredAmount = ((_f = body.amountConfig) === null || _f === void 0 ? void 0 : _f.total) || 0;
        if (requiredAmount <= 0) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid amount specified for sell offer",
            });
        }
        sellerWallet = await (0, utils_1.getWalletSafe)(user.id, body.walletType, body.currency, false, ctx);
        if (!sellerWallet) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `You don't have a ${body.currency} ${body.walletType} wallet. Please create one first.`,
            });
        }
        const availableBalance = sellerWallet.balance;
        if (availableBalance < requiredAmount) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Insufficient balance. Available: ${availableBalance} ${body.currency}, Required: ${requiredAmount} ${body.currency}. Please deposit more funds to your ${body.walletType} wallet.`,
            });
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating offer configuration and settings");
    const cacheManager = cache_1.CacheManager.getInstance();
    const autoApprove = await cacheManager.getSetting("p2pAutoApproveOffers");
    const shouldAutoApprove = autoApprove === true || autoApprove === "true";
    const jsonFields = ["amountConfig", "priceConfig", "tradeSettings", "locationSettings", "userRequirements"];
    const preparedData = {};
    for (const field of jsonFields) {
        if (body[field] !== undefined && body[field] !== null) {
            const value = body[field];
            if (typeof value === 'string') {
                try {
                    preparedData[field] = JSON.parse(value);
                }
                catch (e) {
                    throw (0, error_1.createError)({
                        statusCode: 400,
                        message: `Invalid JSON for field ${field}`,
                    });
                }
            }
            else if (typeof value === 'object') {
                preparedData[field] = value;
            }
        }
        else {
            preparedData[field] = null;
        }
    }
    if (preparedData.tradeSettings && preparedData.tradeSettings.kycRequired === undefined) {
        preparedData.tradeSettings.kycRequired = false;
    }
    const priceCurrency = ((_g = preparedData.priceConfig) === null || _g === void 0 ? void 0 : _g.currency) || "USD";
    const minTradeAmount = await cacheManager.getSetting("p2pMinimumTradeAmount");
    const maxTradeAmount = await cacheManager.getSetting("p2pMaximumTradeAmount");
    const offerMin = ((_h = preparedData.amountConfig) === null || _h === void 0 ? void 0 : _h.min) || 0;
    const offerMax = ((_j = preparedData.amountConfig) === null || _j === void 0 ? void 0 : _j.max) || ((_k = preparedData.amountConfig) === null || _k === void 0 ? void 0 : _k.total) || 0;
    if (minTradeAmount && offerMin < minTradeAmount) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Minimum trade amount cannot be less than platform minimum of ${minTradeAmount} ${priceCurrency}`,
        });
    }
    if (maxTradeAmount && offerMax > maxTradeAmount) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Maximum trade amount cannot exceed platform maximum of ${maxTradeAmount} ${priceCurrency}`,
        });
    }
    const { validateMinimumTradeAmount } = await Promise.resolve().then(() => __importStar(require("../utils/fees")));
    if (((_l = preparedData.amountConfig) === null || _l === void 0 ? void 0 : _l.min) && ((_m = preparedData.priceConfig) === null || _m === void 0 ? void 0 : _m.finalPrice)) {
        const cryptoMinAmount = preparedData.amountConfig.min / preparedData.priceConfig.finalPrice;
        const minimumValidation = await validateMinimumTradeAmount(cryptoMinAmount, body.currency);
        if (!minimumValidation.valid && minimumValidation.minimum) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Minimum trade amount for ${body.currency} is ${minimumValidation.minimum} ${body.currency}. Current minimum converts to ${cryptoMinAmount.toFixed(8)} ${body.currency}.`,
            });
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating offer record");
    const t = await db_1.sequelize.transaction();
    try {
        const offer = await db_1.models.p2pOffer.create({
            userId: user.id,
            type: body.type,
            currency: body.currency,
            walletType: body.walletType,
            priceCurrency: priceCurrency,
            amountConfig: preparedData.amountConfig,
            priceConfig: preparedData.priceConfig,
            tradeSettings: preparedData.tradeSettings,
            locationSettings: preparedData.locationSettings,
            userRequirements: preparedData.userRequirements,
            status: shouldAutoApprove ? "ACTIVE" : "PENDING_APPROVAL",
            views: 0,
            systemTags: [],
            adminNotes: null,
        }, { transaction: t });
        if (body.type === "SELL" && sellerWallet && requiredAmount > 0) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step(`Locking ${requiredAmount} ${body.currency} for SELL offer`);
            const idempotencyKey = `p2p_offer_lock_${offer.id}`;
            await wallet_1.walletService.hold({
                idempotencyKey,
                userId: user.id,
                walletId: sellerWallet.id,
                walletType: body.walletType,
                currency: body.currency,
                amount: requiredAmount,
                operationType: "P2P_OFFER_LOCK",
                description: `Lock ${requiredAmount} ${body.currency} for P2P SELL offer`,
                metadata: {
                    offerId: offer.id,
                    offerType: body.type,
                },
                transaction: t,
            });
            console_1.logger.debug("P2P", "SELL offer - funds locked", {
                userId: user.id,
                walletId: sellerWallet.id,
                walletType: body.walletType,
                currency: body.currency,
                amount: requiredAmount,
                previousInOrder: sellerWallet.inOrder,
                newInOrder: sellerWallet.inOrder + requiredAmount,
            });
        }
        const ids = Array.isArray(body.paymentMethodIds)
            ? body.paymentMethodIds
            : [];
        if (ids.length) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating and associating ${ids.length} payment method(s)`);
            console_1.logger.debug("P2P", "Validating payment method IDs", ids);
            const methods = await db_1.models.p2pPaymentMethod.findAll({
                where: {
                    id: ids,
                    [sequelize_1.Op.or]: [
                        { userId: null },
                        { userId: user.id }
                    ]
                },
                transaction: t,
            });
            console_1.logger.debug("P2P", "Found payment methods", methods.map(m => ({ id: m.id, name: m.name, userId: m.userId })));
            if (methods.length !== ids.length) {
                const foundIds = methods.map(m => m.id);
                const missingIds = ids.filter(id => !foundIds.includes(id));
                console_1.logger.error("P2P", "Missing payment method IDs", missingIds);
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Invalid payment method IDs: ${missingIds.join(', ')}. Please ensure all payment methods are properly created first.`,
                });
            }
            await offer.setPaymentMethods(methods, { transaction: t });
            console_1.logger.debug("P2P", "Associated payment methods successfully");
        }
        await t.commit();
        await offer.reload({
            include: [
                {
                    model: db_1.models.p2pPaymentMethod,
                    as: "paymentMethods",
                    attributes: ["id", "name", "icon"],
                    through: { attributes: [] },
                }
            ]
        });
        const offerStatus = shouldAutoApprove ? "ACTIVE" : "PENDING_APPROVAL";
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Created ${body.type} offer for ${(_o = body.amountConfig) === null || _o === void 0 ? void 0 : _o.total} ${body.currency} (${offerStatus})`);
        return { message: "Offer created successfully.", offer };
    }
    catch (err) {
        await t.rollback();
        if (err.statusCode)
            throw err;
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to create offer: " + err.message,
        });
    }
}
