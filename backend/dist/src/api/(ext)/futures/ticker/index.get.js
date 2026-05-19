"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const redis_1 = require("@b/utils/redis");
const query_1 = require("@b/utils/query");
const matchingEngine_1 = require("@b/api/(ext)/futures/utils/matchingEngine");
const utils_1 = require("../order/utils");
const redis = redis_1.RedisSingleton.getInstance();
exports.metadata = {
    summary: "Get All Market Tickers",
    operationId: "getAllMarketTickers",
    tags: ["Exchange", "Markets"],
    logModule: "FUTURES",
    logTitle: "Get all futures market tickers",
    description: "Retrieves ticker information for all available market pairs.",
    responses: {
        200: {
            description: "All market tickers information",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseTickerSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Ticker"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a, _b, _c;
    const { ctx } = data;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Initializing futures matching engine");
    const engine = await matchingEngine_1.FuturesMatchingEngine.getInstance();
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Fetching all futures market tickers");
    const tickers = await engine.getTickers();
    (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, `Retrieved ${Object.keys(tickers || {}).length} tickers`);
    return tickers;
};
