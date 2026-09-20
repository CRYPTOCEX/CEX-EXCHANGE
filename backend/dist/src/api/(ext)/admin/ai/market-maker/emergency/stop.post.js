"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const errors_1 = require("@b/utils/schema/errors");
const queries_1 = require("../utils/scylla/queries");
const MarketMakerEngine_1 = __importDefault(require("../utils/engine/MarketMakerEngine"));
const cache_1 = require("@b/utils/cache");
const console_1 = require("@b/utils/console");
const market_resolver_1 = require("../utils/venue/market-resolver");
const futures_orders_1 = require("../utils/venue/futures-orders");
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
                            ordersStillResting: { type: "number" },
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
    permission: "manage.ai.market_maker.emergency",
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
            where: { status: { [sequelize_1.Op.ne]: "STOPPED" } },
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
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Commit transaction");
        await transaction.commit();
        let engineHalted = false;
        try {
            await MarketMakerEngine_1.default.emergencyStop();
            engineHalted = true;
        }
        catch (engineError) {
            console_1.logger.error("AI_MM", `EMERGENCY_STOP could not halt the running engine: ${engineError === null || engineError === void 0 ? void 0 : engineError.message}`, engineError);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Cancel all open orders");
        let ordersCancelled = 0;
        let ordersStillResting = 0;
        if (cancelOpenOrders) {
            try {
                const allMarketMakers = (0, market_resolver_1.hydrateMakerMarkets)(await db_1.models.aiMarketMaker.findAll({
                    include: [...(0, market_resolver_1.makerMarketIncludes)()],
                }));
                for (const maker of allMarketMakers) {
                    const market = maker.market;
                    if (market) {
                        const symbol = (0, market_resolver_1.marketSymbol)(market.currency, market.pair);
                        try {
                            const outcome = (0, market_resolver_1.normaliseVenue)(maker.marketType) === "FUTURES"
                                ? await (0, futures_orders_1.cancelAllPoolOrders)(symbol)
                                : await (0, queries_1.cancelOpenBotEcosystemOrders)(symbol);
                            ordersCancelled += outcome.cancelled;
                            ordersStillResting += outcome.failed.length;
                            if (outcome.failed.length) {
                                console_1.logger.warn("AI_MM", `EMERGENCY_STOP: ${outcome.failed.length} bot order(s) on ${symbol} could ` +
                                    `NOT be cancelled and are still resting: ` +
                                    outcome.failed.map((f) => `${f.orderId} (${f.error})`).join(", "));
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
            catch (cancelErr) {
                console_1.logger.warn("AI_MM", `EMERGENCY_STOP order cancellation failed: ${cancelErr === null || cancelErr === void 0 ? void 0 : cancelErr.message}`, cancelErr);
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Emergency stop executed successfully");
        return {
            message: "Emergency stop executed successfully",
            marketsStopped: activeMarkets.length,
            botsStopped: activeBots,
            engineHalted,
            ordersCancelled,
            ordersStillResting,
            reason,
            timestamp: new Date().toISOString(),
            warning: ordersStillResting > 0
                ? `All AI market maker operations have been stopped, but ${ordersStillResting} bot ` +
                    `order(s) could not be cancelled and are STILL RESTING in the public book. ` +
                    `Manual intervention required.`
                : "All AI market maker operations have been stopped. Manual intervention required to resume.",
        };
    }
    catch (error) {
        if (!transaction.finished) {
            await transaction.rollback();
        }
        throw error;
    }
};
