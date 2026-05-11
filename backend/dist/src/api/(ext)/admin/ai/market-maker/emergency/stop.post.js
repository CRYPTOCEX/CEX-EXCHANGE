"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const errors_1 = require("@b/utils/schema/errors");
const queries_1 = require("../utils/scylla/queries");
const matchingEngine_1 = require("@b/api/(ext)/ecosystem/utils/matchingEngine");
const cache_1 = require("@b/utils/cache");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Emergency stop all AI Market Maker operations",
    operationId: "emergencyStopAllMarketMakers",
    tags: ["Admin", "AI Market Maker", "Emergency"],
    description: "Immediately stops all AI Market Maker operations across the platform. This emergency endpoint halts all active market makers, pauses all associated AI bots, disables the global AI Market Maker feature, and optionally cancels all open orders in the ecosystem. All actions are performed within a database transaction and logged to the market maker history. Manual intervention is required to resume operations after an emergency stop.",
    logModule: "ADMIN_MM",
    logTitle: "Emergency Stop All Operations",
    requestBody: {
        required: false,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        reason: {
                            type: "string",
                            description: "Reason for emergency stop",
                        },
                        cancelOpenOrders: {
                            type: "boolean",
                            description: "Whether to cancel all open orders (default: true)",
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Emergency stop executed successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            marketsStopped: { type: "number" },
                            botsStopped: { type: "number" },
                            ordersCancelled: { type: "number" },
                            reason: { type: "string" },
                            timestamp: { type: "string" },
                            warning: { type: "string" },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.ai.market-maker.emergency",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const reason = (body === null || body === void 0 ? void 0 : body.reason) || "Emergency stop triggered by admin";
    const cancelOpenOrders = (body === null || body === void 0 ? void 0 : body.cancelOpenOrders) !== false;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Initialize database transaction");
    const transaction = await db_1.sequelize.transaction();
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch active markets and bots");
        const activeMarkets = await db_1.models.aiMarketMaker.findAll({
            where: { status: "ACTIVE" },
            include: [{ model: db_1.models.aiMarketMakerPool, as: "pool" }],
            transaction,
        });
        const activeBots = await db_1.models.aiBot.count({
            where: { status: "ACTIVE" },
            transaction,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Stop all markets and bots");
        await db_1.models.aiMarketMaker.update({ status: "STOPPED" }, {
            where: {},
            transaction
        });
        await db_1.models.aiBot.update({ status: "PAUSED" }, {
            where: {},
            transaction
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Update global settings");
        const cacheManager = cache_1.CacheManager.getInstance();
        await cacheManager.updateSetting("aiMarketMakerGlobalPauseEnabled", true);
        await cacheManager.updateSetting("aiMarketMakerEnabled", false);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Create history records for all markets");
        if (activeMarkets.length > 0) {
            const historyRecords = activeMarkets.map((market) => {
                const pool = market.pool;
                return {
                    marketMakerId: market.id,
                    action: "EMERGENCY_STOP",
                    details: {
                        reason,
                        triggeredBy: "ADMIN",
                        note: `Emergency stop from status: ${market.status}. Open orders cancelled: ${cancelOpenOrders}`,
                    },
                    priceAtAction: market.targetPrice,
                    poolValueAtAction: (pool === null || pool === void 0 ? void 0 : pool.totalValueLocked) || 0,
                };
            });
            await db_1.models.aiMarketMakerHistory.bulkCreate(historyRecords, { transaction });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Cancel all open orders");
        let ordersCancelled = 0;
        if (cancelOpenOrders) {
            const allMarketMakers = await db_1.models.aiMarketMaker.findAll({
                include: [{ model: db_1.models.ecosystemMarket, as: "market" }],
                transaction,
            });
            for (const maker of allMarketMakers) {
                const market = maker.market;
                if (market) {
                    const symbol = `${market.currency}/${market.pair}`;
                    try {
                        const openOrderIds = await (0, queries_1.getOpenBotEcosystemOrderIds)(symbol);
                        if (openOrderIds.length > 0) {
                            const matchingEngine = await matchingEngine_1.MatchingEngine.getInstance();
                            const cancelResults = await Promise.allSettled(openOrderIds.map((orderId) => matchingEngine.handleOrderCancellation(orderId, symbol)));
                            for (const result of cancelResults) {
                                if (result.status === "fulfilled") {
                                    ordersCancelled++;
                                }
                                else {
                                    console_1.logger.warn("AI_MM", "Failed to cancel order", result.reason);
                                }
                            }
                        }
                        await (0, queries_1.deleteAiBotOrdersByMarket)(maker.marketId);
                        console_1.logger.info("AI_MM", `Cleaned up orders for ${symbol}`);
                    }
                    catch (err) {
                        console_1.logger.error("AI_MM", `Error cleaning up ${symbol}`, err);
                    }
                }
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Commit transaction");
        await transaction.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Emergency stop executed successfully");
        return {
            message: "Emergency stop executed successfully",
            marketsStopped: activeMarkets.length,
            botsStopped: activeBots,
            ordersCancelled,
            reason,
            timestamp: new Date().toISOString(),
            warning: "All AI market maker operations have been stopped. Manual intervention required to resume.",
        };
    }
    catch (error) {
        await transaction.rollback();
        throw error;
    }
};
