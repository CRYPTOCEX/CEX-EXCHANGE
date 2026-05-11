"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get trade history for an AI Market Maker",
    operationId: "getAiMarketMakerTrades",
    tags: ["Admin", "AI Market Maker", "Analytics"],
    parameters: [
        {
            index: 0,
            name: "marketId",
            in: "path",
            required: true,
            description: "ID of the AI Market Maker",
            schema: { type: "string" },
        },
        ...constants_1.crudParameters,
        {
            name: "startDate",
            in: "query",
            required: false,
            description: "Start date for trade history",
            schema: { type: "string", format: "date-time" },
        },
        {
            name: "endDate",
            in: "query",
            required: false,
            description: "End date for trade history",
            schema: { type: "string", format: "date-time" },
        },
        {
            name: "botId",
            in: "query",
            required: false,
            description: "Filter by specific bot ID",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Paginated trade history",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        timestamp: { type: "string" },
                                        side: { type: "string" },
                                        price: { type: "number" },
                                        amount: { type: "number" },
                                        botId: { type: "string" },
                                        botName: { type: "string" },
                                        pnl: { type: "number" },
                                    },
                                },
                            },
                            pagination: constants_1.paginationSchema,
                            summary: {
                                type: "object",
                                properties: {
                                    totalTrades: { type: "number" },
                                    totalVolume: { type: "number" },
                                    avgPrice: { type: "number" },
                                    totalPnL: { type: "number" },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("AI Market Maker"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    logModule: "ADMIN_AI",
    logTitle: "Get Market Maker Trades",
    permission: "view.ai.market-maker.analytics",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    const { page = 1, perPage = 20, startDate, endDate, botId, } = query;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Get Market Maker Trades");
    const marketMaker = await db_1.models.aiMarketMaker.findByPk(params.marketId);
    if (!marketMaker) {
        throw (0, error_1.createError)(404, "AI Market Maker not found");
    }
    const where = {
        marketMakerId: params.marketId,
        action: "TRADE",
    };
    if (startDate) {
        where.createdAt = { ...where.createdAt, [sequelize_1.Op.gte]: new Date(startDate) };
    }
    if (endDate) {
        where.createdAt = { ...where.createdAt, [sequelize_1.Op.lte]: new Date(endDate) };
    }
    const { count, rows: trades } = await db_1.models.aiMarketMakerHistory.findAndCountAll({
        where,
        order: [["createdAt", "DESC"]],
        limit: Number(perPage),
        offset: (Number(page) - 1) * Number(perPage),
    });
    let filteredTrades = trades;
    if (botId) {
        filteredTrades = trades.filter((t) => { var _a; return ((_a = t.details) === null || _a === void 0 ? void 0 : _a.botId) === botId; });
    }
    const transformedTrades = filteredTrades.map((trade) => {
        var _a, _b, _c, _d, _e, _f;
        return ({
            id: trade.id,
            timestamp: trade.createdAt,
            side: ((_a = trade.details) === null || _a === void 0 ? void 0 : _a.side) || "UNKNOWN",
            price: trade.priceAtAction,
            amount: ((_b = trade.details) === null || _b === void 0 ? void 0 : _b.amount) || 0,
            botId: ((_c = trade.details) === null || _c === void 0 ? void 0 : _c.botId) || null,
            botName: ((_d = trade.details) === null || _d === void 0 ? void 0 : _d.botName) || "Unknown",
            pnl: ((_e = trade.details) === null || _e === void 0 ? void 0 : _e.pnl) || 0,
            type: ((_f = trade.details) === null || _f === void 0 ? void 0 : _f.type) || "AI_ONLY",
        });
    });
    let totalVolume = 0;
    let totalPnL = 0;
    let priceSum = 0;
    for (const trade of filteredTrades) {
        const details = trade.details || {};
        totalVolume += details.amount || 0;
        totalPnL += details.pnl || 0;
        priceSum += Number(trade.priceAtAction) || 0;
    }
    const avgPrice = filteredTrades.length > 0 ? priceSum / filteredTrades.length : 0;
    const totalPages = Math.ceil(count / Number(perPage));
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Market Maker Trades retrieved successfully");
    return {
        data: transformedTrades,
        pagination: {
            currentPage: Number(page),
            perPage: Number(perPage),
            total: count,
            totalPages,
        },
        summary: {
            totalTrades: count,
            totalVolume,
            avgPrice,
            totalPnL,
        },
    };
};
