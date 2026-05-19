"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const utils_1 = require("../utils");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get a single exchange currency",
    operationId: "getCurrency",
    tags: ["Admin", "Exchange Currencies"],
    description: "Retrieve details of a single exchange currency by ID",
    parameters: [
        {
            in: "path",
            name: "id",
            required: true,
            schema: {
                type: "string",
            },
            description: "ID of the exchange currency",
        },
    ],
    responses: {
        200: {
            description: "Details of the exchange currency",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseExchangeCurrencySchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Exchange Currency"),
        500: query_1.serverErrorResponse,
    },
    permission: "view.spot.currency",
    logModule: "ADMIN_FIN",
    logTitle: "Get Exchange Currency",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching exchange currency");
    const currency = await db_1.models.exchangeCurrency.findOne({
        where: { id: parseInt(params.id) },
    });
    if (!currency) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Currency not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Exchange currency retrieved successfully");
    return currency.get({ plain: true });
};
