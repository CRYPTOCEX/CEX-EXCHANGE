"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk deletes Forex signals",
    description: "Deletes multiple Forex trading signal configurations by their IDs. This will remove signal references from associated accounts.",
    operationId: "bulkDeleteForexSignals",
    tags: ["Admin", "Forex", "Signal"],
    parameters: (0, query_1.commonBulkDeleteParams)("Forex Signals"),
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
                            description: "Array of Forex signal IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("Forex Signals"),
    requiresAuth: true,
    permission: "delete.forex.signal",
    logModule: "ADMIN_FOREX",
    logTitle: "Bulk delete forex signals",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating ${ids.length} IDs`);
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting ${ids.length} records`);
    const result = await (0, query_1.handleBulkDelete)({
        model: "forexSignal",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Successfully deleted ${ids.length} records`);
    return result;
};
