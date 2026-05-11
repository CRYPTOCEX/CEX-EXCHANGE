"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates AI Investment Plan status",
    operationId: "bulkUpdateAiInvestmentPlanStatus",
    tags: ["Admin", "AI Investment", "Plan"],
    description: "Updates the active/inactive status for multiple AI Investment Plans simultaneously. Use this endpoint to activate or deactivate multiple plans in a single operation.",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of AI Investment Plan IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "boolean",
                            description: "New status to apply to the AI Investment Plans (true for active, false for inactive)",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("AI Investment Plan"),
    requiresAuth: true,
    permission: "edit.ai.investment.plan",
    logModule: "ADMIN_AI",
    logTitle: "Bulk update plan status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating status for ${ids.length} plan(s) to ${status ? 'active' : 'inactive'}`);
    const result = await (0, query_1.updateStatus)("aiInvestmentPlan", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Status updated for ${ids.length} plan(s)`);
    return result;
};
