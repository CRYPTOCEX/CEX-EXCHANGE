"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Updates an existing binary order",
    operationId: "updateBinaryOrder",
    tags: ["Admin", "Binary Order"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "The ID of the binary order to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        required: true,
        description: "Updated data for the binary order",
        content: {
            "application/json": {
                schema: utils_1.binaryOrderUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Binary Order"),
    requiresAuth: true,
    permission: "edit.binary.order",
    logModule: "ADMIN_FIN",
    logTitle: "Update Binary Order",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { symbol, price, amount, profit, side, type, status, isDemo, closePrice, } = body;
    return await (0, query_1.updateRecord)("binaryOrder", id, {
        symbol,
        price,
        amount,
        profit,
        side,
        type,
        status,
        isDemo,
        closePrice,
    });
};
