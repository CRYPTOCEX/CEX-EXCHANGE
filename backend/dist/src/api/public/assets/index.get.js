"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Aggregator asset list (CoinMarketCap shape)",
    description: "The assets this exchange supports, keyed by symbol, each with name, can_withdraw, " +
        "can_deposit and — where this venue actually holds them — min_withdraw and max_withdraw. " +
        "unified_cryptoasset_id, maker_fee and taker_fee are deliberately absent: this platform " +
        "stores no CoinMarketCap asset ids, and its trading fees are configured per MARKET rather " +
        "than per asset, so a per-asset fee here would be invented. Unauthenticated.",
    operationId: "getPublicAssets",
    tags: ["Public", "Aggregator"],
    requiresAuth: false,
    responses: {
        200: {
            description: "Assets keyed by symbol",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        additionalProperties: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                can_withdraw: { type: "boolean" },
                                can_deposit: { type: "boolean" },
                                min_withdraw: { type: "number" },
                                max_withdraw: { type: "number" },
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Listing supported assets");
    const assets = await (0, utils_1.readAssets)();
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Published ${Object.keys(assets).length} assets`);
    return assets;
};
