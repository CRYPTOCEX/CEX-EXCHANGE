"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Retrieves a single currency by its ID",
    description: "This endpoint retrieves a single currency by its ID.",
    operationId: "getCurrencyById",
    tags: ["Finance", "Currency"],
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "type",
            in: "query",
            required: true,
            schema: {
                type: "string",
                enum: ["FIAT", "SPOT", "ECO"],
            },
        },
    ],
    responses: {
        200: {
            description: "Currency retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                value: { type: "string" },
                                label: { type: "string" },
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
    logModule: "ADMIN_FIN",
    logTitle: "Get Currency Options",
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)(401, "Unauthorized");
    const { type } = query;
    const where = { status: true };
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching currency options");
        let currencies;
        let formatted;
        switch (type) {
            case "FIAT":
                currencies = await db_1.models.currency.findAll({ where });
                formatted = currencies.map((currency) => ({
                    id: currency.id,
                    name: `${currency.id} > ${currency.name}`,
                }));
                break;
            case "SPOT":
                currencies = await db_1.models.exchangeCurrency.findAll({ where });
                formatted = currencies.map((currency) => ({
                    id: currency.currency,
                    name: `${currency.currency} > ${currency.name}`,
                }));
                break;
            case "ECO":
                currencies = await db_1.models.ecosystemToken.findAll({ where });
                formatted = currencies
                    .filter((currency, index, self) => self.findIndex((c) => c.currency === currency.currency) === index)
                    .map((currency) => ({
                    id: currency.currency,
                    name: `${currency.currency} > ${currency.name}`,
                }));
                break;
            default:
                formatted = [];
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Currency options retrieved successfully");
        return formatted;
    }
    catch (error) {
        throw (0, error_1.createError)(500, "An error occurred while fetching currencies");
    }
};
