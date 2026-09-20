"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Retrieves all futures markets",
    description: "Fetches a list of all active futures markets.",
    operationId: "listFuturesMarkets",
    tags: ["Futures", "Markets"],
    logModule: "FUTURES",
    logTitle: "List futures markets",
    responses: {
        200: {
            description: "Futures markets retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: utils_1.baseFuturesMarketSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Futures Market"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a, _b, _c;
    const { ctx } = data;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Fetching active futures markets");
    const markets = await db_1.models.futuresMarket.findAll({
        where: { status: true },
    });
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Formatting market data");
    const result = markets.map((market) => ({
        ...market.toJSON(),
        symbol: `${market.currency}/${market.pair}`,
    }));
    (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, `Retrieved ${result.length} active futures markets`);
    return result;
};
