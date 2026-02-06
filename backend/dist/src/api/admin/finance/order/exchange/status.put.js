"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates the status of exchange orders",
    operationId: "bulkUpdateExchangeOrderStatus",
    tags: ["Admin", "Exchange Orders"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of exchange order IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "string",
                            description: "New status to apply to the exchange orders",
                            enum: ["OPEN", "CLOSED", "CANCELLED"],
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Exchange Order"),
    requiresAuth: true,
    permission: "edit.exchange.order",
    logModule: "ADMIN_FIN",
    logTitle: "Bulk Update Exchange Order Status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Update Exchange Order Status...");
    const result = await (0, query_1.updateStatus)("exchangeOrder", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Bulk Update Exchange Order Status completed successfully");
    return result;
};
