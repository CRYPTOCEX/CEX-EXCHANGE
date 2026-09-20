"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk deletes API keys by IDs",
    operationId: "bulkDeleteApiKeys",
    tags: ["Admin", "API Keys"],
    logModule: "ADMIN_API",
    logTitle: "Bulk delete APIs",
    parameters: (0, query_1.commonBulkDeleteParams)("API Keys"),
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
                            description: "Array of API key IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("API Keys"),
    requiresAuth: true,
    permission: "delete.api.key",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating API key IDs");
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting ${ids.length} API keys`);
    const result = await (0, query_1.handleBulkDelete)({
        model: "apiKey",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success();
    return result;
};
