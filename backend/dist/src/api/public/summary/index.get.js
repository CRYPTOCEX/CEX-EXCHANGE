"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Aggregator market summary (CoinMarketCap shape)",
    description: "Every listed market on this exchange with its 24-hour figures, in the field names " +
        "market-data aggregators expect: trading_pairs, base_currency, quote_currency, " +
        "last_price, lowest_ask, highest_bid, base_volume, quote_volume, " +
        "price_change_percent_24h, highest_price_24h, lowest_price_24h. " +
        "Unauthenticated and never refuses: a venue with no live prices yet answers 200 with " +
        "an empty array, because an aggregator reads a 404 as a dead exchange. Fields whose " +
        "value this venue cannot state are OMITTED rather than reported as zero, and volume " +
        "counts only what traded here.",
    operationId: "getPublicMarketSummary",
    tags: ["Public", "Aggregator"],
    requiresAuth: false,
    responses: {
        200: {
            description: "Market summary",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                trading_pairs: { type: "string" },
                                base_currency: { type: "string" },
                                quote_currency: { type: "string" },
                                last_price: { type: "number" },
                                lowest_ask: { type: "number" },
                                highest_bid: { type: "number" },
                                base_volume: { type: "number" },
                                quote_volume: { type: "number" },
                                price_change_percent_24h: { type: "number" },
                                highest_price_24h: { type: "number" },
                                lowest_price_24h: { type: "number" },
                            },
                        },
                    },
                },
            },
        },
    },
};
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Building aggregator summary");
    const { summary } = await (0, utils_1.getAggregatorDocuments)();
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Published ${summary.length} markets`);
    return summary;
};
