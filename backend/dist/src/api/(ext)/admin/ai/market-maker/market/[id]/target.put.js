"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const utils_1 = require("../../utils");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Update AI Market Maker market target price",
    operationId: "updateAiMarketMakerMarketTargetPrice",
    tags: ["Admin", "AI Market Maker", "Market"],
    description: "Updates the target price for an AI Market Maker market. Validates that the new target price falls within the configured price range, calculates percentage change from previous target, warns about large price changes (>5%), and logs the change to history with pool value at time of action.",
    logModule: "ADMIN_MM",
    logTitle: "Update Market Maker Target Price",
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
                schema: utils_1.targetPriceUpdateSchema,
            },
        },
    },
    responses: {
        200: {
            description: "Target price updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            previousTarget: { type: "number" },
                            newTarget: { type: "number" },
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
    const { targetPrice } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch market maker from database");
    const marketMaker = await db_1.models.aiMarketMaker.findByPk(params.id, {
        include: [{ model: db_1.models.aiMarketMakerPool, as: "pool" }],
    });
    if (!marketMaker) {
        throw (0, error_1.createError)(404, "AI Market Maker not found");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate target price");
    if (targetPrice < Number(marketMaker.priceRangeLow) ||
        targetPrice > Number(marketMaker.priceRangeHigh)) {
        throw (0, error_1.createError)(400, `Target price must be within range: ${marketMaker.priceRangeLow} - ${marketMaker.priceRangeHigh}`);
    }
    const previousTarget = Number(marketMaker.targetPrice);
    const percentChange = ((targetPrice - previousTarget) / previousTarget) * 100;
    const isLargeChange = Math.abs(percentChange) > 5;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Update target price");
    await marketMaker.update({ targetPrice });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Create history record for target price change");
    const pool = marketMaker.pool;
    await db_1.models.aiMarketMakerHistory.create({
        marketMakerId: marketMaker.id,
        action: "TARGET_CHANGE",
        details: {
            previousTarget,
            newTarget: targetPrice,
            triggeredBy: "ADMIN",
            note: `Price change: ${percentChange.toFixed(2)}%${isLargeChange ? " (large change)" : ""}`,
        },
        priceAtAction: targetPrice,
        poolValueAtAction: (pool === null || pool === void 0 ? void 0 : pool.totalValueLocked) || 0,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Target price updated successfully");
    return {
        message: "Target price updated successfully",
        previousTarget,
        newTarget: targetPrice,
        percentChange: percentChange.toFixed(2),
        warning: isLargeChange
            ? `Large price change detected (${percentChange.toFixed(2)}%). Monitor closely.`
            : undefined,
    };
};
