"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates the status of currencies",
    operationId: "bulkUpdateCurrencyPrice",
    tags: ["Admin", "Currencies"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of currency IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "boolean",
                            description: "New status to apply to the currencies (true for active, false for inactive)",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Currency"),
    requiresAuth: true,
    permission: "edit.fiat.currency",
    logModule: "ADMIN_FIN",
    logTitle: "Bulk update fiat currency status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating status for ${ids.length} fiat currency(ies)`);
    const result = await (0, query_1.updateStatus)("currency", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Fiat currency status updated successfully");
    return result;
};
