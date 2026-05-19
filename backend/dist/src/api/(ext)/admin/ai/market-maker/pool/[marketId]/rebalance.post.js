"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Rebalance AI Market Maker pool assets",
    operationId: "rebalanceMarketMakerPool",
    tags: ["Admin", "AI Market Maker", "Pool"],
    description: "Rebalances the pool\'s asset allocation between base and quote currencies according to a target ratio. Can only be performed when the market maker is paused or stopped. The operation adjusts balances to match the specified ratio while maintaining total pool value.",
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
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Pool rebalanced successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Success message",
                            },
                            rebalanceDetails: {
                                type: "object",
                                description: "Details of the rebalance operation",
                                properties: {
                                    targetRatio: {
                                        type: "number",
                                        description: "Target ratio used for rebalancing",
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
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.ai.market-maker.pool",
};
exports.default = async (data) => {
    var _a;
    const { params, body, ctx } = data;
    const targetRatio = (_a = body === null || body === void 0 ? void 0 : body.targetRatio) !== null && _a !== void 0 ? _a : 0.5;
    if (targetRatio < 0 || targetRatio > 1) {
        throw (0, error_1.createError)(400, "Target ratio must be between 0 and 1");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch market maker with pool");
    const marketMaker = await db_1.models.aiMarketMaker.findByPk(params.marketId, {
        include: [
            {
                model: db_1.models.aiMarketMakerPool,
                as: "pool",
            },
        ],
    });
    if (!marketMaker) {
        throw (0, error_1.createError)(404, "AI Market Maker not found");
    }
    const pool = marketMaker.pool;
    if (!pool) {
        throw (0, error_1.createError)(404, "Pool not found for this market maker");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate market maker is not active");
    if (marketMaker.status === "ACTIVE") {
        throw (0, error_1.createError)(400, "Cannot rebalance active market maker. Please pause it first.");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculate new balances");
    const targetPrice = Number(marketMaker.targetPrice);
    const currentBaseBalance = Number(pool.baseCurrencyBalance);
    const currentQuoteBalance = Number(pool.quoteCurrencyBalance);
    const totalValueInQuote = currentBaseBalance * targetPrice + currentQuoteBalance;
    if (totalValueInQuote <= 0) {
        throw (0, error_1.createError)(400, "Pool has no value to rebalance");
    }
    const targetBaseValueInQuote = totalValueInQuote * targetRatio;
    const targetQuoteValue = totalValueInQuote * (1 - targetRatio);
    const newBaseBalance = targetBaseValueInQuote / targetPrice;
    const newQuoteBalance = targetQuoteValue;
    const baseChange = newBaseBalance - currentBaseBalance;
    const quoteChange = newQuoteBalance - currentQuoteBalance;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Update pool balances");
    await pool.update({
        baseCurrencyBalance: newBaseBalance,
        quoteCurrencyBalance: newQuoteBalance,
        lastRebalanceAt: new Date(),
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Create history record for rebalance");
    await db_1.models.aiMarketMakerHistory.create({
        marketMakerId: marketMaker.id,
        action: "CONFIG_CHANGE",
        details: {
            field: "poolRebalance",
            previousValue: { baseBalance: currentBaseBalance, quoteBalance: currentQuoteBalance },
            newValue: { baseBalance: newBaseBalance, quoteBalance: newQuoteBalance, targetRatio },
            note: `Rebalanced to ${(targetRatio * 100).toFixed(0)}% base ratio`,
        },
        priceAtAction: marketMaker.targetPrice,
        poolValueAtAction: totalValueInQuote,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Pool rebalanced successfully");
    return {
        message: "Pool rebalanced successfully",
        rebalanceDetails: {
            targetRatio,
            previousBaseBalance: currentBaseBalance,
            previousQuoteBalance: currentQuoteBalance,
            newBaseBalance,
            newQuoteBalance,
            baseChange,
            quoteChange,
            totalValue: totalValueInQuote,
        },
    };
};
