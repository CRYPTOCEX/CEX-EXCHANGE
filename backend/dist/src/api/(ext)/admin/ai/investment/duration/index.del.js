"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk delete AI investment durations",
    operationId: "bulkDeleteAiInvestmentDurations",
    tags: ["Admin", "AI Investment", "Duration"],
    description: "Deletes multiple AI investment duration records by their IDs. This endpoint allows administrators to remove multiple duration options in a single operation.",
    parameters: (0, query_1.commonBulkDeleteParams)("AI Investment Durations"),
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            items: { type: "string", format: "uuid" },
                            description: "Array of AI Investment Duration IDs to delete (at least 1 required)",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("AI Investment Durations"),
    requiresAuth: true,
    permission: "delete.ai.investment.duration",
    logModule: "ADMIN_AI",
    logTitle: "Bulk delete investment durations",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting ${ids.length} duration(s)`);
    const result = await (0, query_1.handleBulkDelete)({
        model: "aiInvestmentDuration",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Deleted ${ids.length} duration(s)`);
    return result;
};
