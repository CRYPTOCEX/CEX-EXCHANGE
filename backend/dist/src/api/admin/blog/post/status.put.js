"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates the status of Posts",
    operationId: "bulkUpdatePostStatus",
    tags: ["Admin", "Content", "Posts"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of Post IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "string",
                            enum: ["PUBLISHED", "DRAFT", "TRASH"],
                            description: "New status to apply to the Posts",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Post"),
    requiresAuth: true,
    permission: "edit.blog.post",
    logModule: "ADMIN_BLOG",
    logTitle: "Bulk update blog post status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating blog post IDs and status");
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating status to ${status} for ${ids.length} blog posts`);
    const result = await (0, query_1.updateStatus)("post", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${ids.length} blog posts status updated successfully`);
    return result;
};
