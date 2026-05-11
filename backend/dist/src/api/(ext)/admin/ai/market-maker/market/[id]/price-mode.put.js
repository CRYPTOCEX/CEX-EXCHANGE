"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const utils_1 = require("../../utils");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Update AI Market Maker price mode",
    operationId: "updateAiMarketMakerPriceMode",
    tags: ["Admin", "AI Market Maker", "Market"],
    description: "Updates the price mode settings for an AI Market Maker. AUTONOMOUS mode generates prices independently, FOLLOW_EXTERNAL tracks an external exchange price, and HYBRID combines both approaches with configurable correlation.",
    logModule: "ADMIN_MM",
    logTitle: "Update Market Maker Price Mode",
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
                schema: utils_1.priceModeUpdateSchema,
            },
        },
    },
    responses: {
        200: {
            description: "Price mode updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            priceMode: { type: "string" },
                            externalSymbol: { type: "string" },
                            correlationStrength: { type: "number" },
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
    const { priceMode, externalSymbol, correlationStrength } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch market maker from database");
    const marketMaker = await db_1.models.aiMarketMaker.findByPk(params.id, {
        include: [{ model: db_1.models.aiMarketMakerPool, as: "pool" }],
    });
    if (!marketMaker) {
        throw (0, error_1.createError)(404, "AI Market Maker not found");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate price mode configuration");
    if ((priceMode === "FOLLOW_EXTERNAL" || priceMode === "HYBRID") &&
        !externalSymbol) {
        throw (0, error_1.createError)(400, "External symbol is required for FOLLOW_EXTERNAL and HYBRID price modes");
    }
    if (correlationStrength !== undefined) {
        if (correlationStrength < 0 || correlationStrength > 100) {
            throw (0, error_1.createError)(400, "Correlation strength must be between 0 and 100");
        }
    }
    const previousMode = marketMaker.priceMode;
    const previousSymbol = marketMaker.externalSymbol;
    const previousCorrelation = Number(marketMaker.correlationStrength);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Update price mode configuration");
    const updateData = {
        priceMode,
    };
    if (externalSymbol !== undefined) {
        updateData.externalSymbol = externalSymbol;
    }
    if (correlationStrength !== undefined) {
        updateData.correlationStrength = correlationStrength;
    }
    await marketMaker.update(updateData);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Create history record for config change");
    const pool = marketMaker.pool;
    await db_1.models.aiMarketMakerHistory.create({
        marketMakerId: marketMaker.id,
        action: "CONFIG_CHANGE",
        details: {
            field: "priceMode",
            previousValue: { mode: previousMode, symbol: previousSymbol, correlation: previousCorrelation },
            newValue: { mode: priceMode, symbol: externalSymbol || null, correlation: correlationStrength !== null && correlationStrength !== void 0 ? correlationStrength : previousCorrelation },
            triggeredBy: "ADMIN",
        },
        priceAtAction: Number(marketMaker.lastKnownPrice) || Number(marketMaker.targetPrice),
        poolValueAtAction: (pool === null || pool === void 0 ? void 0 : pool.totalValueLocked) || 0,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Price mode updated successfully");
    return {
        message: "Price mode updated successfully",
        priceMode,
        externalSymbol: externalSymbol || marketMaker.externalSymbol,
        correlationStrength: correlationStrength !== null && correlationStrength !== void 0 ? correlationStrength : previousCorrelation,
    };
};
