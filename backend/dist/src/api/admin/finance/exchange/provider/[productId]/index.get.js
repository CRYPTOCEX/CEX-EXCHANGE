"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Retrieves detailed information of a specific exchange by ID",
    operationId: "getExchangeById",
    tags: ["Admin", "Exchanges"],
    parameters: [
        {
            index: 0,
            name: "productId",
            in: "path",
            required: true,
            description: "ID of the exchange to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Exchange details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseExchangeSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Exchange"),
        500: query_1.serverErrorResponse,
    },
    permission: "view.exchange",
    requiresAuth: true,
};
exports.default = async (data) => {
    const { params, ctx } = data;
    const { productId } = params;
    const exchange = await db_1.models.exchange.findOne({
        where: { productId },
    });
    if (!exchange) {
        return data.response.notFound("Exchange not found");
    }
    const result = await exchange_1.default.testExchangeCredentials(exchange.name, ctx);
    return {
        exchange,
        result,
    };
};
