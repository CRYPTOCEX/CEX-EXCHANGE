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
const core_1 = require("@b/api/(ext)/copy-trading/utils/core");
const notifications_1 = require("@b/api/(ext)/copy-trading/utils/notifications");
const settings_core_1 = require("@b/api/(ext)/copy-trading/utils/settings-core");
const security_1 = require("@b/api/(ext)/copy-trading/utils/security");
const wallet_1 = require("@b/api/(ext)/ecosystem/utils/wallet");
const wallet_2 = require("@b/services/wallet");
const affiliate_1 = require("@b/utils/affiliate");
const kyc_1 = require("@b/utils/kyc");
const transaction_1 = require("@b/utils/transaction");
const attestation_1 = require("@b/utils/attestation");
const mobile_forbidden_1 = require("@b/utils/mobile-forbidden");
const native_binary_1 = require("../utils/native-binary");
exports.metadata = {
    summary: "Follow a Copy Trading Leader",
    description: "Subscribe to a leader with per-market liquidity allocation for both base and quote currencies.",
    operationId: "followCopyTradingLeader",
    tags: ["Copy Trading", "Followers"],
    requiresAuth: true,
    logModule: "COPY",
    logTitle: "Follow trader",
    middleware: ["copyTradingFollow"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        leaderId: {
                            type: "string",
                            format: "uuid",
                            description: "ID of the leader to follow",
                        },
                        allocations: {
                            type: "array",
                            items: {
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
                                        description: "Instrument class: SPOT (base+quote budgets, funded from ECO) or BINARY (single quote stake budget, funded from SPOT)",
                                    },
                                    baseAmount: {
                                        type: "number",
                                        minimum: 0,
                                        description: "Amount of base currency to allocate (SPOT only, for SELL orders)",
                                    },
                                    quoteAmount: {
                                        type: "number",
                                        minimum: 0,
                                        description: "Amount of quote currency to allocate (for BUY orders; for BINARY this is the stake budget)",
                                    },
                                },
                                required: ["symbol"],
                            },
                            description: "Per-market allocation with base and quote currency amounts",
                        },
                        copyMode: {
                            type: "string",
                            enum: ["PROPORTIONAL", "FIXED_AMOUNT", "FIXED_RATIO"],
                            default: "PROPORTIONAL",
                            description: "How to calculate copy trade amounts",
                        },
                        fixedAmount: {
                            type: "number",
                            description: "Fixed amount for FIXED_AMOUNT mode",
                        },
                        fixedRatio: {
                            type: "number",
                            description: "Fixed ratio for FIXED_RATIO mode",
                        },
                        maxDailyLoss: {
                            type: "number",
                            minimum: 0,
                            maximum: 100,
                            description: "Maximum daily loss percentage",
                        },
                        maxPositionSize: {
                            type: "number",
                            minimum: 0,
                            maximum: 100,
                            description: "Maximum position size percentage",
                        },
                        stopLossPercent: {
                            type: "number",
                            minimum: 0,
                            maximum: 100,
                            description: "Stop loss percentage",
                        },
                        takeProfitPercent: {
                            type: "number",
                            minimum: 0,
                            maximum: 1000,
                            description: "Take profit percentage",
                        },
                    },
                    required: ["leaderId", "allocations"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Successfully followed the leader",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            subscription: { type: "object" },
                        },
                    },
                },
            },
        },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        429: { description: "Too Many Requests" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    var _a, _b, _c;
    var _d;
    const { user, body, ctx } = data;
    (0, native_binary_1.assertNotBinaryOnNativeApp)(data, (_a = ((_d = body === null || body === void 0 ? void 0 : body.allocations) !== null && _d !== void 0 ? _d : []).find((a) => { var _a; return String((_a = a === null || a === void 0 ? void 0 : a.marketType) !== null && _a !== void 0 ? _a : "").toUpperCase() === "BINARY"; })) === null || _a === void 0 ? void 0 : _a.marketType, "allocate to a binary market");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    await (0, attestation_1.assertAttestedOnNativeApp)(data, user.id, "copy-trading");
    await (0, kyc_1.assertKycFeature)(user.id, kyc_1.KYC_FEATURES.COPY_TRADERS, "copy a trader");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating request");
    const validation = (0, security_1.validateFollowRequest)(body);
    if (!validation.valid) {
        (0, security_1.throwValidationError)(validation);
    }
    const { leaderId, copyMode, fixedAmount, fixedRatio, maxDailyLoss, maxPositionSize, stopLossPercent, takeProfitPercent, } = validation.sanitized;
    const { allocations } = body;
    if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "At least one market allocation is required",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating leader and markets");
    const leader = await db_1.models.copyTradingLeader.findOne({
        where: { id: leaderId, status: "ACTIVE" },
        include: [
            {
                model: db_1.models.copyTradingLeaderMarket,
                as: "markets",
                where: { isActive: true },
                required: false,
            },
        ],
    });
    if (!leader) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Leader not found or not active",
        });
    }
    if (leader.userId === user.id) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "You cannot follow yourself",
        });
    }
    for (const alloc of allocations) {
        alloc.marketType = alloc.marketType === "BINARY" ? "BINARY" : "SPOT";
        if (alloc.marketType === "BINARY") {
            alloc.baseAmount = 0;
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for market conflicts");
    const conflictCheck = await (0, security_1.checkMarketConflict)(user.id, leaderId, allocations.map((a) => ({ symbol: a.symbol, marketType: a.marketType })));
    if (conflictCheck.hasConflict) {
        const details = conflictCheck.conflictDetails[0];
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `You already have active allocations on ${details.markets.join(", ")} from leader "${details.leaderName}". You cannot follow multiple leaders on the same market.`,
        });
    }
    const leaderMarkets = leader.markets || [];
    const leaderMarketMap = new Map();
    for (const m of leaderMarkets) {
        leaderMarketMap.set(`${m.symbol}|${m.marketType || "SPOT"}`, m);
    }
    for (const alloc of allocations) {
        const leaderMarket = leaderMarketMap.get(`${alloc.symbol}|${alloc.marketType}`);
        if (!leaderMarket) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Market ${alloc.symbol} (${alloc.marketType}) is not traded by this leader`,
            });
        }
        if (alloc.marketType === "BINARY") {
            if (!alloc.quoteAmount || alloc.quoteAmount <= 0) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `A stake budget (quoteAmount) greater than 0 is required for binary market ${alloc.symbol}`,
                });
            }
        }
        else if ((!alloc.baseAmount || alloc.baseAmount <= 0) &&
            (!alloc.quoteAmount || alloc.quoteAmount <= 0)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `At least one of baseAmount or quoteAmount must be greater than 0 for ${alloc.symbol}`,
            });
        }
        const minBase = leaderMarket.minBase || 0;
        const minQuote = leaderMarket.minQuote || 0;
        if (minBase > 0 && alloc.baseAmount > 0 && alloc.baseAmount < minBase) {
            const [baseCurrency] = alloc.symbol.split("/");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `${alloc.symbol}: Minimum ${baseCurrency} allocation is ${minBase}`,
            });
        }
        if (minQuote > 0 && alloc.quoteAmount > 0 && alloc.quoteAmount < minQuote) {
            const [, quoteCurrency] = alloc.symbol.split("/");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `${alloc.symbol}: Minimum ${quoteCurrency} allocation is ${minQuote}`,
            });
        }
    }
    if (allocations.some((a) => a.marketType === "BINARY")) {
        const { checkCopyTypeAvailability } = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/copy-trading/utils")));
        const availability = await checkCopyTypeAvailability("BINARY");
        if (!availability.available) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: availability.reason || "Binary copy trading is not available",
            });
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking eligibility");
    const eligibility = await (0, core_1.checkFollowEligibility)(user.id, leaderId, 0);
    if (!eligibility.eligible) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: eligibility.reason || "Eligibility check failed",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating funding wallet balances");
    const currencyAmounts = new Map();
    const addRequired = (walletType, currency, amount) => {
        const key = `${walletType}|${currency}`;
        currencyAmounts.set(key, (currencyAmounts.get(key) || 0) + amount);
    };
    for (const alloc of allocations) {
        const [baseCurrency, quoteCurrency] = alloc.symbol.split("/");
        const sourceType = alloc.marketType === "BINARY" ? "SPOT" : "ECO";
        if (alloc.baseAmount && alloc.baseAmount > 0) {
            addRequired(sourceType, baseCurrency, alloc.baseAmount);
        }
        if (alloc.quoteAmount && alloc.quoteAmount > 0) {
            addRequired(sourceType, quoteCurrency, alloc.quoteAmount);
        }
    }
    const fundingWallets = new Map();
    for (const [key, requiredAmount] of currencyAmounts) {
        const [walletType, currency] = key.split("|");
        let fundingWallet = null;
        if (walletType === "ECO") {
            fundingWallet = await (0, wallet_1.getWalletByUserIdAndCurrency)(user.id, currency, "ECO");
        }
        else {
            fundingWallet = await db_1.models.wallet.findOne({
                where: { userId: user.id, currency, type: "SPOT" },
            });
        }
        if (!fundingWallet) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `${walletType} wallet not found for ${currency}`,
            });
        }
        const balance = parseFloat(((_b = fundingWallet.balance) === null || _b === void 0 ? void 0 : _b.toString()) || "0");
        if (balance < requiredAmount) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Insufficient ${currency} balance in ${walletType} wallet. Required: ${requiredAmount.toFixed(8)}, Available: ${balance.toFixed(8)}`,
            });
        }
        fundingWallets.set(key, { wallet: fundingWallet, balance });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating subscription");
    const t = await db_1.sequelize.transaction();
    try {
        const follower = await db_1.models.copyTradingFollower.create({
            userId: user.id,
            leaderId,
            copyMode: copyMode || "PROPORTIONAL",
            fixedAmount: copyMode === "FIXED_AMOUNT" ? fixedAmount : null,
            fixedRatio: copyMode === "FIXED_RATIO" ? fixedRatio : null,
            maxDailyLoss,
            maxPositionSize,
            stopLossPercent,
            takeProfitPercent,
            status: "ACTIVE",
        }, { transaction: t });
        for (const alloc of allocations) {
            const [baseCurrency, quoteCurrency] = alloc.symbol.split("/");
            const sourceType = alloc.marketType === "BINARY" ? "SPOT" : "ECO";
            if (alloc.baseAmount && alloc.baseAmount > 0) {
                const { wallet: sourceWallet } = fundingWallets.get(`${sourceType}|${baseCurrency}`);
                const transferIdempotencyKey = alloc.marketType === "BINARY"
                    ? `ct_follow_base_${follower.id}_${alloc.symbol}_BINARY`
                    : `ct_follow_base_${follower.id}_${alloc.symbol}`;
                const transferResult = await wallet_2.walletService.transfer({
                    idempotencyKey: transferIdempotencyKey,
                    fromUserId: user.id,
                    toUserId: user.id,
                    fromWalletType: sourceType,
                    toWalletType: "COPY_TRADING",
                    fromCurrency: baseCurrency,
                    toCurrency: baseCurrency,
                    amount: alloc.baseAmount,
                    description: `Transfer ${alloc.baseAmount} ${baseCurrency} from ${sourceType} to CT wallet for ${alloc.symbol}`,
                    metadata: {
                        followerId: follower.id,
                        leaderId,
                        symbol: alloc.symbol,
                        marketType: alloc.marketType,
                        currencyType: "BASE",
                    },
                    transaction: t,
                });
                await (0, settings_core_1.createCopyTradingTransaction)({
                    userId: user.id,
                    leaderId,
                    followerId: follower.id,
                    type: "ALLOCATION",
                    amount: -alloc.baseAmount,
                    currency: baseCurrency,
                    balanceBefore: transferResult.fromResult.previousBalance,
                    balanceAfter: transferResult.fromResult.newBalance,
                    description: `Transfer ${alloc.baseAmount} ${baseCurrency} from ${sourceType} to CT wallet for ${alloc.symbol}`,
                }, t);
                await (0, settings_core_1.createCopyTradingTransaction)({
                    userId: user.id,
                    leaderId,
                    followerId: follower.id,
                    type: "ALLOCATION",
                    amount: alloc.baseAmount,
                    currency: baseCurrency,
                    balanceBefore: transferResult.toResult.previousBalance,
                    balanceAfter: transferResult.toResult.newBalance,
                    description: `Received ${alloc.baseAmount} ${baseCurrency} in CT wallet for ${alloc.symbol}`,
                }, t);
                fundingWallets.set(`${sourceType}|${baseCurrency}`, {
                    wallet: sourceWallet,
                    balance: transferResult.fromResult.newBalance,
                });
            }
            if (alloc.quoteAmount && alloc.quoteAmount > 0) {
                const { wallet: sourceWallet } = fundingWallets.get(`${sourceType}|${quoteCurrency}`);
                const transferIdempotencyKey = alloc.marketType === "BINARY"
                    ? `ct_follow_quote_${follower.id}_${alloc.symbol}_BINARY`
                    : `ct_follow_quote_${follower.id}_${alloc.symbol}`;
                const transferResult = await wallet_2.walletService.transfer({
                    idempotencyKey: transferIdempotencyKey,
                    fromUserId: user.id,
                    toUserId: user.id,
                    fromWalletType: sourceType,
                    toWalletType: "COPY_TRADING",
                    fromCurrency: quoteCurrency,
                    toCurrency: quoteCurrency,
                    amount: alloc.quoteAmount,
                    description: `Transfer ${alloc.quoteAmount} ${quoteCurrency} from ${sourceType} to CT wallet for ${alloc.symbol}`,
                    metadata: {
                        followerId: follower.id,
                        leaderId,
                        symbol: alloc.symbol,
                        marketType: alloc.marketType,
                        currencyType: "QUOTE",
                    },
                    transaction: t,
                });
                await (0, settings_core_1.createCopyTradingTransaction)({
                    userId: user.id,
                    leaderId,
                    followerId: follower.id,
                    type: "ALLOCATION",
                    amount: -alloc.quoteAmount,
                    currency: quoteCurrency,
                    balanceBefore: transferResult.fromResult.previousBalance,
                    balanceAfter: transferResult.fromResult.newBalance,
                    description: `Transfer ${alloc.quoteAmount} ${quoteCurrency} from ${sourceType} to CT wallet for ${alloc.symbol}`,
                }, t);
                await (0, settings_core_1.createCopyTradingTransaction)({
                    userId: user.id,
                    leaderId,
                    followerId: follower.id,
                    type: "ALLOCATION",
                    amount: alloc.quoteAmount,
                    currency: quoteCurrency,
                    balanceBefore: transferResult.toResult.previousBalance,
                    balanceAfter: transferResult.toResult.newBalance,
                    description: `Received ${alloc.quoteAmount} ${quoteCurrency} in CT wallet for ${alloc.symbol}`,
                }, t);
                fundingWallets.set(`${sourceType}|${quoteCurrency}`, {
                    wallet: sourceWallet,
                    balance: transferResult.fromResult.newBalance,
                });
            }
            await db_1.models.copyTradingFollowerAllocation.create({
                followerId: follower.id,
                symbol: alloc.symbol,
                marketType: alloc.marketType,
                baseAmount: alloc.baseAmount || 0,
                baseUsedAmount: 0,
                quoteAmount: alloc.quoteAmount || 0,
                quoteUsedAmount: 0,
                isActive: true,
            }, { transaction: t });
        }
        await (0, settings_core_1.createAuditLog)({
            entityType: "FOLLOWER",
            entityId: follower.id,
            action: "FOLLOW",
            newValue: {
                ...follower.toJSON(),
                allocations: allocations,
            },
            userId: user.id,
        }, t);
        await t.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating leader stats");
        await (0, core_1.updateLeaderStats)(leaderId);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching subscription details");
        const subscription = await db_1.models.copyTradingFollower.findByPk(follower.id, {
            include: [
                {
                    model: db_1.models.copyTradingLeader,
                    as: "leader",
                    include: [
                        {
                            model: db_1.models.user,
                            as: "user",
                            attributes: ["id", "firstName", "lastName", "avatar"],
                        },
                        {
                            model: db_1.models.copyTradingLeaderMarket,
                            as: "markets",
                            where: { isActive: true },
                            required: false,
                        },
                    ],
                },
                {
                    model: db_1.models.copyTradingFollowerAllocation,
                    as: "allocations",
                    where: { isActive: true },
                    required: false,
                },
            ],
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending follower notification");
        const leaderUser = (_c = subscription === null || subscription === void 0 ? void 0 : subscription.leader) === null || _c === void 0 ? void 0 : _c.user;
        const leaderName = leaderUser ? `${leaderUser.firstName} ${leaderUser.lastName}` : undefined;
        await (0, notifications_1.notifyFollowerSubscriptionEvent)(follower.id, "STARTED", { leaderName }, ctx);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending leader notification");
        await (0, notifications_1.notifyLeaderNewFollower)(leaderId, user.id, ctx);
        try {
            const { allocationCurrencyLegs } = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/copy-trading/utils/allocationValue")));
            const { sumToUSDT } = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/copy-trading/utils/currency")));
            const legs = allocationCurrencyLegs(allocations);
            const totalAllocationUsd = legs.length > 0 ? await sumToUSDT(legs) : 0;
            if (totalAllocationUsd > 0 &&
                !(0, mobile_forbidden_1.isRewardSuppressedOnNativeApp)(data, "COPY_TRADING")) {
                await (0, affiliate_1.processRewards)(user.id, totalAllocationUsd, "COPY_TRADING", "USD", `COPY_TRADING:follower:${follower.id}`);
            }
        }
        catch (affiliateError) {
            console.error("Failed to process affiliate rewards:", affiliateError);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Successfully followed leader");
        return {
            message: "Successfully subscribed to leader with multi-market allocation",
            subscription: subscription === null || subscription === void 0 ? void 0 : subscription.toJSON(),
        };
    }
    catch (error) {
        await (0, transaction_1.rollbackIfActive)(t);
        throw error;
    }
};
