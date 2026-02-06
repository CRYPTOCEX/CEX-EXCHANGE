"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const utils_1 = require("./utils");
const query_1 = require("@b/utils/query");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Lists all currencies with their current rates",
    description: "This endpoint retrieves all available currencies along with their current rates.",
    operationId: "getCurrencies",
    tags: ["Finance", "Currency"],
    logModule: "FINANCE",
    logTitle: "Get valid currencies",
    responses: {
        200: {
            description: "Currencies retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            ...utils_1.baseResponseSchema,
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.baseCurrencySchema,
                                },
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
    const { ctx } = data;
    const where = { status: true };
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching currencies from all wallet types");
        const [fiatCurrencies, spotCurrencies, ecoCurrencies] = await Promise.all([
            db_1.models.currency.findAll({ where }),
            db_1.models.exchangeCurrency.findAll({ where }),
            db_1.models.ecosystemToken.findAll({ where }),
        ]);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Formatting currency data");
        const formattedCurrencies = {
            FIAT: fiatCurrencies.map((currency) => ({
                value: currency.id,
                label: `${currency.id} - ${currency.name}`,
            })),
            SPOT: spotCurrencies.map((currency) => ({
                value: currency.currency,
                label: `${currency.currency} - ${currency.name}`,
            })),
            FUNDING: ecoCurrencies
                .filter((currency, index, self) => self.findIndex((c) => c.currency === currency.currency) === index)
                .map((currency) => ({
                value: currency.currency,
                label: `${currency.currency} - ${currency.name}`,
            })),
        };
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${fiatCurrencies.length} FIAT, ${spotCurrencies.length} SPOT, ${ecoCurrencies.length} ECO currencies`);
        return formattedCurrencies;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to fetch currencies");
        throw (0, error_1.createError)(500, "An error occurred while fetching currencies");
    }
};
