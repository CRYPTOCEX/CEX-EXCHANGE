"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates the status of AI Investments",
    operationId: "bulkUpdateAiInvestmentStatus",
    tags: ["Admin", "AI Investments"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of AI Investment IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "string",
                            enum: ["ACTIVE", "COMPLETED", "CANCELLED", "REJECTED"],
                            description: "New status to apply to the AI Investments",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("AI Investment"),
    requiresAuth: true,
    permission: "edit.ai.investment",
    logModule: "ADMIN_AI",
    logTitle: "Bulk update AI investment status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating status to ${status} for ${ids.length} investment(s)`);
    const result = await (0, query_1.updateStatus)("aiInvestment", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Status updated for ${ids.length} investment(s)`);
    return result;
};
