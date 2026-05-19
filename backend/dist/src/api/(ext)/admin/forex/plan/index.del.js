"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk deletes Forex plans",
    description: "Deletes multiple Forex plan configurations by their IDs. This will cascade delete to associated plan durations and investments.",
    operationId: "bulkDeleteForexPlans",
    tags: ["Admin", "Forex", "Plan"],
    parameters: (0, query_1.commonBulkDeleteParams)("Forex Plans"),
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
                            description: "Array of Forex plan IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("Forex Plans"),
    requiresAuth: true,
    permission: "delete.forex.plan",
    logModule: "ADMIN_FOREX",
    logTitle: "Bulk delete forex plans",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating ${ids.length} forex plan IDs`);
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting ${ids.length} forex plans`);
    const result = await (0, query_1.handleBulkDelete)({
        model: "forexPlan",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Successfully deleted ${ids.length} forex plans`);
    return result;
};
