"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const utils_1 = require("../../utils");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get AI Market Maker pool details",
    operationId: "getMarketMakerPool",
    tags: ["Admin", "AI Market Maker", "Pool"],
    description: "Retrieves detailed information about an AI Market Maker pool, including current balances, total value locked (TVL), and profit/loss summary. Returns pool status with market information and calculated P&L metrics.",
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
    responses: {
        200: {
            description: "Pool details retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            ...utils_1.aiMarketMakerPoolSchema,
                            market: {
                                type: "object",
                                description: "Associated ecosystem market information",
                            },
                            marketMakerStatus: {
                                type: "string",
                                description: "Current status of the market maker",
                                enum: ["ACTIVE", "PAUSED", "STOPPED"],
                            },
                            pnlSummary: {
                                type: "object",
                                description: "Profit and loss summary",
                                properties: {
                                    unrealizedPnL: {
                                        type: "number",
                                        description: "Unrealized profit/loss",
                                    },
                                    realizedPnL: {
                                        type: "number",
                                        description: "Realized profit/loss",
                                    },
                                    totalPnL: {
                                        type: "number",
                                        description: "Total profit/loss (realized + unrealized)",
                                    },
                                    pnlPercent: {
                                        type: "string",
                                        description: "P&L as percentage of initial investment",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("AI Market Maker Pool"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    logModule: "ADMIN_AI",
    logTitle: "Get Market Maker Pool",
    permission: "view.ai.market-maker.pool",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Get Market Maker Pool");
    const marketMaker = await db_1.models.aiMarketMaker.findByPk(params.marketId, {
        include: [
            {
                model: db_1.models.aiMarketMakerPool,
                as: "pool",
            },
            {
                model: db_1.models.ecosystemMarket,
                as: "market",
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
    const unrealizedPnL = Number(pool.unrealizedPnL);
    const realizedPnL = Number(pool.realizedPnL);
    const totalPnL = unrealizedPnL + realizedPnL;
    const initialValue = Number(pool.initialBaseBalance) + Number(pool.initialQuoteBalance);
    const pnlPercent = initialValue > 0 ? (totalPnL / initialValue) * 100 : 0;
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Market Maker Pool retrieved successfully");
    return {
        ...pool.toJSON(),
        market: marketMaker.market,
        marketMakerStatus: marketMaker.status,
        pnlSummary: {
            unrealizedPnL,
            realizedPnL,
            totalPnL,
            pnlPercent: pnlPercent.toFixed(2),
        },
    };
};
