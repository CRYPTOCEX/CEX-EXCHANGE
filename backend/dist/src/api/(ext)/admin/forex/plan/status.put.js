"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates Forex plan statuses",
    description: "Updates the active/inactive status of multiple Forex plans at once. Active plans are visible to users for investment.",
    operationId: "bulkUpdateForexPlanStatus",
    tags: ["Admin", "Forex", "Plan"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of forex plan IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "boolean",
                            description: "New status to apply to the forex plans (true for active, false for inactive)",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Forex Plan"),
    requiresAuth: true,
    permission: "edit.forex.plan",
    logModule: "ADMIN_FOREX",
    logTitle: "Bulk update forex plan status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating ${ids.length} IDs`);
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating status for ${ids.length} records`);
    const result = await (0, query_1.updateStatus)("forexPlan", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Successfully updated status for ${ids.length} records`);
    return result;
};
