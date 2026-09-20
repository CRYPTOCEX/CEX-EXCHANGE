"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Updates AI Investment Plan status",
    operationId: "updateAiInvestmentPlanStatus",
    tags: ["Admin", "AI Investment", "Plan"],
    description: "Updates the active/inactive status of a specific AI Investment Plan. Use this endpoint to quickly activate or deactivate a plan without modifying other properties.",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "ID of the AI Investment Plan to update",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        status: {
                            type: "boolean",
                            description: "New status to apply (true for active, false for inactive)",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("AI Investment Plan"),
    requiresAuth: true,
    permission: "edit.ai.investment.plan",
    logModule: "ADMIN_AI",
    logTitle: "Update plan status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating plan ${id} status to ${status ? 'active' : 'inactive'}`);
    const result = await (0, query_1.updateStatus)("aiInvestmentPlan", id, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Plan status updated");
    return result;
};
