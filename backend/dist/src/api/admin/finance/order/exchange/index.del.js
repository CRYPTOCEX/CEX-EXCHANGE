"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk deletes exchange orders by IDs",
    operationId: "bulkDeleteExchangeOrders",
    tags: ["Admin", "Exchange Orders"],
    parameters: (0, query_1.commonBulkDeleteParams)("Exchange Orders"),
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            items: { type: "string" },
                            description: "Array of exchange order IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("Exchange Orders"),
    requiresAuth: true,
    permission: "delete.exchange.order",
    logModule: "ADMIN_FIN",
    logTitle: "Bulk Delete Exchange Orders",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Delete Exchange Orders...");
    const result = await (0, query_1.handleBulkDelete)({
        model: "exchangeOrder",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Bulk Delete Exchange Orders completed successfully");
    return result;
};
