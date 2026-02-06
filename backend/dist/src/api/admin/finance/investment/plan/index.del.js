"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk deletes investment plans by IDs",
    operationId: "bulkDeleteInvestmentPlans",
    tags: ["Admin", "Investment Plans"],
    logModule: "ADMIN_FIN",
    logTitle: "Bulk Delete Investment Plans",
    parameters: (0, query_1.commonBulkDeleteParams)("Investment Plans"),
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
                            description: "Array of investment plan IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("Investment Plans"),
    requiresAuth: true,
    permission: "delete.investment.plan",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting investment plans");
    const result = await (0, query_1.handleBulkDelete)({
        model: "investmentPlan",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Investment plans deleted successfully");
    return result;
};
