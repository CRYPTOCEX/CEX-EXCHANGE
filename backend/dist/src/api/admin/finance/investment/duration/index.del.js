"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk deletes Investment durations by IDs",
    operationId: "bulkDeleteInvestmentDurations",
    tags: ["Admin", "Investment", "Durations"],
    parameters: (0, query_1.commonBulkDeleteParams)("Investment Durations"),
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
                            description: "Array of Investment duration IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("Investment Durations"),
    requiresAuth: true,
    permission: "delete.investment.duration",
    logModule: "ADMIN_FIN",
    logTitle: "Bulk Delete Investment Durations",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating investment duration IDs");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting investment duration records");
    const result = await (0, query_1.handleBulkDelete)({
        model: "investmentDuration",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Investment durations deleted successfully");
    return result;
};
