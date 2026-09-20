"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const utils_1 = require("../order/utils");
const queries_1 = require("@b/api/(ext)/ecosystem/utils/scylla/queries");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Retrieves historical data for a specific symbol",
    description: "Fetches historical price data based on the specified interval and date range.",
    operationId: "getHistoricalData",
    tags: ["Market", "Historical"],
    logModule: "ECOSYSTEM",
    logTitle: "Get historical chart data",
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
    const { query, ctx } = data;
    const { symbol, from, to, interval } = query;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating query parameters");
    if (!from || !to || !interval) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing required parameters");
        throw (0, error_1.createError)({ statusCode: 400, message: "Both `from`, `to`, and `interval` must be provided." });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching historical candles for ${symbol}`);
    const bars = await (0, queries_1.getHistoricalCandles)(symbol, interval, Number(from), Number(to));
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${(bars === null || bars === void 0 ? void 0 : bars.length) || 0} candles for ${symbol}`);
    return bars;
};
