"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates the status of exchange currencies",
    operationId: "bulkUpdateExchangeCurrencyStatus",
    tags: ["Admin", "Exchange Currencies"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of exchange currency IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "boolean",
                            description: "New status to apply to the exchange currencies (true for active, false for inactive)",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("ExchangeCurrency"),
    requiresAuth: true,
    permission: "edit.spot.currency",
    logModule: "ADMIN_FIN",
    logTitle: "Bulk update spot currency status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating status for ${ids.length} spot currency(ies)`);
    const result = await (0, query_1.updateStatus)("exchangeCurrency", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Spot currency status updated successfully");
    return result;
};
