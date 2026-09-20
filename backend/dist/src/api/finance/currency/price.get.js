"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const utils_1 = require("./utils");
const query_1 = require("@b/utils/query");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Get price in USD for a currency",
    description: "Returns the price in USD for a given currency and wallet type.",
    operationId: "getCurrencyPriceInUSD",
    tags: ["Finance", "Currency"],
    logModule: "FINANCE",
    logTitle: "Get currency price in USD",
    parameters: [
        {
            name: "currency",
            in: "query",
            description: "The currency to get the price for",
            required: true,
            schema: {
                type: "string",
            },
        },
        {
            name: "type",
            in: "query",
            description: "The wallet type of the currency",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requiresAuth: true,
    responses: {
        200: {
            description: "Price in USD retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            ...utils_1.baseResponseSchema,
                            data: {
                                type: "number",
                                description: "Price of the currency in USD",
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Currency"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)(401, "Unauthorized");
    }
    const { currency, type } = query;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating price query parameters");
    if (!currency || !type) {
        console_1.logger.error("CURRENCY", "Missing required parameters for price lookup", { currency, type });
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing required query parameters");
        throw (0, error_1.createError)(400, "Missing required query parameters");
    }
    let priceUSD;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching price for ${currency} (${type})`);
        switch (type) {
            case "FIAT":
                priceUSD = await (0, utils_1.getFiatPriceInUSD)(currency);
                break;
            case "SPOT":
                priceUSD = await (0, utils_1.getSpotPriceInUSD)(currency);
                break;
            case "ECO":
                priceUSD = await (0, utils_1.getEcoPriceInUSD)(currency);
                break;
            default:
                console_1.logger.error("CURRENCY", `Invalid wallet type for price lookup: ${type}`);
                ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Invalid wallet type: ${type}`);
                throw (0, error_1.createError)(400, `Invalid type: ${type}`);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating price data");
        if (priceUSD === null || priceUSD === undefined || isNaN(priceUSD)) {
            console_1.logger.error("CURRENCY", `Invalid price returned for ${currency} (${type})`, {
                currency,
                type,
                priceUSD,
                priceType: typeof priceUSD
            });
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Price not found for ${currency} (${type})`);
            throw (0, error_1.createError)(404, `Price not found for ${currency} (${type})`);
        }
        if (priceUSD === 0) {
            console_1.logger.warn("CURRENCY", `Price is 0 for ${currency} (${type}) - no trading activity or unlisted token`);
            ctx === null || ctx === void 0 ? void 0 : ctx.warn(`Price is 0 for ${currency} (${type})`);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved price for ${currency} (${type}): $${priceUSD}`);
        return {
            status: true,
            message: "Price in USD retrieved successfully",
            data: priceUSD,
        };
    }
    catch (error) {
        console_1.logger.error("CURRENCY", `Error fetching price for ${currency} (${type})`, error);
        if (!error.statusCode) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Error fetching price for ${currency} (${type})`);
        }
        throw error;
    }
};
