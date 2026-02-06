"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const utils_1 = require("@b/api/exchange/utils");
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const console_1 = require("@b/utils/console");
const query_1 = require("@b/utils/query");
const utils_2 = require("@b/api/exchange/utils");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get Market Order Book",
    operationId: "getMarketOrderBook",
    tags: ["Exchange", "Markets"],
    description: "Retrieves the order book for a specific market pair.",
    logModule: "EXCHANGE",
    logTitle: "Get Orderbook for Pair",
    parameters: [
        {
            name: "currency",
            in: "path",
            description: "Currency symbol",
            required: true,
            schema: { type: "string" },
        },
        {
            name: "pair",
            in: "path",
            description: "Pair symbol",
            required: true,
            schema: { type: "string" },
        },
        {
            name: "limit",
            in: "query",
            description: "Limit the number of order book entries",
            schema: { type: "number" },
        },
    ],
    responses: {
        200: {
            description: "Order book information",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseOrderBookSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Orderbook"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    const { currency, pair } = params;
    const limit = query.limit ? parseInt(query.limit, 10) : 50;
    const symbol = `${currency}/${pair}`;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching orderbook for ${symbol}`);
        const unblockTime = await (0, utils_2.loadBanStatus)();
        if (await (0, utils_2.handleBanStatus)(unblockTime)) {
            throw (0, error_1.createError)(503, "Service temporarily unavailable. Please try again later.");
        }
        const exchange = await exchange_1.default.startExchange(ctx);
        if (!exchange) {
            throw (0, error_1.createError)(503, "Service temporarily unavailable. Please try again later.");
        }
        const orderBook = await exchange.fetchOrderBook(symbol, limit);
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Orderbook retrieved for ${symbol}`);
        return {
            asks: orderBook.asks,
            bids: orderBook.bids,
        };
    }
    catch (error) {
        console_1.logger.error("EXCHANGE", "Failed to fetch order book", error);
        if (error.statusCode === 503) {
            throw error;
        }
        throw (0, error_1.createError)(500, "Unable to fetch order book at this time");
    }
};
