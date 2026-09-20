"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Retrieves detailed information of a specific exchange market by ID",
    operationId: "getExchangeMarketById",
    tags: ["Admin", "Exchange Markets"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the exchange market to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Exchange market details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseMarketSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Exchange Market"),
        500: query_1.serverErrorResponse,
    },
    permission: "view.exchange.market",
    requiresAuth: true,
};
exports.default = async (data) => {
    const { params } = data;
    return await (0, query_1.getRecord)("exchangeMarket", params.id);
};
