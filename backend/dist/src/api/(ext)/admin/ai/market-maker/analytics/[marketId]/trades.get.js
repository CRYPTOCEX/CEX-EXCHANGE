"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const sql_string_1 = require("sequelize/lib/sql-string");
const queries_1 = require("../../utils/scylla/queries");
const operator_trade_feed_1 = require("../../utils/analytics/operator-trade-feed");
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
                                        fee: { type: "number" },
                                        isMaker: { type: "boolean", nullable: true },
                                        counterpartyUserId: { type: "string", nullable: true },
                                        type: {
                                            type: "string",
                                            enum: ["AI_ONLY", "REAL"],
                                            description: "AI_ONLY is a simulated house print; REAL is a fill against a customer",
                                        },
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
                            realTrades: {
                                type: "object",
                                description: "Coverage of the real-fill half of the feed. `complete: false` means the page may be missing real fills, and `reason` says which.",
                                properties: {
                                    source: { type: "string" },
                                    windowDays: { type: "number" },
                                    windowStart: { type: "string" },
                                    count: { type: "number" },
                                    complete: { type: "boolean" },
                                    reason: { type: "string", nullable: true },
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
    permission: "view.ai.market_maker.analytics",
};
const REAL_TRADE_DEFAULT_WINDOW_DAYS = 30;
const REAL_TRADE_MAX_WINDOW_DAYS = 90;
const MAX_MERGE_DEPTH = 5000;
function isoOrEpoch(value) {
    const when = new Date(value);
    return Number.isNaN(when.getTime())
        ? new Date(0).toISOString()
        : when.toISOString();
}
exports.default = async (data) => {
    var _a;
    const { params, query, ctx } = data;
    const { page = 1, perPage = 20, startDate, endDate, botId, } = query;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Get Market Maker Trades");
    const marketMaker = await db_1.models.aiMarketMaker.findByPk(params.marketId);
    if (!marketMaker) {
        throw (0, error_1.createError)(404, "AI Market Maker not found");
    }
    const pageNum = Math.max(1, Number(page) || 1);
    const perPageNum = Math.max(1, Math.min(100, Number(perPage) || 20));
    const depth = Math.min(MAX_MERGE_DEPTH, pageNum * perPageNum);
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
    if (botId) {
        if (!/^[0-9a-fA-F-]{36}$/.test(String(botId))) {
            throw (0, error_1.createError)(400, "botId must be a UUID");
        }
        where[sequelize_1.Op.and] = [
            ...((_a = where[sequelize_1.Op.and]) !== null && _a !== void 0 ? _a : []),
            (0, sequelize_1.literal)(`JSON_UNQUOTE(JSON_EXTRACT(\`details\`, '$.botId')) = ${(0, sql_string_1.escape)(String(botId))}`),
        ];
    }
    const { count, rows: trades } = await db_1.models.aiMarketMakerHistory.findAndCountAll({
        where,
        order: [["createdAt", "DESC"]],
        limit: depth,
        offset: 0,
    });
    const simulatedRows = trades.map((trade) => { var _a, _b, _c, _d, _e; return ({
        id: String(trade.id),
        timestamp: isoOrEpoch(trade.createdAt),
        side: ((_a = trade.details) === null || _a === void 0 ? void 0 : _a.side) || "UNKNOWN",
        price: Number(trade.priceAtAction) || 0,
        amount: Number((_b = trade.details) === null || _b === void 0 ? void 0 : _b.amount) || 0,
        botId: ((_c = trade.details) === null || _c === void 0 ? void 0 : _c.botId) || null,
        botName: ((_d = trade.details) === null || _d === void 0 ? void 0 : _d.botName) || "Unknown",
        pnl: Number((_e = trade.details) === null || _e === void 0 ? void 0 : _e.pnl) || 0,
        fee: 0,
        isMaker: null,
        counterpartyUserId: null,
        type: "AI_ONLY",
    }); });
    const bots = (await db_1.models.aiBot.findAll({
        where: { marketMakerId: params.marketId },
        attributes: ["id", "name", "firstRealTradeAt"],
    }));
    const botNames = new Map(bots.map((b) => { var _a; return [String(b.id), String((_a = b.name) !== null && _a !== void 0 ? _a : "Unknown")]; }));
    const ledgerBotIds = botId
        ? [String(botId)].filter((id) => botNames.has(id))
        : [...botNames.keys()];
    const ledgerWindow = (0, operator_trade_feed_1.resolveRealTradeWindow)({
        startDate: startDate !== null && startDate !== void 0 ? startDate : null,
        defaultDays: REAL_TRADE_DEFAULT_WINDOW_DAYS,
        maxDays: REAL_TRADE_MAX_WINDOW_DAYS,
    });
    const unreadableBots = [];
    const ledger = ledgerBotIds.length
        ? await (0, queries_1.getBotRealTradesInRange)(ledgerBotIds, ledgerWindow.days, unreadableBots)
        : [];
    const rangeStart = startDate ? new Date(startDate) : null;
    const rangeEnd = endDate ? new Date(endDate) : null;
    const realRows = ledger
        .filter((t) => {
        const when = new Date(t.tradeTime).getTime();
        if (rangeStart && !Number.isNaN(rangeStart.getTime()) && when < rangeStart.getTime()) {
            return false;
        }
        if (rangeEnd && !Number.isNaN(rangeEnd.getTime()) && when > rangeEnd.getTime()) {
            return false;
        }
        return true;
    })
        .map((t) => { var _a; return ({
        id: t.tradeId,
        timestamp: isoOrEpoch(t.tradeTime),
        side: t.side,
        price: t.price,
        amount: t.amount,
        botId: t.botId,
        botName: (_a = botNames.get(t.botId)) !== null && _a !== void 0 ? _a : "Unknown",
        pnl: t.pnl,
        fee: t.fee,
        isMaker: t.isMaker,
        counterpartyUserId: t.counterpartyUserId,
        type: "REAL",
    }); });
    const merged = (0, operator_trade_feed_1.mergeOperatorTrades)([
        { id: "aiMarketMakerHistory", rows: simulatedRows, total: count },
        { id: "ai_bot_real_trades", rows: realRows, total: realRows.length },
    ], pageNum, perPageNum);
    const ledgerBeginsAt = bots.reduce((min, b) => {
        if (!b.firstRealTradeAt)
            return min;
        const t = new Date(b.firstRealTradeAt);
        if (Number.isNaN(t.getTime()))
            return min;
        return min === null || t < min ? t : min;
    }, null);
    const coverage = (0, operator_trade_feed_1.realTradeCoverage)({
        windowStart: ledgerWindow.windowStart,
        requestedStart: rangeStart,
        ledgerBeginsAt,
    });
    const coverageReason = unreadableBots.length
        ? `the real-fill ledger could not be read for ${unreadableBots.length} of ` +
            `${ledgerBotIds.length} bot(s), so real fills are missing from this page` +
            (coverage.reason ? `; ${coverage.reason}` : "")
        : coverage.reason;
    let totalVolume = 0;
    let totalPnL = 0;
    let priceSum = 0;
    for (const row of merged.rows) {
        totalVolume += row.amount;
        totalPnL += row.pnl;
        priceSum += row.price;
    }
    const avgPrice = merged.rows.length > 0 ? priceSum / merged.rows.length : 0;
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Market Maker Trades retrieved successfully");
    return {
        data: merged.rows,
        pagination: {
            currentPage: pageNum,
            perPage: perPageNum,
            total: merged.total,
            totalPages: merged.totalPages,
            incompleteSources: merged.incompleteSources,
        },
        summary: {
            totalTrades: merged.total,
            pageVolume: totalVolume,
            pageAvgPrice: avgPrice,
            pagePnL: totalPnL,
            totalVolume,
            avgPrice,
            totalPnL,
        },
        realTrades: {
            source: "ai_bot_real_trades",
            windowDays: ledgerWindow.days,
            windowStart: ledgerWindow.windowStart.toISOString(),
            count: realRows.length,
            unreadableBots: unreadableBots.length,
            complete: coverage.complete && unreadableBots.length === 0,
            reason: coverageReason,
        },
    };
};
