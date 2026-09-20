"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Delete gateway merchant",
    description: "Permanently deletes a gateway merchant account and all associated data including API keys, payments, and balances. This action cannot be undone.",
    operationId: "deleteGatewayMerchant",
    tags: ["Admin", "Gateway", "Merchant"],
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Merchant UUID",
            schema: { type: "string", format: "uuid" },
        },
    ],
    responses: {
        200: {
            description: "Merchant deleted successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Merchant"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "delete.gateway.merchant",
    logModule: "ADMIN_GATEWAY",
    logTitle: "Delete merchant",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting merchant ${id}`);
    const result = await (0, query_1.handleSingleDelete)({
        model: "gatewayMerchant",
        id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Merchant ${id} deleted successfully`);
    return result;
};
