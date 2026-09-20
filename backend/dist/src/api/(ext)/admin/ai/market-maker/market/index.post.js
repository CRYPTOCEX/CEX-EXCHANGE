"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const utils_1 = require("../utils");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
const transaction_1 = require("@b/utils/transaction");
const market_resolver_1 = require("../utils/venue/market-resolver");
exports.metadata = {
    summary: "Create AI Market Maker market",
    operationId: "createAiMarketMakerMarket",
    tags: ["Admin", "AI Market Maker", "Market"],
    description: "Creates a new AI Market Maker for an ecosystem market with specified configuration parameters. Automatically generates a liquidity pool, default bots based on aggression level, and initializes all necessary tracking structures. The market maker starts in STOPPED status and requires manual activation after initial funding.",
    logModule: "ADMIN_MM",
    logTitle: "Create AI Market Maker",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.aiMarketMakerCreateSchema,
            },
        },
    },
    responses: {
        201: utils_1.aiMarketMakerStoreSchema,
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Ecosystem market"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "create.ai.market_maker.market",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { marketId, marketType: requestedMarketType, targetPrice, priceRangeLow, priceRangeHigh, aggressionLevel = "MODERATE", maxDailyVolume = 1000000, volatilityThreshold = 5, pauseOnHighVolatility = true, realLiquidityPercent = 20, futuresLeverage, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate price parameters");
    if (targetPrice <= 0) {
        throw (0, error_1.createError)(400, "Target price must be greater than 0");
    }
    if (priceRangeLow <= 0) {
        throw (0, error_1.createError)(400, "Price range low must be greater than 0");
    }
    if (priceRangeHigh <= 0) {
        throw (0, error_1.createError)(400, "Price range high must be greater than 0");
    }
    if (priceRangeLow >= priceRangeHigh) {
        throw (0, error_1.createError)(400, "Price range low must be less than price range high");
    }
    if (targetPrice < priceRangeLow || targetPrice > priceRangeHigh) {
        throw (0, error_1.createError)(400, "Target price must be within the price range");
    }
    const maxDeviation = 0.5;
    const lowDeviation = (targetPrice - priceRangeLow) / targetPrice;
    const highDeviation = (priceRangeHigh - targetPrice) / targetPrice;
    if (lowDeviation > maxDeviation || highDeviation > maxDeviation) {
        throw (0, error_1.createError)(400, `Price range deviation from target must be within ${maxDeviation * 100}%. ` +
            `Current: low=${(lowDeviation * 100).toFixed(1)}%, high=${(highDeviation * 100).toFixed(1)}%`);
    }
    const minPriceValue = 1e-8;
    if (priceRangeLow < minPriceValue || priceRangeHigh < minPriceValue || targetPrice < minPriceValue) {
        throw (0, error_1.createError)(400, "Price values must be at least 0.00000001 (8 decimal places)");
    }
    if (realLiquidityPercent < 0 || realLiquidityPercent > 100) {
        throw (0, error_1.createError)(400, "Real liquidity percent must be between 0 and 100");
    }
    if (!(maxDailyVolume >= 0)) {
        throw (0, error_1.createError)(400, "Maximum daily volume cannot be negative");
    }
    if (!(volatilityThreshold >= 0) || volatilityThreshold > 100) {
        throw (0, error_1.createError)(400, "Volatility threshold must be between 0 and 100");
    }
    const marketType = (0, market_resolver_1.normaliseVenue)(requestedMarketType);
    let leverage = 1;
    if (futuresLeverage !== undefined) {
        if (marketType !== "FUTURES") {
            throw (0, error_1.createError)(400, "Leverage applies to futures markets only. An ecosystem market maker funds its " +
                "orders from the pool rather than margining them.");
        }
        leverage = Number(futuresLeverage);
        if (!Number.isFinite(leverage) || leverage < 1 || leverage > 125) {
            throw (0, error_1.createError)(400, "Futures leverage must be between 1 and 125");
        }
    }
    const venueLabel = marketType === "FUTURES" ? "Futures" : "Ecosystem";
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validate ${venueLabel.toLowerCase()} market exists`);
    if (!(0, market_resolver_1.venueAvailable)(marketType)) {
        throw (0, error_1.createError)(400, `The ${venueLabel} extension is not installed on this server, so a ${venueLabel} market maker cannot be created.`);
    }
    const market = await (0, market_resolver_1.loadMakerMarket)(marketType, marketId);
    if (!market) {
        throw (0, error_1.createError)(404, `${venueLabel} market not found`);
    }
    const existingMaker = await db_1.models.aiMarketMaker.findOne({
        where: { marketId, marketType },
    });
    if (existingMaker) {
        throw (0, error_1.createError)(400, "AI Market Maker already exists for this market");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Initialize database transaction");
    const transaction = await db_1.sequelize.transaction();
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Create AI Market Maker");
        const marketMaker = await db_1.models.aiMarketMaker.create({
            marketId,
            marketType,
            futuresLeverage: leverage,
            status: "STOPPED",
            targetPrice,
            priceRangeLow,
            priceRangeHigh,
            aggressionLevel,
            maxDailyVolume,
            currentDailyVolume: 0,
            volatilityThreshold,
            pauseOnHighVolatility,
            realLiquidityPercent,
            priceMode: "AUTONOMOUS",
            marketBias: "NEUTRAL",
            currentPhase: "ACCUMULATION",
            baseVolatility: 2.0,
            volatilityMultiplier: 1.0,
            momentumDecay: 0.95,
            trendMomentum: 0,
            correlationStrength: 50,
            biasStrength: 50,
        }, { transaction });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Create market maker pool");
        await db_1.models.aiMarketMakerPool.create({
            marketMakerId: marketMaker.id,
            baseCurrencyBalance: 0,
            quoteCurrencyBalance: 0,
            initialBaseBalance: 0,
            initialQuoteBalance: 0,
            totalValueLocked: 0,
            unrealizedPnL: 0,
            realizedPnL: 0,
        }, { transaction });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Create default bots");
        const botConfigs = getDefaultBotConfigs(aggressionLevel);
        for (const config of botConfigs) {
            await db_1.models.aiBot.create({
                marketMakerId: marketMaker.id,
                ...config,
                status: "PAUSED",
                dailyTradeCount: 0,
                realTradesExecuted: 0,
                profitableTrades: 0,
                totalRealizedPnL: 0,
                totalVolume: 0,
                currentPosition: 0,
                avgEntryPrice: 0,
            }, { transaction });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Create history record");
        await db_1.models.aiMarketMakerHistory.create({
            marketMakerId: marketMaker.id,
            action: "CONFIG_CHANGE",
            details: {
                triggeredBy: "ADMIN",
                note: `Market maker created with target price: ${targetPrice}, range: ${priceRangeLow}-${priceRangeHigh}, aggression: ${aggressionLevel}, real liquidity: ${realLiquidityPercent}%`,
            },
            priceAtAction: targetPrice,
            poolValueAtAction: 0,
        }, { transaction });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Commit transaction");
        await transaction.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.success("AI Market Maker created successfully");
        return (0, market_resolver_1.hydrateMakerMarket)(await db_1.models.aiMarketMaker.findByPk(marketMaker.id, {
            include: [
                { model: db_1.models.aiMarketMakerPool, as: "pool" },
                ...(0, market_resolver_1.makerMarketIncludes)(),
                { model: db_1.models.aiBot, as: "bots" },
            ],
        }));
    }
    catch (error) {
        await (0, transaction_1.rollbackIfActive)(transaction);
        throw error;
    }
};
function getDefaultBotConfigs(aggressionLevel) {
    const baseConfigs = [
        {
            name: "Scalper Alpha",
            personality: "SCALPER",
            tradeFrequency: "HIGH",
            preferredSpread: 0.001,
        },
        {
            name: "Scalper Beta",
            personality: "SCALPER",
            tradeFrequency: "HIGH",
            preferredSpread: 0.0015,
        },
        {
            name: "Swing Trader",
            personality: "SWING",
            tradeFrequency: "MEDIUM",
            preferredSpread: 0.003,
        },
        {
            name: "Accumulator",
            personality: "ACCUMULATOR",
            tradeFrequency: "LOW",
            preferredSpread: 0.002,
        },
        {
            name: "Distributor",
            personality: "DISTRIBUTOR",
            tradeFrequency: "LOW",
            preferredSpread: 0.002,
        },
        {
            name: "Market Maker",
            personality: "MARKET_MAKER",
            tradeFrequency: "HIGH",
            preferredSpread: 0.001,
        },
    ];
    const aggressionMultipliers = {
        CONSERVATIVE: { risk: 0.3, size: 0.5, trades: 1200 },
        MODERATE: { risk: 0.5, size: 1.0, trades: 3500 },
        AGGRESSIVE: { risk: 0.8, size: 2.0, trades: 9000 },
    };
    const multiplier = aggressionMultipliers[aggressionLevel];
    return baseConfigs.map((config) => ({
        ...config,
        riskTolerance: multiplier.risk,
        avgOrderSize: 100 * multiplier.size,
        orderSizeVariance: 0.2,
        maxDailyTrades: multiplier.trades,
    }));
}
