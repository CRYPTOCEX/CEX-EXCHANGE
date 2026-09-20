"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const utils_1 = require("../../utils");
exports.metadata = {
    summary: "Aggregator order book for one market (CoinMarketCap shape)",
    description: "Aggregated (level 2) depth for one listed market: { timestamp, bids, asks } with each " +
        "level a [price, amount] pair, bids descending and asks ascending. The pair may be spelt " +
        "BTC_USDT, BTC-USDT or BTC/USDT. " +
        "For markets matched by this platform's own engine the book published here is the " +
        "ORDER-BACKED depth only — the AI market maker's display levels carry no resting order " +
        "and cannot be filled against, so they are excluded and this book can be thinner than the " +
        "one on the trade screen. Unauthenticated.",
    operationId: "getPublicOrderbook",
    tags: ["Public", "Aggregator"],
    requiresAuth: false,
    parameters: [
        {
            index: 0,
            name: "pair",
            in: "path",
            required: true,
            description: "Market pair, e.g. BTC_USDT",
            schema: { type: "string" },
        },
        {
            name: "depth",
            in: "query",
            required: false,
            description: `Levels per side (1-${utils_1.MAX_BOOK_DEPTH}, default ${utils_1.DEFAULT_BOOK_DEPTH})`,
            schema: { type: "number" },
        },
    ],
    responses: {
        200: {
            description: "Order book",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            timestamp: { type: "number" },
                            bids: {
                                type: "array",
                                items: { type: "array", items: { type: "number" } },
                            },
                            asks: {
                                type: "array",
                                items: { type: "array", items: { type: "number" } },
                            },
                        },
                    },
                },
            },
        },
        404: { description: "The pair is not a listed market" },
        503: { description: "The venue behind this market is not reachable" },
    },
};
exports.default = async (data) => {
    var _a;
    const { params, query, ctx } = data;
    const parsed = (0, utils_1.parsePairParam)(params === null || params === void 0 ? void 0 : params.pair);
    if (!parsed) {
        throw (0, error_1.createError)(404, `"${params === null || params === void 0 ? void 0 : params.pair}" is not a market pair`);
    }
    const market = await (0, utils_1.resolveMarket)(params === null || params === void 0 ? void 0 : params.pair);
    if (!market) {
        throw (0, error_1.createError)(404, `${parsed.currency}_${parsed.pair} is not a listed market on this exchange`);
    }
    const depth = (0, utils_1.clampDepth)(query === null || query === void 0 ? void 0 : query.depth);
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Reading ${market.symbol} depth (${depth} levels)`);
    let book;
    try {
        book = await (0, utils_1.readOrderbook)(market, depth);
    }
    catch (error) {
        console_1.logger.error("PUBLIC", `Aggregator order book failed for ${market.symbol}: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`, error);
        book = null;
    }
    if (!book) {
        throw (0, error_1.createError)(503, `The order book for ${market.pairKey} is not available right now`);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${market.pairKey}: ${book.bids.length} bids, ${book.asks.length} asks`);
    return book;
};
