"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const schema_1 = require("@b/utils/schema");
const query_1 = require("@b/utils/query");
const utils_1 = require("./currency/utils");
const cache_1 = require("@b/utils/cache");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Get exchange rate between two currencies",
    description: "Calculates the exchange rate between two currencies across different wallet types (FIAT, SPOT, ECO, FUTURES)",
    operationId: "getExchangeRate",
    tags: ["Finance"],
    requiresAuth: true,
    parameters: [
        {
            name: "fromCurrency",
            in: "query",
            description: "Source currency code (e.g., EUR, USD, BTC)",
            required: true,
            schema: { type: "string" },
        },
        {
            name: "fromType",
            in: "query",
            description: "Source wallet type (FIAT, SPOT, ECO, FUTURES)",
            required: true,
            schema: { type: "string", enum: ["FIAT", "SPOT", "ECO", "FUTURES"] },
        },
        {
            name: "toCurrency",
            in: "query",
            description: "Target currency code (e.g., EUR, USD, BTC)",
            required: true,
            schema: { type: "string" },
        },
        {
            name: "toType",
            in: "query",
            description: "Target wallet type (FIAT, SPOT, ECO, FUTURES)",
            required: true,
            schema: { type: "string", enum: ["FIAT", "SPOT", "ECO", "FUTURES"] },
        },
    ],
    responses: {
        200: {
            description: "Exchange rate calculated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            rate: (0, schema_1.baseNumberSchema)("Exchange rate the transfer will settle at, spread included (1 fromCurrency = X toCurrency)"),
                            midRate: (0, schema_1.baseNumberSchema)("Mid-market rate before the platform spread"),
                            fromPriceUSD: (0, schema_1.baseNumberSchema)("Price of one unit of the source currency in USD"),
                            toPriceUSD: (0, schema_1.baseNumberSchema)("Price of one unit of the target currency in USD"),
                            spreadPercentage: (0, schema_1.baseNumberSchema)("Platform spread applied to the mid-market rate, in percent"),
                        },
                    },
                },
            },
        },
        400: {
            description: "Invalid parameters or currencies",
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Currency"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, query } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { fromCurrency, fromType, toCurrency, toType } = query;
    if (!fromCurrency || !fromType || !toCurrency || !toType) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Missing required parameters: fromCurrency, fromType, toCurrency, toType",
        });
    }
    const validTypes = ["FIAT", "SPOT", "ECO", "FUTURES"];
    if (!validTypes.includes(fromType) || !validTypes.includes(toType)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid wallet type. Must be FIAT, SPOT, ECO, or FUTURES",
        });
    }
    try {
        const cacheManager = cache_1.CacheManager.getInstance();
        const settings = await cacheManager.getSettings();
        const walletTransferSpread = Number(settings.get("walletTransferSpread")) || 0;
        const { rate, midRate, fromPriceUSD, toPriceUSD, spreadPercentage } = await (0, utils_1.getCrossWalletRate)(fromCurrency, fromType, toCurrency, toType, walletTransferSpread);
        return {
            rate,
            midRate,
            fromPriceUSD,
            toPriceUSD,
            spreadPercentage,
        };
    }
    catch (error) {
        if (error.statusCode) {
            throw error;
        }
        console_1.logger.error("EXCHANGE", "Error calculating exchange rate", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message || "Failed to calculate exchange rate",
        });
    }
};
