"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/(ext)/copy-trading/utils");
const security_1 = require("@b/api/(ext)/copy-trading/utils/security");
const wallet_1 = require("@b/services/wallet");
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
                        baseAmount: {
                            type: "number",
                            minimum: 0,
                            description: "Initial base currency amount for selling",
                        },
                        quoteAmount: {
                            type: "number",
                            minimum: 0,
                            description: "Initial quote currency amount for buying",
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
    const { id } = params;
    const { symbol, baseAmount = 0, quoteAmount = 0 } = body;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
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
            isActive: true,
        },
    });
    if (!leaderMarket) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Market ${symbol} is not available for this leader`,
        });
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
        where: { followerId: id, symbol },
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
    await db_1.sequelize.transaction(async (transaction) => {
        allocation = await db_1.models.copyTradingFollowerAllocation.create({
            followerId: id,
            symbol,
            baseAmount: 0,
            quoteAmount: 0,
            isActive: false,
        }, { transaction });
        const allocationIdempotencyKey = `follower_allocation_${id}_${allocation.id}`;
        if (baseAmt > 0) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step(`Transferring ${baseAmt} ${baseCurrency} from ECO to COPY_TRADING wallet`);
            const transferResult = await wallet_1.walletService.transfer({
                idempotencyKey: `${allocationIdempotencyKey}_base`,
                fromUserId: user.id,
                toUserId: user.id,
                fromWalletType: "ECO",
                toWalletType: "COPY_TRADING",
                fromCurrency: baseCurrency,
                toCurrency: baseCurrency,
                amount: baseAmt,
                description: `Transfer ${baseAmt} ${baseCurrency} from ECO to CT wallet (allocate to ${symbol})`,
                metadata: {
                    symbol,
                    currencyType: "BASE",
                    followerId: id,
                    leaderId: subscription.leaderId,
                    allocationId: allocation.id,
                },
                transaction,
            });
            await (0, utils_1.createCopyTradingTransaction)({
                userId: user.id,
                leaderId: subscription.leaderId,
                followerId: id,
                type: "ALLOCATION",
                amount: baseAmt,
                currency: baseCurrency,
                balanceBefore: transferResult.fromResult.previousBalance,
                balanceAfter: transferResult.fromResult.newBalance,
                description: `Transfer ${baseAmt} ${baseCurrency} from ECO to CT wallet (allocate to ${symbol})`,
                metadata: JSON.stringify({
                    symbol,
                    currencyType: "BASE",
                    allocationId: allocation.id,
                }),
            }, transaction);
        }
        if (quoteAmt > 0) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step(`Transferring ${quoteAmt} ${quoteCurrency} from ECO to COPY_TRADING wallet`);
            const transferResult = await wallet_1.walletService.transfer({
                idempotencyKey: `${allocationIdempotencyKey}_quote`,
                fromUserId: user.id,
                toUserId: user.id,
                fromWalletType: "ECO",
                toWalletType: "COPY_TRADING",
                fromCurrency: quoteCurrency,
                toCurrency: quoteCurrency,
                amount: quoteAmt,
                description: `Transfer ${quoteAmt} ${quoteCurrency} from ECO to CT wallet (allocate to ${symbol})`,
                metadata: {
                    symbol,
                    currencyType: "QUOTE",
                    followerId: id,
                    leaderId: subscription.leaderId,
                    allocationId: allocation.id,
                },
                transaction,
            });
            await (0, utils_1.createCopyTradingTransaction)({
                userId: user.id,
                leaderId: subscription.leaderId,
                followerId: id,
                type: "ALLOCATION",
                amount: quoteAmt,
                currency: quoteCurrency,
                balanceBefore: transferResult.fromResult.previousBalance,
                balanceAfter: transferResult.fromResult.newBalance,
                description: `Transfer ${quoteAmt} ${quoteCurrency} from ECO to CT wallet (allocate to ${symbol})`,
                metadata: JSON.stringify({
                    symbol,
                    currencyType: "QUOTE",
                    allocationId: allocation.id,
                }),
            }, transaction);
        }
        await allocation.update({
            baseAmount: baseAmt,
            quoteAmount: quoteAmt,
            isActive: true,
        }, { transaction });
        await (0, utils_1.createAuditLog)({
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
