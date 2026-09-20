"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
const market_resolver_1 = require("../../utils/venue/market-resolver");
const RebalanceExecutor_1 = require("../../utils/engine/pool/RebalanceExecutor");
const DEFAULT_MAX_SLIPPAGE_PERCENT = 2;
exports.metadata = {
    summary: "Report or execute the trade a target pool ratio would require",
    operationId: "rebalanceMarketMakerPool",
    tags: ["Admin", "AI Market Maker", "Pool"],
    description: "Brings the pool towards a target ratio of base value to total value. In the default REPORT mode it only calculates the asset movement required and changes nothing. In EXECUTE mode it places a REAL limit order against real order-backed depth in the ecosystem book and lets the matching engine settle it, so every unit that enters the pool leaves a counterparty's wallet. Pool balances are never converted directly - doing so would create currency with no trade behind it. EXECUTE refuses outright (409) rather than partially filling when the real book cannot cover the move or when covering it would exceed the slippage limit. Can only be called when the market maker is paused or stopped.",
    logModule: "ADMIN_MM",
    logTitle: "Rebalance Market Maker Pool",
    parameters: [
        {
            index: 0,
            name: "marketId",
            in: "path",
            required: true,
            description: "ID of the AI Market Maker",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: false,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        targetRatio: {
                            type: "number",
                            description: "Target ratio of base currency value to total pool value (0-1, default 0.5 for 50/50 split)",
                        },
                        mode: {
                            type: "string",
                            enum: ["REPORT", "EXECUTE"],
                            description: "REPORT (default) calculates the required move and changes nothing. EXECUTE places a real order against the ecosystem book.",
                        },
                        maxSlippagePercent: {
                            type: "number",
                            description: "EXECUTE only: refuse if reaching the target would move the price more than this far off the touch (default 2).",
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Rebalance requirement reported, or rebalance executed",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            applied: {
                                type: "boolean",
                                description: "False in REPORT mode. True in EXECUTE mode, where the balances moved because a real order settled.",
                            },
                            message: {
                                type: "string",
                                description: "What the operator needs to do to reach the target ratio, or what the executed trade did",
                            },
                            filled: {
                                type: "number",
                                description: "EXECUTE only: base currency the trade actually moved, read back from the pool row",
                            },
                            avgPrice: {
                                type: "number",
                                nullable: true,
                                description: "EXECUTE only: blended execution price, or null when nothing filled",
                            },
                            remainingCancelled: {
                                type: "boolean",
                                description: "EXECUTE only: whether an unfilled remainder had to be swept out of the book",
                            },
                            rebalanceDetails: {
                                type: "object",
                                description: "Details of the requirement",
                                properties: {
                                    targetRatio: {
                                        type: "number",
                                        description: "Target ratio used for rebalancing",
                                    },
                                    currentRatio: {
                                        type: "number",
                                        description: "Current ratio of base value to total pool value",
                                    },
                                    requiredBaseChange: {
                                        type: "number",
                                        description: "Base currency that would have to be acquired or disposed of",
                                    },
                                    requiredQuoteChange: {
                                        type: "number",
                                        description: "Quote currency that would have to be added or removed",
                                    },
                                    previousBaseBalance: {
                                        type: "number",
                                        description: "Base currency balance before rebalance",
                                    },
                                    previousQuoteBalance: {
                                        type: "number",
                                        description: "Quote currency balance before rebalance",
                                    },
                                    newBaseBalance: {
                                        type: "number",
                                        description: "Base currency balance after rebalance",
                                    },
                                    newQuoteBalance: {
                                        type: "number",
                                        description: "Quote currency balance after rebalance",
                                    },
                                    baseChange: {
                                        type: "number",
                                        description: "Change in base currency balance",
                                    },
                                    quoteChange: {
                                        type: "number",
                                        description: "Change in quote currency balance",
                                    },
                                    totalValue: {
                                        type: "number",
                                        description: "Total pool value in quote currency",
                                    },
                                    side: {
                                        type: "string",
                                        description: "The trade direction the target ratio implies (BUY or SELL base)",
                                    },
                                    ecosystemOrderId: {
                                        type: "string",
                                        description: "EXECUTE only: the ecosystem order that carried the rebalance",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("AI Market Maker Pool"),
        409: (0, errors_1.conflictResponse)("Real order-backed liquidity"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.ai.market_maker.pool",
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const { params, body, ctx } = data;
    const targetRatio = (_a = body === null || body === void 0 ? void 0 : body.targetRatio) !== null && _a !== void 0 ? _a : 0.5;
    const mode = String((_b = body === null || body === void 0 ? void 0 : body.mode) !== null && _b !== void 0 ? _b : "REPORT").toUpperCase();
    const maxSlippagePercent = Number((_c = body === null || body === void 0 ? void 0 : body.maxSlippagePercent) !== null && _c !== void 0 ? _c : DEFAULT_MAX_SLIPPAGE_PERCENT);
    if (targetRatio < 0 || targetRatio > 1) {
        throw (0, error_1.createError)(400, "Target ratio must be between 0 and 1");
    }
    if (mode !== "REPORT" && mode !== "EXECUTE") {
        throw (0, error_1.createError)(400, "mode must be REPORT or EXECUTE");
    }
    if (!Number.isFinite(maxSlippagePercent) || maxSlippagePercent < 0) {
        throw (0, error_1.createError)(400, "maxSlippagePercent must be a non-negative number");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch market maker with pool");
    const marketMaker = (0, market_resolver_1.hydrateMakerMarket)(await db_1.models.aiMarketMaker.findByPk(params.marketId, {
        include: [
            {
                model: db_1.models.aiMarketMakerPool,
                as: "pool",
            },
            ...(0, market_resolver_1.makerMarketIncludes)(),
        ],
    }));
    if (!marketMaker) {
        throw (0, error_1.createError)(404, "AI Market Maker not found");
    }
    const pool = marketMaker.pool;
    if (!pool) {
        throw (0, error_1.createError)(404, "Pool not found for this market maker");
    }
    const market = marketMaker.market;
    if ((0, market_resolver_1.normaliseVenue)(marketMaker.marketType) === "FUTURES") {
        throw (0, error_1.createError)(400, "A futures market maker holds margin in one currency and its exposure is a position, " +
            "not a base balance — there is no ratio to rebalance. Pause the market to let its " +
            "reduce-only exits unwind the position instead.");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate market maker is not active");
    if (marketMaker.status === "ACTIVE") {
        throw (0, error_1.createError)(400, "Cannot rebalance active market maker. Please pause it first.");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculate the trade the target ratio would require");
    const plan = (0, RebalanceExecutor_1.planRebalance)({
        baseBalance: Number(pool.baseCurrencyBalance),
        quoteBalance: Number(pool.quoteCurrencyBalance),
        targetPrice: Number(marketMaker.targetPrice),
        targetRatio,
    });
    if (mode === "EXECUTE") {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Execute the rebalance against the ecosystem book");
        const result = await (0, RebalanceExecutor_1.executeRebalance)({
            marketMaker,
            market,
            pool,
            plan,
            maxSlippagePercent,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Rebalance executed");
        return {
            applied: true,
            message: `${plan.side === "BUY" ? "Bought" : "Sold"} ${result.filledBase.toFixed(8)} ` +
                `${(_d = market === null || market === void 0 ? void 0 : market.currency) !== null && _d !== void 0 ? _d : "base"} against real order-backed depth` +
                (result.avgPrice !== null
                    ? ` at an average of ${result.avgPrice} ${(_e = market === null || market === void 0 ? void 0 : market.pair) !== null && _e !== void 0 ? _e : "quote"}`
                    : "") +
                (result.remainingCancelled
                    ? ". An unfilled remainder was cancelled so no rebalance residue is left resting."
                    : "."),
            filled: result.filledBase,
            avgPrice: result.avgPrice,
            remainingCancelled: result.remainingCancelled,
            rebalanceDetails: {
                targetRatio,
                currentRatio: plan.currentRatio,
                previousBaseBalance: plan.previousBaseBalance,
                previousQuoteBalance: plan.previousQuoteBalance,
                newBaseBalance: Number(pool.baseCurrencyBalance),
                newQuoteBalance: Number(pool.quoteCurrencyBalance),
                requiredBaseChange: plan.requiredBaseChange,
                requiredQuoteChange: plan.requiredQuoteChange,
                baseChange: Number(pool.baseCurrencyBalance) - plan.previousBaseBalance,
                quoteChange: result.quoteDelta,
                totalValue: plan.totalValue,
                side: plan.side,
                ecosystemOrderId: result.ecosystemOrderId,
            },
        };
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Record the imbalance report");
    await db_1.models.aiMarketMakerHistory.create({
        marketMakerId: marketMaker.id,
        action: "CONFIG_CHANGE",
        details: {
            field: "poolRebalanceRequested",
            previousValue: {
                baseBalance: plan.previousBaseBalance,
                quoteBalance: plan.previousQuoteBalance,
                baseRatio: plan.currentRatio,
            },
            newValue: {
                targetRatio,
                requiredBaseChange: plan.requiredBaseChange,
                requiredQuoteChange: plan.requiredQuoteChange,
            },
            triggeredBy: "ADMIN",
            note: "REBALANCE_REPORTED (no asset movement — call again with mode EXECUTE to trade it)",
        },
        priceAtAction: marketMaker.targetPrice,
        poolValueAtAction: plan.totalValue,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Rebalance requirement reported");
    return {
        applied: false,
        message: plan.alreadyBalanced
            ? `Pool is already at ${(targetRatio * 100).toFixed(0)}% base. No action required.`
            : `To reach ${(targetRatio * 100).toFixed(0)}% base, ${plan.requiredBaseChange > 0
                ? `acquire ${plan.absBase.toFixed(8)} ${(_f = market === null || market === void 0 ? void 0 : market.currency) !== null && _f !== void 0 ? _f : "base"}`
                : `dispose of ${plan.absBase.toFixed(8)} ${(_g = market === null || market === void 0 ? void 0 : market.currency) !== null && _g !== void 0 ? _g : "base"}`} and ${plan.requiredQuoteChange > 0
                ? `add ${Math.abs(plan.requiredQuoteChange).toFixed(8)} ${(_h = market === null || market === void 0 ? void 0 : market.pair) !== null && _h !== void 0 ? _h : "quote"}`
                : `remove ${Math.abs(plan.requiredQuoteChange).toFixed(8)} ${(_j = market === null || market === void 0 ? void 0 : market.pair) !== null && _j !== void 0 ? _j : "quote"}`}. Nothing has been moved: run this again with mode EXECUTE to trade it against the ` +
                `real book, or withdraw the surplus, trade it yourself, and deposit the proceeds back.`,
        rebalanceDetails: {
            targetRatio,
            currentRatio: plan.currentRatio,
            previousBaseBalance: plan.previousBaseBalance,
            previousQuoteBalance: plan.previousQuoteBalance,
            newBaseBalance: plan.previousBaseBalance,
            newQuoteBalance: plan.previousQuoteBalance,
            requiredBaseChange: plan.requiredBaseChange,
            requiredQuoteChange: plan.requiredQuoteChange,
            baseChange: 0,
            quoteChange: 0,
            totalValue: plan.totalValue,
            side: plan.side,
        },
    };
};
