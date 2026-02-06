"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Retrieves detailed information of a specific exchange order by ID",
    operationId: "getExchangeOrderById",
    tags: ["Admin", "Exchange Order"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the exchange order to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Exchange order details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.orderSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Exchange Order"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.exchange.order",
    demoMask: ["user.email"],
};
exports.default = async (data) => {
    const { params } = data;
    const exclude = [
        "referenceId",
        "status",
        "symbol",
        "type",
        "timeInForce",
        "side",
        "price",
        "amount",
        "fee",
        "feeCurrency",
    ];
    return await (0, query_1.getRecord)("exchangeOrder", params.id, [
        {
            model: db_1.models.user,
            as: "user",
            attributes: ["id", "firstName", "lastName", "email", "avatar"],
        },
    ]);
};
