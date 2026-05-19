"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/(ext)/copy-trading/utils");
const security_1 = require("@b/api/(ext)/copy-trading/utils/security");
const wallet_1 = require("@b/api/(ext)/ecosystem/utils/wallet");
const wallet_2 = require("@b/services/wallet");
const affiliate_1 = require("@b/utils/affiliate");
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
                                    baseAmount: {
                                        type: "number",
                                        minimum: 0,
                                        description: "Amount of base currency to allocate (for SELL orders)",
                                    },
                                    quoteAmount: {
                                        type: "number",
                                        minimum: 0,
                                        description: "Amount of quote currency to allocate (for BUY orders)",
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
    var _a, _b;
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for market conflicts");
    const conflictCheck = await (0, security_1.checkMarketConflict)(user.id, leaderId, allocations.map((a) => a.symbol));
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
        leaderMarketMap.set(m.symbol, m);
    }
    for (const alloc of allocations) {
        const leaderMarket = leaderMarketMap.get(alloc.symbol);
        if (!leaderMarket) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Market ${alloc.symbol} is not traded by this leader`,
            });
        }
        if ((!alloc.baseAmount || alloc.baseAmount <= 0) &&
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking eligibility");
    const eligibility = await (0, utils_1.checkFollowEligibility)(user.id, leaderId, 0);
    if (!eligibility.eligible) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: eligibility.reason || "Eligibility check failed",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating ECO wallet balances");
    const currencyAmounts = new Map();
    for (const alloc of allocations) {
        const [baseCurrency, quoteCurrency] = alloc.symbol.split("/");
        if (alloc.baseAmount && alloc.baseAmount > 0) {
            currencyAmounts.set(baseCurrency, (currencyAmounts.get(baseCurrency) || 0) + alloc.baseAmount);
        }
        if (alloc.quoteAmount && alloc.quoteAmount > 0) {
            currencyAmounts.set(quoteCurrency, (currencyAmounts.get(quoteCurrency) || 0) + alloc.quoteAmount);
        }
    }
    const ecoWallets = new Map();
    for (const [currency, requiredAmount] of currencyAmounts) {
        const ecoWallet = await (0, wallet_1.getWalletByUserIdAndCurrency)(user.id, currency, "ECO");
        if (!ecoWallet) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `ECO wallet not found for ${currency}`,
            });
        }
        const balance = parseFloat(((_a = ecoWallet.balance) === null || _a === void 0 ? void 0 : _a.toString()) || "0");
        if (balance < requiredAmount) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Insufficient ${currency} balance in ECO wallet. Required: ${requiredAmount.toFixed(8)}, Available: ${balance.toFixed(8)}`,
            });
        }
        ecoWallets.set(currency, { wallet: ecoWallet, balance });
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
            if (alloc.baseAmount && alloc.baseAmount > 0) {
                const { wallet: ecoWallet, balance: ecoBalance } = ecoWallets.get(baseCurrency);
                const transferIdempotencyKey = `ct_follow_base_${follower.id}_${alloc.symbol}`;
                const transferResult = await wallet_2.walletService.transfer({
                    idempotencyKey: transferIdempotencyKey,
                    fromUserId: user.id,
                    toUserId: user.id,
                    fromWalletType: "ECO",
                    toWalletType: "COPY_TRADING",
                    fromCurrency: baseCurrency,
                    toCurrency: baseCurrency,
                    amount: alloc.baseAmount,
                    description: `Transfer ${alloc.baseAmount} ${baseCurrency} from ECO to CT wallet for ${alloc.symbol}`,
                    metadata: {
                        followerId: follower.id,
                        leaderId,
                        symbol: alloc.symbol,
                        currencyType: "BASE",
                    },
                    transaction: t,
                });
                await (0, utils_1.createCopyTradingTransaction)({
                    userId: user.id,
                    leaderId,
                    followerId: follower.id,
                    type: "ALLOCATION",
                    amount: -alloc.baseAmount,
                    currency: baseCurrency,
                    balanceBefore: transferResult.fromResult.previousBalance,
                    balanceAfter: transferResult.fromResult.newBalance,
                    description: `Transfer ${alloc.baseAmount} ${baseCurrency} from ECO to CT wallet for ${alloc.symbol}`,
                }, t);
                await (0, utils_1.createCopyTradingTransaction)({
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
                ecoWallets.set(baseCurrency, {
                    wallet: ecoWallet,
                    balance: transferResult.fromResult.newBalance,
                });
            }
            if (alloc.quoteAmount && alloc.quoteAmount > 0) {
                const { wallet: ecoWallet, balance: ecoBalance } = ecoWallets.get(quoteCurrency);
                const transferIdempotencyKey = `ct_follow_quote_${follower.id}_${alloc.symbol}`;
                const transferResult = await wallet_2.walletService.transfer({
                    idempotencyKey: transferIdempotencyKey,
                    fromUserId: user.id,
                    toUserId: user.id,
                    fromWalletType: "ECO",
                    toWalletType: "COPY_TRADING",
                    fromCurrency: quoteCurrency,
                    toCurrency: quoteCurrency,
                    amount: alloc.quoteAmount,
                    description: `Transfer ${alloc.quoteAmount} ${quoteCurrency} from ECO to CT wallet for ${alloc.symbol}`,
                    metadata: {
                        followerId: follower.id,
                        leaderId,
                        symbol: alloc.symbol,
                        currencyType: "QUOTE",
                    },
                    transaction: t,
                });
                await (0, utils_1.createCopyTradingTransaction)({
                    userId: user.id,
                    leaderId,
                    followerId: follower.id,
                    type: "ALLOCATION",
                    amount: -alloc.quoteAmount,
                    currency: quoteCurrency,
                    balanceBefore: transferResult.fromResult.previousBalance,
                    balanceAfter: transferResult.fromResult.newBalance,
                    description: `Transfer ${alloc.quoteAmount} ${quoteCurrency} from ECO to CT wallet for ${alloc.symbol}`,
                }, t);
                await (0, utils_1.createCopyTradingTransaction)({
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
                ecoWallets.set(quoteCurrency, {
                    wallet: ecoWallet,
                    balance: transferResult.fromResult.newBalance,
                });
            }
            await db_1.models.copyTradingFollowerAllocation.create({
                followerId: follower.id,
                symbol: alloc.symbol,
                baseAmount: alloc.baseAmount || 0,
                baseUsedAmount: 0,
                quoteAmount: alloc.quoteAmount || 0,
                quoteUsedAmount: 0,
                isActive: true,
            }, { transaction: t });
        }
        await (0, utils_1.createAuditLog)({
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
        await (0, utils_1.updateLeaderStats)(leaderId);
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
        const leaderUser = (_b = subscription === null || subscription === void 0 ? void 0 : subscription.leader) === null || _b === void 0 ? void 0 : _b.user;
        const leaderName = leaderUser ? `${leaderUser.firstName} ${leaderUser.lastName}` : undefined;
        await (0, utils_1.notifyFollowerSubscriptionEvent)(follower.id, "STARTED", { leaderName }, ctx);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending leader notification");
        await (0, utils_1.notifyLeaderNewFollower)(leaderId, user.id, ctx);
        try {
            let totalAllocation = 0;
            for (const alloc of allocations) {
                totalAllocation += (alloc.quoteAmount || 0) + (alloc.baseAmount || 0);
            }
            if (totalAllocation > 0) {
                await (0, affiliate_1.processRewards)(user.id, totalAllocation, "COPY_TRADING", "USD", `COPY_TRADING:follower:${follower.id}`);
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
        await t.rollback();
        throw error;
    }
};
