"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Update AI Market Maker bot operational status",
    operationId: "updateMarketMakerBotStatus",
    tags: ["Admin", "AI Market Maker", "Bot"],
    description: "Changes the operational status of an AI bot (ACTIVE, PAUSED, or COOLDOWN). Validates that bots can only be activated when their parent market maker is active. All status changes are logged in the market maker history with previous and new status details.",
    logModule: "ADMIN_MM",
    logTitle: "Update Bot Status",
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
                schema: {
                    type: "object",
                    properties: {
                        status: {
                            type: "string",
                            enum: ["ACTIVE", "PAUSED", "COOLDOWN"],
                            description: "New operational status for the bot",
                        },
                        cooldownMinutes: {
                            type: "number",
                            description: "Cooldown duration in minutes (only applicable when status is COOLDOWN)",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Bot status updated successfully with status change details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Success message with new status",
                            },
                            botId: {
                                type: "string",
                                description: "ID of the updated bot",
                            },
                            botName: {
                                type: "string",
                                description: "Name of the updated bot",
                            },
                            previousStatus: {
                                type: "string",
                                description: "Previous bot status",
                            },
                            newStatus: {
                                type: "string",
                                description: "New bot status",
                            },
                        },
                    },
                },
            },
        },
        400: {
            description: "Invalid status change request",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Error message (e.g., cannot activate bot when market maker is not active)",
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Bot or AI Market Maker"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.ai.market-maker.bot",
};
exports.default = async (data) => {
    const { params, body, ctx } = data;
    const { status, cooldownMinutes } = body;
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate market maker status");
    const marketMaker = await db_1.models.aiMarketMaker.findByPk(params.marketId);
    if (!marketMaker) {
        throw (0, error_1.createError)(404, "AI Market Maker not found");
    }
    if (status === "ACTIVE" && marketMaker.status !== "ACTIVE") {
        throw (0, error_1.createError)(400, "Cannot activate bot when market maker is not active");
    }
    const previousStatus = bot.status;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Update bot status");
    await bot.update({ status });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Create history record for status change");
    await db_1.models.aiMarketMakerHistory.create({
        marketMakerId: params.marketId,
        action: status === "PAUSED" ? "PAUSE" : "RESUME",
        details: {
            botId: bot.id,
            botName: bot.name,
            reason: `Bot status changed from ${previousStatus} to ${status}${status === "COOLDOWN" ? ` (cooldown: ${cooldownMinutes} minutes)` : ""}`,
            triggeredBy: "ADMIN",
        },
        priceAtAction: marketMaker.targetPrice,
        poolValueAtAction: 0,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Bot status updated successfully");
    return {
        message: `Bot status updated to ${status}`,
        botId: bot.id,
        botName: bot.name,
        previousStatus,
        newStatus: status,
    };
};
