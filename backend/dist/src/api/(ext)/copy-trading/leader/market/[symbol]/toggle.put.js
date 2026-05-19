"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/(ext)/copy-trading/utils");
const wallet_1 = require("@b/services/wallet");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Toggle leader market status",
    description: "Enables or disables a market for the leader. When disabling a market with follower allocations, refunds are automatically processed.",
    operationId: "toggleLeaderMarket",
    tags: ["Copy Trading", "Leader"],
    requiresAuth: true,
    logModule: "COPY",
    logTitle: "Toggle leader market",
    parameters: [
        {
            name: "symbol",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Market symbol (URL encoded, e.g., BTC%2FUSDT)",
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        isActive: {
                            type: "boolean",
                            description: "Whether to enable (true) or disable (false) the market",
                        },
                    },
                    required: ["isActive"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Market status toggled successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            message: { type: "string" },
                            market: { type: "object" },
                            refundedAllocations: { type: "number" },
                        },
                    },
                },
            },
        },
        400: { description: "Bad Request - Has open positions" },
        401: { description: "Unauthorized" },
        404: { description: "Leader or Market not found" },
    },
};
exports.default = async (data) => {
    const { user, params, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const symbol = decodeURIComponent(params.symbol);
    const { isActive } = body;
    if (typeof isActive !== "boolean") {
        throw (0, error_1.createError)({ statusCode: 400, message: "isActive must be a boolean" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding leader profile");
    const leader = await db_1.models.copyTradingLeader.findOne({
        where: { userId: user.id },
    });
    if (!leader) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Leader not found" });
    }
    const leaderId = leader.id;
    const parts = symbol.split("/");
    if (parts.length !== 2) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid symbol format. Use BASE/QUOTE (e.g., BTC/USDT)",
        });
    }
    const [baseCurrency, quoteCurrency] = parts;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding market");
    let leaderMarket = await db_1.models.copyTradingLeaderMarket.findOne({
        where: { leaderId, symbol },
    });
    if (isActive && !leaderMarket) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating market exists in ecosystem");
        const ecoMarket = await db_1.models.ecosystemMarket.findOne({
            where: { currency: baseCurrency, pair: quoteCurrency, status: true },
        });
        if (!ecoMarket) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Market ${symbol} not found or inactive in ecosystem`,
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating new market entry");
        leaderMarket = await db_1.models.copyTradingLeaderMarket.create({
            leaderId,
            symbol,
            baseCurrency,
            quoteCurrency,
            isActive: true,
        });
        await (0, utils_1.createAuditLog)({
            entityType: "LEADER",
            entityId: leaderId,
            action: "UPDATE",
            newValue: { symbol, baseCurrency, quoteCurrency, isActive: true },
            userId: user.id,
            reason: "Market enabled",
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Market enabled");
        return {
            success: true,
            message: `Market ${symbol} enabled`,
            market: leaderMarket,
            refundedAllocations: 0,
        };
    }
    if (!leaderMarket) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Market not found" });
    }
    const currentStatus = leaderMarket.isActive;
    if (currentStatus === isActive) {
        return {
            success: true,
            message: `Market ${symbol} is already ${isActive ? "enabled" : "disabled"}`,
            market: leaderMarket,
            refundedAllocations: 0,
        };
    }
    if (!isActive) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for open positions");
        const openTrades = await db_1.models.copyTradingTrade.count({
            where: {
                leaderId,
                symbol,
                status: { [sequelize_1.Op.in]: ["OPEN", "PENDING", "PARTIALLY_FILLED"] },
            },
        });
        if (openTrades > 0) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Cannot disable market with ${openTrades} open positions. Please close all positions first.`,
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding follower allocations to refund");
        const allocations = await db_1.models.copyTradingFollowerAllocation.findAll({
            where: { symbol, isActive: true },
            include: [
                {
                    model: db_1.models.copyTradingFollower,
                    as: "follower",
                    where: { leaderId },
                    attributes: ["id", "userId"],
                },
            ],
        });
        let refundedCount = 0;
        if (allocations.length > 0) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step(`Refunding ${allocations.length} follower allocations`);
            await db_1.sequelize.transaction(async (transaction) => {
                for (const allocation of allocations) {
                    const alloc = allocation;
                    const follower = alloc.follower;
                    const baseToRefund = Math.max(0, alloc.baseAmount - alloc.baseUsedAmount);
                    const quoteToRefund = Math.max(0, alloc.quoteAmount - alloc.quoteUsedAmount);
                    if (baseToRefund > 0) {
                        const transferIdempotencyKey = `ct_toggle_base_${alloc.id}`;
                        const transferResult = await wallet_1.walletService.transfer({
                            idempotencyKey: transferIdempotencyKey,
                            fromUserId: follower.userId,
                            toUserId: follower.userId,
                            fromWalletType: "COPY_TRADING",
                            toWalletType: "ECO",
                            fromCurrency: baseCurrency,
                            toCurrency: baseCurrency,
                            amount: baseToRefund,
                            description: `Transfer ${baseToRefund} ${baseCurrency} from CT to ECO wallet (leader disabled ${symbol})`,
                            metadata: {
                                allocationId: alloc.id,
                                symbol,
                                reason: "LEADER_MARKET_DISABLED",
                            },
                            transaction,
                        });
                        await (0, utils_1.createCopyTradingTransaction)({
                            userId: follower.userId,
                            leaderId,
                            followerId: follower.id,
                            type: "DEALLOCATION",
                            amount: -baseToRefund,
                            currency: baseCurrency,
                            balanceBefore: transferResult.fromResult.previousBalance,
                            balanceAfter: transferResult.fromResult.newBalance,
                            description: `Transfer ${baseToRefund} ${baseCurrency} from CT to ECO wallet (leader disabled ${symbol})`,
                            metadata: JSON.stringify({
                                allocationId: alloc.id,
                                symbol,
                                reason: "LEADER_MARKET_DISABLED",
                            }),
                        }, transaction);
                        await (0, utils_1.createCopyTradingTransaction)({
                            userId: follower.userId,
                            leaderId,
                            followerId: follower.id,
                            type: "DEALLOCATION",
                            amount: baseToRefund,
                            currency: baseCurrency,
                            balanceBefore: transferResult.toResult.previousBalance,
                            balanceAfter: transferResult.toResult.newBalance,
                            description: `Received ${baseToRefund} ${baseCurrency} in ECO wallet (leader disabled ${symbol})`,
                            metadata: JSON.stringify({
                                allocationId: alloc.id,
                                symbol,
                                reason: "LEADER_MARKET_DISABLED",
                            }),
                        }, transaction);
                    }
                    if (quoteToRefund > 0) {
                        const transferIdempotencyKey = `ct_toggle_quote_${alloc.id}`;
                        const transferResult = await wallet_1.walletService.transfer({
                            idempotencyKey: transferIdempotencyKey,
                            fromUserId: follower.userId,
                            toUserId: follower.userId,
                            fromWalletType: "COPY_TRADING",
                            toWalletType: "ECO",
                            fromCurrency: quoteCurrency,
                            toCurrency: quoteCurrency,
                            amount: quoteToRefund,
                            description: `Transfer ${quoteToRefund} ${quoteCurrency} from CT to ECO wallet (leader disabled ${symbol})`,
                            metadata: {
                                allocationId: alloc.id,
                                symbol,
                                reason: "LEADER_MARKET_DISABLED",
                            },
                            transaction,
                        });
                        await (0, utils_1.createCopyTradingTransaction)({
                            userId: follower.userId,
                            leaderId,
                            followerId: follower.id,
                            type: "DEALLOCATION",
                            amount: -quoteToRefund,
                            currency: quoteCurrency,
                            balanceBefore: transferResult.fromResult.previousBalance,
                            balanceAfter: transferResult.fromResult.newBalance,
                            description: `Transfer ${quoteToRefund} ${quoteCurrency} from CT to ECO wallet (leader disabled ${symbol})`,
                            metadata: JSON.stringify({
                                allocationId: alloc.id,
                                symbol,
                                reason: "LEADER_MARKET_DISABLED",
                            }),
                        }, transaction);
                        await (0, utils_1.createCopyTradingTransaction)({
                            userId: follower.userId,
                            leaderId,
                            followerId: follower.id,
                            type: "DEALLOCATION",
                            amount: quoteToRefund,
                            currency: quoteCurrency,
                            balanceBefore: transferResult.toResult.previousBalance,
                            balanceAfter: transferResult.toResult.newBalance,
                            description: `Received ${quoteToRefund} ${quoteCurrency} in ECO wallet (leader disabled ${symbol})`,
                            metadata: JSON.stringify({
                                allocationId: alloc.id,
                                symbol,
                                reason: "LEADER_MARKET_DISABLED",
                            }),
                        }, transaction);
                    }
                    await alloc.update({
                        isActive: false,
                        baseAmount: alloc.baseUsedAmount,
                        quoteAmount: alloc.quoteUsedAmount,
                    }, { transaction });
                    refundedCount++;
                }
                await leaderMarket.update({ isActive: false }, { transaction });
            });
            await (0, utils_1.createAuditLog)({
                entityType: "LEADER",
                entityId: leaderId,
                action: "UPDATE",
                oldValue: { symbol, isActive: true },
                newValue: { symbol, isActive: false, refundedAllocations: refundedCount },
                userId: user.id,
                reason: `Market disabled, ${refundedCount} allocations refunded`,
            });
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`Market disabled, ${refundedCount} allocations refunded`);
            return {
                success: true,
                message: `Market ${symbol} disabled. ${refundedCount} follower allocation(s) refunded.`,
                market: await leaderMarket.reload(),
                refundedAllocations: refundedCount,
            };
        }
        await leaderMarket.update({ isActive: false });
        await (0, utils_1.createAuditLog)({
            entityType: "LEADER",
            entityId: leaderId,
            action: "UPDATE",
            oldValue: { symbol, isActive: true },
            newValue: { symbol, isActive: false },
            userId: user.id,
            reason: "Market disabled",
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Market disabled");
        return {
            success: true,
            message: `Market ${symbol} disabled`,
            market: leaderMarket,
            refundedAllocations: 0,
        };
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Enabling market");
    await leaderMarket.update({ isActive: true });
    await (0, utils_1.createAuditLog)({
        entityType: "LEADER",
        entityId: leaderId,
        action: "UPDATE",
        oldValue: { symbol, isActive: false },
        newValue: { symbol, isActive: true },
        userId: user.id,
        reason: "Market enabled",
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Market enabled");
    return {
        success: true,
        message: `Market ${symbol} enabled`,
        market: leaderMarket,
        refundedAllocations: 0,
    };
};
