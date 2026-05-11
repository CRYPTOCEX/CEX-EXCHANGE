"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates Forex signal statuses",
    description: "Updates the active/inactive status of multiple Forex signals at once. Active signals are available for user subscriptions.",
    operationId: "bulkUpdateForexSignalStatus",
    tags: ["Admin", "Forex", "Signal"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of forex signal IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "string",
                            enum: ["ACTIVE", "INACTIVE"],
                            description: "New status to apply to the forex signals",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Forex Signal"),
    requiresAuth: true,
    permission: "edit.forex.signal",
    logModule: "ADMIN_FOREX",
    logTitle: "Bulk update forex signal status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating ${ids.length} IDs`);
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating status for ${ids.length} records`);
    const result = await (0, query_1.updateStatus)("forexSignal", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Successfully updated status for ${ids.length} records`);
    return result;
};
