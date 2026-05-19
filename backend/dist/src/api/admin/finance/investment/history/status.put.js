"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates the status of Investments",
    operationId: "bulkUpdateInvestmentStatus",
    tags: ["Admin", "Investments"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of Investment IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "string",
                            enum: ["ACTIVE", "COMPLETED", "CANCELLED", "REJECTED"],
                            description: "New status to apply to the Investments",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Investment"),
    requiresAuth: true,
    permission: "edit.investment",
    logModule: "ADMIN_FIN",
    logTitle: "Bulk Update Investment Status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating investment IDs and status");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Bulk updating investment status");
    const result = await (0, query_1.updateStatus)("investment", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success();
    return result;
};
