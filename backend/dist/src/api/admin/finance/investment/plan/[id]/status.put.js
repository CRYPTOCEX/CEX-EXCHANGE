"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Updates the status of an investment plan",
    operationId: "updateInvestmentPlanStatus",
    tags: ["Admin", "Investment Plans"],
    logModule: "ADMIN_FIN",
    logTitle: "Update Plan Status",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the investment plan to update",
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
    responses: (0, query_1.updateRecordResponses)("Investment Plan"),
    requiresAuth: true,
    permission: "edit.investment.plan",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating investment plan status");
    const result = await (0, query_1.updateStatus)("investmentPlan", id, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Investment plan status updated successfully");
    return result;
};
