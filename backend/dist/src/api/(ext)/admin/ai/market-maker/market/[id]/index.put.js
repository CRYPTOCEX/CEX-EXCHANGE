"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const utils_1 = require("../../utils");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Update AI Market Maker market configuration",
    operationId: "updateAiMarketMakerMarket",
    tags: ["Admin", "AI Market Maker", "Market"],
    description: "Updates the configuration parameters of an AI Market Maker market. Validates price ranges to ensure target price remains within bounds, real liquidity percentage stays between 0-100, and tracks all changes in the history log for audit purposes. Returns the updated market maker with pool and ecosystem market details.",
    logModule: "ADMIN_MM",
    logTitle: "Update Market Maker Configuration",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the AI Market Maker to update",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.aiMarketMakerUpdateSchema,
            },
        },
    },
    responses: {
        200: utils_1.aiMarketMakerStoreSchema,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("AI Market Maker Market"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.ai.market-maker.market",
};
exports.default = async (data) => {
    const { params, body, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch market maker from database");
    const marketMaker = await db_1.models.aiMarketMaker.findByPk(params.id, {
        include: [{ model: db_1.models.aiMarketMakerPool, as: "pool" }],
    });
    if (!marketMaker) {
        throw (0, error_1.createError)(404, "AI Market Maker not found");
    }
    const { targetPrice, priceRangeLow, priceRangeHigh, aggressionLevel, maxDailyVolume, volatilityThreshold, pauseOnHighVolatility, realLiquidityPercent, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate price parameters");
    const newLow = priceRangeLow !== null && priceRangeLow !== void 0 ? priceRangeLow : marketMaker.priceRangeLow;
    const newHigh = priceRangeHigh !== null && priceRangeHigh !== void 0 ? priceRangeHigh : marketMaker.priceRangeHigh;
    const newTarget = targetPrice !== null && targetPrice !== void 0 ? targetPrice : marketMaker.targetPrice;
    if (newLow >= newHigh) {
        throw (0, error_1.createError)(400, "Price range low must be less than price range high");
    }
    if (newTarget < newLow || newTarget > newHigh) {
        throw (0, error_1.createError)(400, "Target price must be within the price range");
    }
    if (realLiquidityPercent !== undefined) {
        if (realLiquidityPercent < 0 || realLiquidityPercent > 100) {
            throw (0, error_1.createError)(400, "Real liquidity percent must be between 0 and 100");
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Track configuration changes");
    const changes = {};
    if (targetPrice !== undefined && targetPrice !== marketMaker.targetPrice) {
        changes.targetPrice = { old: marketMaker.targetPrice, new: targetPrice };
    }
    if (priceRangeLow !== undefined && priceRangeLow !== marketMaker.priceRangeLow) {
        changes.priceRangeLow = { old: marketMaker.priceRangeLow, new: priceRangeLow };
    }
    if (priceRangeHigh !== undefined && priceRangeHigh !== marketMaker.priceRangeHigh) {
        changes.priceRangeHigh = { old: marketMaker.priceRangeHigh, new: priceRangeHigh };
    }
    if (aggressionLevel !== undefined && aggressionLevel !== marketMaker.aggressionLevel) {
        changes.aggressionLevel = { old: marketMaker.aggressionLevel, new: aggressionLevel };
    }
    if (realLiquidityPercent !== undefined && realLiquidityPercent !== marketMaker.realLiquidityPercent) {
        changes.realLiquidityPercent = { old: marketMaker.realLiquidityPercent, new: realLiquidityPercent };
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Update market maker configuration");
    await marketMaker.update({
        ...(targetPrice !== undefined && { targetPrice }),
        ...(priceRangeLow !== undefined && { priceRangeLow }),
        ...(priceRangeHigh !== undefined && { priceRangeHigh }),
        ...(aggressionLevel !== undefined && { aggressionLevel }),
        ...(maxDailyVolume !== undefined && { maxDailyVolume }),
        ...(volatilityThreshold !== undefined && { volatilityThreshold }),
        ...(pauseOnHighVolatility !== undefined && { pauseOnHighVolatility }),
        ...(realLiquidityPercent !== undefined && { realLiquidityPercent }),
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Create history record for changes");
    if (Object.keys(changes).length > 0) {
        const pool = marketMaker.pool;
        await db_1.models.aiMarketMakerHistory.create({
            marketMakerId: marketMaker.id,
            action: targetPrice !== undefined ? "TARGET_CHANGE" : "CONFIG_CHANGE",
            details: changes,
            priceAtAction: newTarget,
            poolValueAtAction: (pool === null || pool === void 0 ? void 0 : pool.totalValueLocked) || 0,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Market maker configuration updated successfully");
    return db_1.models.aiMarketMaker.findByPk(params.id, {
        include: [
            { model: db_1.models.aiMarketMakerPool, as: "pool" },
            { model: db_1.models.ecosystemMarket, as: "market" },
        ],
    });
};
