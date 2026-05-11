"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const utils_1 = require("../../utils");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Update AI Market Maker market bias",
    operationId: "updateAiMarketMakerMarketBias",
    tags: ["Admin", "AI Market Maker", "Market"],
    description: "Updates the market bias settings for an AI Market Maker. The bias influences phase transitions and price target calculations, guiding the market toward bullish or bearish behavior.",
    logModule: "ADMIN_MM",
    logTitle: "Update Market Maker Bias",
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
                schema: utils_1.biasUpdateSchema,
            },
        },
    },
    responses: {
        200: {
            description: "Market bias updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            previousBias: { type: "string" },
                            newBias: { type: "string" },
                            previousStrength: { type: "number" },
                            newStrength: { type: "number" },
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
    const { marketBias, biasStrength } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch market maker from database");
    const marketMaker = await db_1.models.aiMarketMaker.findByPk(params.id, {
        include: [{ model: db_1.models.aiMarketMakerPool, as: "pool" }],
    });
    if (!marketMaker) {
        throw (0, error_1.createError)(404, "AI Market Maker not found");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate bias strength");
    if (biasStrength < 0 || biasStrength > 100) {
        throw (0, error_1.createError)(400, "Bias strength must be between 0 and 100");
    }
    const previousBias = marketMaker.marketBias;
    const previousStrength = Number(marketMaker.biasStrength);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Update market bias");
    await marketMaker.update({
        marketBias,
        biasStrength,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Create history record for bias change");
    const pool = marketMaker.pool;
    await db_1.models.aiMarketMakerHistory.create({
        marketMakerId: marketMaker.id,
        action: "BIAS_CHANGE",
        details: {
            previousBias,
            newBias: marketBias,
            previousBiasStrength: previousStrength,
            newBiasStrength: biasStrength,
            triggeredBy: "ADMIN",
        },
        priceAtAction: Number(marketMaker.lastKnownPrice) || Number(marketMaker.targetPrice),
        poolValueAtAction: (pool === null || pool === void 0 ? void 0 : pool.totalValueLocked) || 0,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Market bias updated successfully");
    return {
        message: "Market bias updated successfully",
        previousBias,
        newBias: marketBias,
        previousStrength,
        newStrength: biasStrength,
    };
};
