"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const utils_1 = require("../../../utils");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Update AI Market Maker bot trading configuration",
    operationId: "updateMarketMakerBotConfig",
    tags: ["Admin", "AI Market Maker", "Bot"],
    description: "Updates the trading configuration parameters for a specific AI bot. Supports modifying risk tolerance, trade frequency, order size settings, and daily trade limits. All configuration changes are tracked in the market maker history with before/after values.",
    logModule: "ADMIN_MM",
    logTitle: "Update Bot Configuration",
    parameters: [
        {
            index: 0,
            name: "marketId",
            in: "path",
            required: true,
            description: "ID of the AI Market Maker",
            schema: { type: "string" },
        },
        {
            index: 1,
            name: "botId",
            in: "path",
            required: true,
            description: "ID of the bot to update",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.aiBotUpdateSchema,
            },
        },
    },
    responses: {
        200: {
            description: "Bot configuration updated successfully with change details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Success message",
                            },
                            bot: {
                                type: "object",
                                description: "Updated bot configuration",
                                properties: utils_1.aiBotSchema,
                            },
                            changesApplied: {
                                type: "number",
                                description: "Number of configuration fields that were changed",
                            },
                        },
                    },
                },
            },
        },
        400: {
            description: "Invalid configuration parameters",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Error message (e.g., risk tolerance out of range)",
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Bot"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.ai.market-maker.bot",
};
exports.default = async (data) => {
    const { params, body, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch bot from database");
    const bot = await db_1.models.aiBot.findOne({
        where: {
            id: params.botId,
            marketMakerId: params.marketId,
        },
    });
    if (!bot) {
        throw (0, error_1.createError)(404, "Bot not found");
    }
    const { riskTolerance, tradeFrequency, avgOrderSize, orderSizeVariance, preferredSpread, maxDailyTrades, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate bot configuration parameters");
    if (riskTolerance !== undefined) {
        if (riskTolerance < 0 || riskTolerance > 1) {
            throw (0, error_1.createError)(400, "Risk tolerance must be between 0 and 1");
        }
    }
    if (orderSizeVariance !== undefined) {
        if (orderSizeVariance < 0 || orderSizeVariance > 0.5) {
            throw (0, error_1.createError)(400, "Order size variance must be between 0 and 0.5 (50%)");
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Track configuration changes");
    const changes = {};
    if (riskTolerance !== undefined && riskTolerance !== bot.riskTolerance) {
        changes.riskTolerance = { old: bot.riskTolerance, new: riskTolerance };
    }
    if (tradeFrequency !== undefined && tradeFrequency !== bot.tradeFrequency) {
        changes.tradeFrequency = { old: bot.tradeFrequency, new: tradeFrequency };
    }
    if (avgOrderSize !== undefined && avgOrderSize !== Number(bot.avgOrderSize)) {
        changes.avgOrderSize = { old: bot.avgOrderSize, new: avgOrderSize };
    }
    if (maxDailyTrades !== undefined && maxDailyTrades !== bot.maxDailyTrades) {
        changes.maxDailyTrades = { old: bot.maxDailyTrades, new: maxDailyTrades };
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Update bot configuration");
    await bot.update({
        ...(riskTolerance !== undefined && { riskTolerance }),
        ...(tradeFrequency !== undefined && { tradeFrequency }),
        ...(avgOrderSize !== undefined && { avgOrderSize }),
        ...(orderSizeVariance !== undefined && { orderSizeVariance }),
        ...(preferredSpread !== undefined && { preferredSpread }),
        ...(maxDailyTrades !== undefined && { maxDailyTrades }),
    });
    if (Object.keys(changes).length > 0) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Create history record for configuration changes");
        const marketMaker = await db_1.models.aiMarketMaker.findByPk(params.marketId);
        await db_1.models.aiMarketMakerHistory.create({
            marketMakerId: params.marketId,
            action: "CONFIG_CHANGE",
            details: {
                botId: bot.id,
                botName: bot.name,
                field: "botConfig",
                previousValue: Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, v.old])),
                newValue: Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, v.new])),
                triggeredBy: "ADMIN",
            },
            priceAtAction: (marketMaker === null || marketMaker === void 0 ? void 0 : marketMaker.targetPrice) || 0,
            poolValueAtAction: 0,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch updated bot data");
    const updatedBot = await db_1.models.aiBot.findByPk(params.botId);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Bot configuration updated successfully");
    return {
        message: "Bot configuration updated successfully",
        bot: updatedBot,
        changesApplied: Object.keys(changes).length,
    };
};
