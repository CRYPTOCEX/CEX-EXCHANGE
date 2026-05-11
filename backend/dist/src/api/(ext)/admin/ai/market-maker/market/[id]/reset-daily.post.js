"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const MarketMakerEngine_1 = __importDefault(require("../../utils/engine/MarketMakerEngine"));
exports.metadata = {
    summary: "Reset daily trade counts for a market maker",
    description: "Resets the daily trade counts for all bots and the daily volume for a specific market maker. Use this when bots have hit their daily limit mid-day.",
    operationId: "resetMarketMakerDaily",
    tags: ["Admin", "AI Market Maker"],
    requiresAuth: true,
    permission: "edit.ai.market-maker.market",
    params: {
        type: "object",
        properties: {
            id: {
                type: "string",
                description: "Market Maker ID",
            },
        },
        required: ["id"],
    },
    responses: {
        200: {
            description: "Daily counts reset successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            message: { type: "string" },
                            botsReset: { type: "number" },
                        },
                    },
                },
            },
        },
        404: {
            description: "Market maker not found",
        },
    },
};
exports.default = async (data) => {
    const { params } = data;
    const { id } = params;
    const marketMaker = await db_1.models.aiMarketMaker.findByPk(id, {
        include: [{ model: db_1.models.aiBot, as: "bots" }],
    });
    if (!marketMaker) {
        throw (0, error_1.createError)(404, "Market maker not found");
    }
    await db_1.models.aiMarketMaker.update({ currentDailyVolume: 0 }, { where: { id } });
    const [botsReset] = await db_1.models.aiBot.update({ dailyTradeCount: 0 }, { where: { marketMakerId: id } });
    console_1.logger.info("AI_MM", `Manual daily reset for market ${id}: ${botsReset} bots reset`);
    const engine = MarketMakerEngine_1.default;
    const marketManager = engine.getMarketManager();
    if (marketManager) {
        const instance = marketManager.getMarketInstance(id);
        if (instance) {
            const freshData = await db_1.models.aiMarketMaker.findByPk(id, {
                include: [
                    { model: db_1.models.aiMarketMakerPool, as: "pool" },
                    { model: db_1.models.ecosystemMarket, as: "market" },
                    { model: db_1.models.aiBot, as: "bots" },
                ],
            });
            if (freshData) {
                instance.updateConfig(freshData);
            }
        }
    }
    await db_1.models.aiMarketMakerHistory.create({
        marketMakerId: id,
        action: "CONFIG_CHANGE",
        details: {
            field: "dailyReset",
            previousValue: null,
            newValue: { botsReset },
            triggeredBy: "ADMIN",
            note: "Manual daily trade count reset",
        },
        priceAtAction: marketMaker.targetPrice || 0,
        poolValueAtAction: 0,
    });
    return {
        success: true,
        message: `Daily counts reset successfully. ${botsReset} bots reset.`,
        botsReset,
    };
};
