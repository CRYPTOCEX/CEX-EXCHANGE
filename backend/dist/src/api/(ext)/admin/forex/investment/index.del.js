"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk deletes Forex investments",
    description: "Deletes multiple Forex investment records by their IDs. This permanently removes investment data and cannot be undone.",
    operationId: "bulkDeleteForexInvestments",
    tags: ["Admin", "Forex", "Investment"],
    parameters: (0, query_1.commonBulkDeleteParams)("Forex Investments"),
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
                            description: "Array of Forex investment IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("Forex Investments"),
    requiresAuth: true,
    permission: "delete.forex.investment",
    logModule: "ADMIN_FOREX",
    logTitle: "Bulk delete forex investments",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating ${ids.length} forex investment IDs`);
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting ${ids.length} forex investments`);
    const result = await (0, query_1.handleBulkDelete)({
        model: "forexInvestment",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Successfully deleted ${ids.length} forex investments`);
    return result;
};
