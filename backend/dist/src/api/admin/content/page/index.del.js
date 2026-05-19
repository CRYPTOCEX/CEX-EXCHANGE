"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk deletes pages by IDs",
    operationId: "bulkDeletePages",
    tags: ["Admin", "Content", "Page"],
    parameters: (0, query_1.commonBulkDeleteParams)("Pages"),
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
                            description: "Array of page IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("Pages"),
    requiresAuth: true,
    permission: "delete.page",
    logModule: "ADMIN_CMS",
    logTitle: "Bulk delete pages",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Bulk deleting ${(ids === null || ids === void 0 ? void 0 : ids.length) || 0} page(s)`);
    const result = await (0, query_1.handleBulkDelete)({
        model: "page",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Successfully deleted page(s)`);
    return result;
};
