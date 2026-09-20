"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Aggregator tickers (CoinMarketCap shape)",
    description: "An object keyed by market pair (BTC_USDT) carrying base_id, quote_id, last_price, " +
        "base_volume, quote_volume and isFrozen. Unions BOTH venues this platform runs - the " +
        "markets routed to the configured exchange provider and the markets matched by this " +
        "platform's own engine - because an adapter that reads one of them under-reports the " +
        "exchange by the whole of the other. Unauthenticated; a cold feed answers 200 with an " +
        "empty object rather than a 404.",
    operationId: "getPublicTickers",
    tags: ["Public", "Aggregator"],
    requiresAuth: false,
    responses: {
        200: {
            description: "Tickers keyed by market pair",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        additionalProperties: {
                            type: "object",
                            properties: {
                                base_id: { type: "string" },
                                quote_id: { type: "string" },
                                last_price: { type: "number" },
                                base_volume: { type: "number" },
                                quote_volume: { type: "number" },
                                isFrozen: { type: "number" },
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Building aggregator tickers");
    const { tickers } = await (0, utils_1.getAggregatorDocuments)();
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Published ${Object.keys(tickers).length} tickers`);
    return tickers;
};
