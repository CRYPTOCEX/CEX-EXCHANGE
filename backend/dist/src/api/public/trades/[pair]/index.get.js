"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const utils_1 = require("../../utils");
exports.metadata = {
    summary: "Aggregator recent trades for one market (CoinMarketCap shape)",
    description: "The recent public tape for one listed market: trade_id, price, base_volume, quote_volume " +
        "and timestamp, newest first. The pair may be spelt BTC_USDT, BTC-USDT or BTC/USDT. " +
        "`type` (the taker's side) is NOT published: the stored tape records both legs of a fill " +
        "with a fixed BUY/SELL pair regardless of which side crossed, so this venue cannot state " +
        "the aggressor. " +
        "Only markets matched by this platform's own engine have an on-venue tape; a market routed " +
        "to an external liquidity provider answers 404, because the provider's prints are that " +
        "venue's trades and not this one's. Unauthenticated.",
    operationId: "getPublicTrades",
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
            name: "limit",
            in: "query",
            required: false,
            description: `Trades to return (1-${utils_1.MAX_TRADE_LIMIT}, default ${utils_1.DEFAULT_TRADE_LIMIT})`,
            schema: { type: "number" },
        },
    ],
    responses: {
        200: {
            description: "Recent trades, newest first",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                trade_id: { type: "string" },
                                price: { type: "number" },
                                base_volume: { type: "number" },
                                quote_volume: { type: "number" },
                                timestamp: { type: "number" },
                            },
                        },
                    },
                },
            },
        },
        404: { description: "The pair is not listed, or publishes no on-venue tape" },
        503: { description: "The tape for this market is not reachable" },
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
    if (market.venue !== "ECO") {
        throw (0, error_1.createError)(404, `${market.pairKey} is routed to an external liquidity provider; ` +
            `this exchange publishes no trade tape of its own for it`);
    }
    const limit = (0, utils_1.clampTradeLimit)(query === null || query === void 0 ? void 0 : query.limit);
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Reading the ${market.symbol} tape (${limit} trades)`);
    let trades;
    try {
        trades = await (0, utils_1.readTrades)(market, limit);
    }
    catch (error) {
        console_1.logger.error("PUBLIC", `Aggregator tape failed for ${market.symbol}: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`, error);
        trades = null;
    }
    if (!trades) {
        throw (0, error_1.createError)(503, `The trade history for ${market.pairKey} is not available right now`);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${market.pairKey}: ${trades.length} trades`);
    return trades;
};
