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
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const settings_core_1 = require("@b/api/(ext)/copy-trading/utils/settings-core");
const security_1 = require("@b/api/(ext)/copy-trading/utils/security");
const wallet_1 = require("@b/services/wallet");
const errors_1 = require("@b/services/wallet/errors");
const attestation_1 = require("@b/utils/attestation");
const native_binary_1 = require("../../../utils/native-binary");
exports.metadata = {
    summary: "Create Market Allocation",
    description: "Creates a new market allocation for a subscription. The market must be one of the leader's declared markets.",
    operationId: "createSubscriptionAllocation",
    tags: ["Copy Trading", "Followers", "Allocations"],
    requiresAuth: true,
    logModule: "COPY",
    logTitle: "Create allocation",
    middleware: ["copyTradingFunds"],
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Subscription (follower) ID",
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        symbol: {
                            type: "string",
                            description: "Market symbol (e.g., BTC/USDT)",
                        },
                        marketType: {
                            type: "string",
                            enum: ["SPOT", "BINARY"],
                            default: "SPOT",
                            description: "Instrument class: SPOT (funded from ECO) or BINARY (stake budget funded from SPOT)",
                        },
                        baseAmount: {
                            type: "number",
                            minimum: 0,
                            description: "Initial base currency amount for selling (SPOT only)",
                        },
                        quoteAmount: {
                            type: "number",
                            minimum: 0,
                            description: "Initial quote currency amount for buying; for BINARY this is the stake budget",
                        },
                    },
                    required: ["symbol"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Allocation created successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            allocation: { type: "object" },
                        },
                    },
                },
            },
        },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        404: { description: "Subscription not found" },
        429: { description: "Too Many Requests" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, params, body, ctx } = data;
    (0, native_binary_1.assertNotBinaryOnNativeApp)(data, body === null || body === void 0 ? void 0 : body.marketType, "allocate to a binary market");
    const { id } = params;
    const { symbol } = body;
    const marketType = body.marketType === "BINARY" ? "BINARY" : "SPOT";
    const baseAmount = marketType === "BINARY" ? 0 : body.baseAmount || 0;
    const quoteAmount = body.quoteAmount || 0;
    const sourceWalletType = marketType === "BINARY" ? "SPOT" : "ECO";
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    await (0, attestation_1.assertAttestedOnNativeApp)(data, user.id, "copy-trading");
    if (!(0, security_1.isValidUUID)(id)) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid subscription ID" });
    }
    if (!symbol || typeof symbol !== "string") {
        throw (0, error_1.createError)({ statusCode: 400, message: "Symbol is required" });
    }
    const parts = symbol.split("/");
    if (parts.length !== 2) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid symbol format. Use BASE/QUOTE (e.g., BTC/USDT)",
        });
    }
    const [baseCurrency, quoteCurrency] = parts;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching subscription");
    const subscription = await db_1.models.copyTradingFollower.findByPk(id);
    if (!subscription) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Subscription not found" });
    }
    if (subscription.userId !== user.id) {
        throw (0, error_1.createError)({ statusCode: 403, message: "Access denied" });
    }
    if (subscription.status === "STOPPED") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Cannot add allocations to a stopped subscription",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying leader market");
    const leaderMarket = await db_1.models.copyTradingLeaderMarket.findOne({
        where: {
            leaderId: subscription.leaderId,
            symbol,
            marketType,
            isActive: true,
        },
    });
    if (!leaderMarket) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Market ${symbol} (${marketType}) is not available for this leader`,
        });
    }
    if (marketType === "BINARY") {
        const { checkCopyTypeAvailability } = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/copy-trading/utils")));
        const availability = await checkCopyTypeAvailability("BINARY");
        if (!availability.available) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: availability.reason || "Binary copy trading is not available",
            });
        }
    }
    const minBase = leaderMarket.minBase || 0;
    const minQuote = leaderMarket.minQuote || 0;
    const baseAmt = Number(baseAmount) || 0;
    const quoteAmt = Number(quoteAmount) || 0;
    if (minBase > 0 && baseAmt > 0 && baseAmt < minBase) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `${symbol}: Minimum ${baseCurrency} allocation is ${minBase}`,
        });
    }
    if (minQuote > 0 && quoteAmt > 0 && quoteAmt < minQuote) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `${symbol}: Minimum ${quoteCurrency} allocation is ${minQuote}`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for existing allocation");
    const existingAllocation = await db_1.models.copyTradingFollowerAllocation.findOne({
        where: { followerId: id, symbol, marketType },
    });
    if (existingAllocation) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `You already have an allocation for ${symbol}. Use add-funds to increase it.`,
        });
    }
    if (baseAmt < 0 || quoteAmt < 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Amounts cannot be negative",
        });
    }
    if (baseAmt === 0 && quoteAmt === 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "At least one of baseAmount or quoteAmount must be greater than 0",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating allocation");
    let allocation;
    const allocationIdempotencyKey = marketType === "BINARY"
        ? `ct_allocation_${id}_${subscription.leaderId}_${symbol}_BINARY`
        : `ct_allocation_${id}_${subscription.leaderId}_${symbol}`;
    await db_1.sequelize.transaction(async (transaction) => {
        allocation = await db_1.models.copyTradingFollowerAllocation.create({
            followerId: id,
            symbol,
            marketType,
            baseAmount: 0,
            quoteAmount: 0,
            isActive: false,
        }, { transaction });
        if (baseAmt > 0) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step(`Transferring ${baseAmt} ${baseCurrency} from ${sourceWalletType} to COPY_TRADING wallet`);
            try {
                const transferResult = await wallet_1.walletService.transfer({
                    idempotencyKey: `${allocationIdempotencyKey}_base`,
                    fromUserId: user.id,
                    toUserId: user.id,
                    fromWalletType: sourceWalletType,
                    toWalletType: "COPY_TRADING",
                    fromCurrency: baseCurrency,
                    toCurrency: baseCurrency,
                    amount: baseAmt,
                    description: `Transfer ${baseAmt} ${baseCurrency} from ${sourceWalletType} to CT wallet (allocate to ${symbol})`,
                    metadata: {
                        symbol,
                        currencyType: "BASE",
                        followerId: id,
                        leaderId: subscription.leaderId,
                        allocationId: allocation.id,
                    },
                    transaction,
                });
                await (0, settings_core_1.createCopyTradingTransaction)({
                    userId: user.id,
                    leaderId: subscription.leaderId,
                    followerId: id,
                    type: "ALLOCATION",
                    amount: baseAmt,
                    currency: baseCurrency,
                    balanceBefore: transferResult.fromResult.previousBalance,
                    balanceAfter: transferResult.fromResult.newBalance,
                    description: `Transfer ${baseAmt} ${baseCurrency} from ${sourceWalletType} to CT wallet (allocate to ${symbol})`,
                    metadata: JSON.stringify({
                        symbol,
                        currencyType: "BASE",
                        allocationId: allocation.id,
                    }),
                }, transaction);
            }
            catch (transferError) {
                if (transferError instanceof errors_1.DuplicateOperationError ||
                    (transferError === null || transferError === void 0 ? void 0 : transferError.name) === "DuplicateOperationError") {
                    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Base transfer already processed for ${symbol} (idempotent retry)`);
                }
                else {
                    throw transferError;
                }
            }
        }
        if (quoteAmt > 0) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step(`Transferring ${quoteAmt} ${quoteCurrency} from ${sourceWalletType} to COPY_TRADING wallet`);
            try {
                const transferResult = await wallet_1.walletService.transfer({
                    idempotencyKey: `${allocationIdempotencyKey}_quote`,
                    fromUserId: user.id,
                    toUserId: user.id,
                    fromWalletType: sourceWalletType,
                    toWalletType: "COPY_TRADING",
                    fromCurrency: quoteCurrency,
                    toCurrency: quoteCurrency,
                    amount: quoteAmt,
                    description: `Transfer ${quoteAmt} ${quoteCurrency} from ${sourceWalletType} to CT wallet (allocate to ${symbol})`,
                    metadata: {
                        symbol,
                        currencyType: "QUOTE",
                        followerId: id,
                        leaderId: subscription.leaderId,
                        allocationId: allocation.id,
                    },
                    transaction,
                });
                await (0, settings_core_1.createCopyTradingTransaction)({
                    userId: user.id,
                    leaderId: subscription.leaderId,
                    followerId: id,
                    type: "ALLOCATION",
                    amount: quoteAmt,
                    currency: quoteCurrency,
                    balanceBefore: transferResult.fromResult.previousBalance,
                    balanceAfter: transferResult.fromResult.newBalance,
                    description: `Transfer ${quoteAmt} ${quoteCurrency} from ${sourceWalletType} to CT wallet (allocate to ${symbol})`,
                    metadata: JSON.stringify({
                        symbol,
                        currencyType: "QUOTE",
                        allocationId: allocation.id,
                    }),
                }, transaction);
            }
            catch (transferError) {
                if (transferError instanceof errors_1.DuplicateOperationError ||
                    (transferError === null || transferError === void 0 ? void 0 : transferError.name) === "DuplicateOperationError") {
                    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Quote transfer already processed for ${symbol} (idempotent retry)`);
                }
                else {
                    throw transferError;
                }
            }
        }
        await allocation.update({
            baseAmount: baseAmt,
            quoteAmount: quoteAmt,
            isActive: true,
        }, { transaction });
        await (0, settings_core_1.createAuditLog)({
            entityType: "ALLOCATION",
            entityId: allocation.id,
            action: "CREATE",
            newValue: {
                symbol,
                baseAmount: baseAmt,
                quoteAmount: quoteAmt,
            },
            userId: user.id,
        }, transaction);
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Created allocation for ${symbol}`);
    return {
        message: `Successfully created allocation for ${symbol}`,
        allocation: allocation.toJSON(),
    };
};
