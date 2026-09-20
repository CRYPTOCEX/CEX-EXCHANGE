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
exports.metadata = {
    summary: "Get Market Ticker",
    operationId: "getMarketTicker",
    tags: ["Exchange", "Markets"],
    description: "Retrieves ticker information for a specific market pair.",
    logModule: "EXCHANGE",
    logTitle: "Get Ticker for Pair",
    parameters: [
        {
            name: "currency",
            in: "path",
            required: true,
            description: "The base currency of the market pair.",
            schema: { type: "string" },
        },
        {
            name: "pair",
            in: "path",
            required: true,
            description: "The quote currency of the market pair.",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Ticker information",
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
    const { params, ctx } = data;
    const { currency, pair } = params;
    const symbol = `${currency}/${pair}`;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching ticker for ${symbol}`);
        const unblockTime = await (0, utils_2.loadBanStatus)();
        if (await (0, utils_2.handleBanStatus)(unblockTime)) {
            return query_1.serverErrorResponse;
        }
        const exchange = await exchange_1.default.startExchange(ctx);
        if (!exchange) {
            console_1.logger.error("EXCHANGE", "Failed to start exchange");
            return query_1.serverErrorResponse;
        }
        const ticker = await exchange.fetchTicker(symbol);
        if (!ticker) {
            return (0, query_1.notFoundMetadataResponse)("Ticker");
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Ticker retrieved for ${symbol}`);
        return {
            symbol: ticker.symbol,
            bid: ticker.bid,
            ask: ticker.ask,
            close: ticker.close,
            last: ticker.last,
            change: ticker.percentage,
            baseVolume: ticker.baseVolume,
            quoteVolume: ticker.quoteVolume,
        };
    }
    catch (error) {
        const result = await (0, utils_2.handleExchangeError)(error, exchange_1.default);
        if (typeof result === "number") {
            return query_1.serverErrorResponse;
        }
        console_1.logger.error("EXCHANGE", "Failed to fetch ticker", error);
        return query_1.serverErrorResponse;
    }
};
