"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk deletes posts by IDs",
    operationId: "bulkDeletePosts",
    tags: ["Admin", "Content", "Posts"],
    parameters: (0, query_1.commonBulkDeleteParams)("Posts"),
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
                            description: "Array of post IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("Posts"),
    requiresAuth: true,
    permission: "delete.blog.post",
    logModule: "ADMIN_BLOG",
    logTitle: "Bulk delete blog posts",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating blog post IDs");
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting ${ids.length} blog posts`);
    const result = await (0, query_1.handleBulkDelete)({
        model: "post",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${ids.length} blog posts deleted successfully`);
    return result;
};
