"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a specific AI Investment Plan",
    operationId: "deleteAiInvestmentPlan",
    tags: ["Admin", "AI Investment", "Plan"],
    description: "Permanently deletes a specific AI Investment Plan by ID. This operation cannot be undone and may affect related investments and durations.",
    parameters: (0, query_1.deleteRecordParams)("AI Investment Plan"),
    responses: (0, query_1.deleteRecordResponses)("AI Investment Plan"),
    permission: "delete.ai.investment.plan",
    requiresAuth: true,
    logModule: "ADMIN_AI",
    logTitle: "Delete investment plan",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting plan ${params.id}`);
    const result = await (0, query_1.handleSingleDelete)({
        model: "aiInvestmentPlan",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Plan deleted successfully");
    return result;
};
