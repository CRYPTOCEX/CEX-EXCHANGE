"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const utils_1 = require("../../utils");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Update AI Market Maker volatility configuration",
    operationId: "updateAiMarketMakerVolatility",
    tags: ["Admin", "AI Market Maker", "Market"],
    description: "Updates the volatility configuration for an AI Market Maker. Controls base volatility (daily percentage), volatility multiplier (phase-based adjustment), and momentum decay rate.",
    logModule: "ADMIN_MM",
    logTitle: "Update Market Maker Volatility",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the AI Market Maker",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.volatilityConfigUpdateSchema,
            },
        },
    },
    responses: {
        200: {
            description: "Volatility configuration updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            baseVolatility: { type: "number" },
                            volatilityMultiplier: { type: "number" },
                            momentumDecay: { type: "number" },
                        },
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("AI Market Maker Market"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.ai.market-maker.market",
};
exports.default = async (data) => {
    const { params, body, ctx } = data;
    const { baseVolatility, volatilityMultiplier, momentumDecay } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch market maker from database");
    const marketMaker = await db_1.models.aiMarketMaker.findByPk(params.id, {
        include: [{ model: db_1.models.aiMarketMakerPool, as: "pool" }],
    });
    if (!marketMaker) {
        throw (0, error_1.createError)(404, "AI Market Maker not found");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate volatility parameters");
    if (baseVolatility !== undefined) {
        if (baseVolatility < 0.1 || baseVolatility > 20) {
            throw (0, error_1.createError)(400, "Base volatility must be between 0.1 and 20 (representing 0.1% to 20% daily)");
        }
    }
    if (volatilityMultiplier !== undefined) {
        if (volatilityMultiplier < 0.5 || volatilityMultiplier > 2.0) {
            throw (0, error_1.createError)(400, "Volatility multiplier must be between 0.5 and 2.0");
        }
    }
    if (momentumDecay !== undefined) {
        if (momentumDecay < 0.8 || momentumDecay > 0.999) {
            throw (0, error_1.createError)(400, "Momentum decay must be between 0.8 and 0.999");
        }
    }
    const previousBaseVolatility = Number(marketMaker.baseVolatility);
    const previousMultiplier = Number(marketMaker.volatilityMultiplier);
    const previousDecay = Number(marketMaker.momentumDecay);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Update volatility configuration");
    const updateData = {};
    if (baseVolatility !== undefined) {
        updateData.baseVolatility = baseVolatility;
    }
    if (volatilityMultiplier !== undefined) {
        updateData.volatilityMultiplier = volatilityMultiplier;
    }
    if (momentumDecay !== undefined) {
        updateData.momentumDecay = momentumDecay;
    }
    if (Object.keys(updateData).length === 0) {
        throw (0, error_1.createError)(400, "At least one volatility parameter must be provided");
    }
    await marketMaker.update(updateData);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Create history record for config change");
    const pool = marketMaker.pool;
    await db_1.models.aiMarketMakerHistory.create({
        marketMakerId: marketMaker.id,
        action: "CONFIG_CHANGE",
        details: {
            field: "volatility",
            previousValue: { baseVolatility: previousBaseVolatility, multiplier: previousMultiplier, decay: previousDecay },
            newValue: { baseVolatility: baseVolatility !== null && baseVolatility !== void 0 ? baseVolatility : previousBaseVolatility, multiplier: volatilityMultiplier !== null && volatilityMultiplier !== void 0 ? volatilityMultiplier : previousMultiplier, decay: momentumDecay !== null && momentumDecay !== void 0 ? momentumDecay : previousDecay },
            triggeredBy: "ADMIN",
        },
        priceAtAction: Number(marketMaker.lastKnownPrice) || Number(marketMaker.targetPrice),
        poolValueAtAction: (pool === null || pool === void 0 ? void 0 : pool.totalValueLocked) || 0,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Volatility configuration updated successfully");
    return {
        message: "Volatility configuration updated successfully",
        baseVolatility: baseVolatility !== null && baseVolatility !== void 0 ? baseVolatility : previousBaseVolatility,
        volatilityMultiplier: volatilityMultiplier !== null && volatilityMultiplier !== void 0 ? volatilityMultiplier : previousMultiplier,
        momentumDecay: momentumDecay !== null && momentumDecay !== void 0 ? momentumDecay : previousDecay,
    };
};
