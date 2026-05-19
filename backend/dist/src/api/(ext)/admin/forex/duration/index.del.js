"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk deletes Forex durations",
    description: "Deletes multiple Forex duration configurations by their IDs. This will also affect any plans or investments associated with these durations.",
    operationId: "bulkDeleteForexDurations",
    tags: ["Admin", "Forex", "Duration"],
    parameters: (0, query_1.commonBulkDeleteParams)("Forex Durations"),
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
                            description: "Array of Forex duration IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("Forex Durations"),
    requiresAuth: true,
    permission: "delete.forex.duration",
    logModule: "ADMIN_FOREX",
    logTitle: "Bulk delete forex durations",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating ${ids.length} forex duration IDs`);
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting ${ids.length} forex durations`);
    const result = await (0, query_1.handleBulkDelete)({
        model: "forexDuration",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Successfully deleted ${ids.length} forex durations`);
    return result;
};
