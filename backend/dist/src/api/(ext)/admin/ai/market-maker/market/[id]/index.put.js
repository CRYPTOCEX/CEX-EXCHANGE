"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const utils_1 = require("../../utils");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
const liveConfig_1 = require("../../utils/helpers/liveConfig");
const market_resolver_1 = require("../../utils/venue/market-resolver");
const external_1 = require("../../utils/engine/external");
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
    permission: "edit.ai.market_maker.market",
};
exports.default = async (data) => {
    var _a, _b;
    const { params, body, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch market maker from database");
    const marketMaker = await db_1.models.aiMarketMaker.findByPk(params.id, {
        include: [{ model: db_1.models.aiMarketMakerPool, as: "pool" }],
    });
    if (!marketMaker) {
        throw (0, error_1.createError)(404, "AI Market Maker not found");
    }
    const { targetPrice, priceRangeLow, priceRangeHigh, aggressionLevel, maxDailyVolume, volatilityThreshold, pauseOnHighVolatility, realLiquidityPercent, requoteFloorPerSide, maxRestingRealOrders, futuresLeverage, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate price parameters");
    const newLow = Number(priceRangeLow !== null && priceRangeLow !== void 0 ? priceRangeLow : marketMaker.priceRangeLow);
    const newHigh = Number(priceRangeHigh !== null && priceRangeHigh !== void 0 ? priceRangeHigh : marketMaker.priceRangeHigh);
    const newTarget = Number(targetPrice !== null && targetPrice !== void 0 ? targetPrice : marketMaker.targetPrice);
    if (!Number.isFinite(newLow) || !Number.isFinite(newHigh) || !Number.isFinite(newTarget)) {
        throw (0, error_1.createError)(400, "Price values must be numbers");
    }
    if (newLow <= 0 || newHigh <= 0 || newTarget <= 0) {
        throw (0, error_1.createError)(400, "Price values must be greater than 0");
    }
    if (newLow >= newHigh) {
        throw (0, error_1.createError)(400, "Price range low must be less than price range high");
    }
    if (newTarget < newLow || newTarget > newHigh) {
        throw (0, error_1.createError)(400, "Target price must be within the price range");
    }
    if (realLiquidityPercent !== undefined) {
        if (!(realLiquidityPercent >= 0) || realLiquidityPercent > 100) {
            throw (0, error_1.createError)(400, "Real liquidity percent must be between 0 and 100");
        }
    }
    if (requoteFloorPerSide !== undefined) {
        const floor = Number(requoteFloorPerSide);
        if (!Number.isInteger(floor) || floor < 0 || floor > 20) {
            throw (0, error_1.createError)(400, "Real depth floor must be a whole number of quotes per side, between 0 and 20");
        }
    }
    if (maxRestingRealOrders !== undefined && maxRestingRealOrders !== null) {
        const ceiling = Number(maxRestingRealOrders);
        if (!Number.isInteger(ceiling) || ceiling < 50 || ceiling > 10000) {
            throw (0, error_1.createError)(400, "Maximum resting real orders must be a whole number between 50 and 10000, or null to use the platform default");
        }
    }
    if (futuresLeverage !== undefined) {
        const leverage = Number(futuresLeverage);
        if (!Number.isFinite(leverage) || leverage < 1 || leverage > 125) {
            throw (0, error_1.createError)(400, "Futures leverage must be between 1 and 125");
        }
        if ((0, market_resolver_1.normaliseVenue)(marketMaker.marketType) !== "FUTURES") {
            throw (0, error_1.createError)(400, "Leverage applies to futures markets only. This market maker runs on the ecosystem, " +
                "where orders are funded from the pool rather than margined.");
        }
    }
    if (maxDailyVolume !== undefined && !(Number(maxDailyVolume) >= 0)) {
        throw (0, error_1.createError)(400, "Maximum daily volume cannot be negative");
    }
    if (volatilityThreshold !== undefined &&
        (!(Number(volatilityThreshold) >= 0) || Number(volatilityThreshold) > 100)) {
        throw (0, error_1.createError)(400, "Volatility threshold must be between 0 and 100");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Track configuration changes");
    const changes = {};
    const numericChanged = (next, current) => next !== undefined && !Object.is(Number(next), Number(current));
    if (numericChanged(targetPrice, marketMaker.targetPrice)) {
        changes.targetPrice = { old: Number(marketMaker.targetPrice), new: targetPrice };
    }
    if (numericChanged(priceRangeLow, marketMaker.priceRangeLow)) {
        changes.priceRangeLow = { old: Number(marketMaker.priceRangeLow), new: priceRangeLow };
    }
    if (numericChanged(priceRangeHigh, marketMaker.priceRangeHigh)) {
        changes.priceRangeHigh = { old: Number(marketMaker.priceRangeHigh), new: priceRangeHigh };
    }
    if (aggressionLevel !== undefined && aggressionLevel !== marketMaker.aggressionLevel) {
        changes.aggressionLevel = { old: marketMaker.aggressionLevel, new: aggressionLevel };
    }
    if (numericChanged(maxDailyVolume, marketMaker.maxDailyVolume)) {
        changes.maxDailyVolume = { old: Number(marketMaker.maxDailyVolume), new: maxDailyVolume };
    }
    if (numericChanged(volatilityThreshold, marketMaker.volatilityThreshold)) {
        changes.volatilityThreshold = {
            old: Number(marketMaker.volatilityThreshold),
            new: volatilityThreshold,
        };
    }
    if (pauseOnHighVolatility !== undefined &&
        Boolean(pauseOnHighVolatility) !== Boolean(marketMaker.pauseOnHighVolatility)) {
        changes.pauseOnHighVolatility = {
            old: marketMaker.pauseOnHighVolatility,
            new: pauseOnHighVolatility,
        };
    }
    if (numericChanged(realLiquidityPercent, marketMaker.realLiquidityPercent)) {
        changes.realLiquidityPercent = {
            old: Number(marketMaker.realLiquidityPercent),
            new: realLiquidityPercent,
        };
    }
    if (numericChanged(requoteFloorPerSide, marketMaker.requoteFloorPerSide)) {
        changes.requoteFloorPerSide = {
            old: Number(marketMaker.requoteFloorPerSide),
            new: Number(requoteFloorPerSide),
        };
    }
    if (maxRestingRealOrders !== undefined &&
        Number((_a = marketMaker.maxRestingRealOrders) !== null && _a !== void 0 ? _a : 0) !==
            Number(maxRestingRealOrders !== null && maxRestingRealOrders !== void 0 ? maxRestingRealOrders : 0)) {
        changes.maxRestingRealOrders = {
            old: (_b = marketMaker.maxRestingRealOrders) !== null && _b !== void 0 ? _b : null,
            new: maxRestingRealOrders !== null && maxRestingRealOrders !== void 0 ? maxRestingRealOrders : null,
        };
    }
    if (numericChanged(futuresLeverage, marketMaker.futuresLeverage)) {
        changes.futuresLeverage = {
            old: Number(marketMaker.futuresLeverage),
            new: futuresLeverage,
        };
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
        ...(requoteFloorPerSide !== undefined && {
            requoteFloorPerSide: Number(requoteFloorPerSide),
        }),
        ...(maxRestingRealOrders !== undefined && {
            maxRestingRealOrders: maxRestingRealOrders === null ? null : Number(maxRestingRealOrders),
        }),
        ...(futuresLeverage !== undefined && { futuresLeverage }),
    });
    await (0, liveConfig_1.applyConfigToRunningEngine)(marketMaker.id);
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
    const updated = (0, market_resolver_1.hydrateMakerMarket)(await db_1.models.aiMarketMaker.findByPk(params.id, {
        include: [
            { model: db_1.models.aiMarketMakerPool, as: "pool" },
            ...(0, market_resolver_1.makerMarketIncludes)(),
        ],
    }));
    const mode = updated === null || updated === void 0 ? void 0 : updated.priceMode;
    if (mode && mode !== "AUTONOMOUS") {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Assess whether the tether can still reach its reference");
        const symbol = updated === null || updated === void 0 ? void 0 : updated.externalSymbol;
        let externalPrice = null;
        if (symbol) {
            try {
                externalPrice = await new external_1.ExternalPriceSync().getExternalPrice(symbol);
            }
            catch (_c) {
                externalPrice = null;
            }
        }
        const tether = (0, external_1.assessTetherViability)({
            priceMode: mode,
            externalPrice,
            externalSymbol: symbol,
            lastKnownPrice: updated === null || updated === void 0 ? void 0 : updated.lastKnownPrice,
            targetPrice: updated === null || updated === void 0 ? void 0 : updated.targetPrice,
            priceRangeLow: updated === null || updated === void 0 ? void 0 : updated.priceRangeLow,
            priceRangeHigh: updated === null || updated === void 0 ? void 0 : updated.priceRangeHigh,
            correlationStrength: updated === null || updated === void 0 ? void 0 : updated.correlationStrength,
        });
        const plain = typeof updated.toJSON === "function"
            ? updated.toJSON()
            : updated;
        return { ...plain, tether };
    }
    return updated;
};
