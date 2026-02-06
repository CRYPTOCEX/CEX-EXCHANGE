"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const candle_1 = require("@b/api/(ext)/futures/utils/queries/candle");
const utils_1 = require("../order/utils");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Retrieves historical data for a specific futures symbol",
    description: "Fetches historical price data based on the specified interval and date range.",
    operationId: "getFuturesHistoricalData",
    tags: ["Futures", "Historical"],
    logModule: "FUTURES",
    logTitle: "Get futures historical data",
    parameters: [
        {
            name: "symbol",
            in: "query",
            required: true,
            schema: { type: "string", description: "Trading symbol, e.g., BTC/USD" },
        },
        {
            name: "from",
            in: "query",
            required: true,
            schema: {
                type: "number",
                description: "Start timestamp for historical data",
            },
        },
        {
            name: "to",
            in: "query",
            required: true,
            schema: {
                type: "number",
                description: "End timestamp for historical data",
            },
        },
        {
            name: "interval",
            in: "query",
            required: true,
            schema: {
                type: "string",
                description: "Time interval for the data, e.g., 1m, 5m, 1h",
            },
        },
    ],
    responses: {
        200: {
            description: "Historical data retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: utils_1.baseHistoricalDataSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Chart"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a, _b, _c, _d;
    const { query, ctx } = data;
    const { symbol, from, to, interval } = query;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Validating request parameters");
    if (!from || !to || !interval) {
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, "Missing required parameters");
        throw (0, error_1.createError)({ statusCode: 400, message: "Both `from`, `to`, and `interval` must be provided." });
    }
    (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, `Fetching historical candles for ${symbol}`);
    const bars = await (0, candle_1.getHistoricalCandles)(symbol, interval, Number(from), Number(to));
    (_d = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _d === void 0 ? void 0 : _d.call(ctx, `Retrieved ${(bars === null || bars === void 0 ? void 0 : bars.length) || 0} candles`);
    return bars;
};
