"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Updates an existing exchange order",
    operationId: "updateExchangeOrder",
    tags: ["Admin", "Exchange Orders"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "The ID of the exchange order to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        required: true,
        description: "Updated data for the exchange order",
        content: {
            "application/json": {
                schema: utils_1.exchangeOrderUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Exchange Order"),
    requiresAuth: true,
    permission: "edit.exchange.order",
    logModule: "ADMIN_FIN",
    logTitle: "Update Exchange Order",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { referenceId, status, side, price, amount, fee, feeCurrency } = body;
    return await (0, query_1.updateRecord)("exchangeOrder", id, {
        referenceId,
        status,
        side,
        price,
        amount,
        fee,
        feeCurrency,
    });
};
