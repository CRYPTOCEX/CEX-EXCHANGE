"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk deletes authors by IDs",
    operationId: "bulkDeleteAuthors",
    tags: ["Admin", "Content", "Author"],
    parameters: (0, query_1.commonBulkDeleteParams)("Authors"),
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
                            description: "Array of author IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("Authors"),
    requiresAuth: true,
    permission: "delete.blog.author",
    logModule: "ADMIN_BLOG",
    logTitle: "Bulk delete authors",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating author IDs");
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting ${ids.length} authors`);
    const result = await (0, query_1.handleBulkDelete)({
        model: "author",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${ids.length} authors deleted successfully`);
    return result;
};
