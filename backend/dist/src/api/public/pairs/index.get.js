"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Aggregator pair list (CoinGecko shape)",
    description: "Every market this exchange lists, as CoinGecko's /pairs document: ticker_id, base and " +
        "target. It is the document CoinGecko reads first to learn which markets exist, so it " +
        "carries NO prices and is deliberately not gated on one — a market that has not traded " +
        "yet is still a market, and omitting it here tells the crawler the pair does not exist. " +
        "That is the opposite of the rule /summary follows, where a market with no price is " +
        "omitted rather than quoted at zero. Unions the provider venue with this platform's own " +
        "markets, and answers 200 with an empty array on a cold start rather than 404, because " +
        "an aggregator reads a 404 as a dead exchange. Unauthenticated.",
    operationId: "getPublicPairs",
    tags: ["Public", "Aggregator"],
    requiresAuth: false,
    responses: {
        200: {
            description: "Listed markets",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                ticker_id: { type: "string" },
                                base: { type: "string" },
                                target: { type: "string" },
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Listing markets");
    const pairs = (0, utils_1.buildPairs)(await (0, utils_1.loadMarkets)());
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Published ${pairs.length} pairs`);
    return pairs;
};
