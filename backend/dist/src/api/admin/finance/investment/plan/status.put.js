"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates the status of investment plans",
    operationId: "bulkUpdateInvestmentPlanStatus",
    tags: ["Admin", "Investment Plan"],
    logModule: "ADMIN_FIN",
    logTitle: "Bulk Update Plan Status",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of investment plan IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "boolean",
                            description: "New status to apply to the investment plans (true for active, false for inactive)",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("InvestmentPlan"),
    requiresAuth: true,
    permission: "edit.investment.plan",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating investment plan status");
    const result = await (0, query_1.updateStatus)("investmentPlan", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Investment plan status updated successfully");
    return result;
};
