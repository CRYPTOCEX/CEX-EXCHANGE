"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates the status of comments",
    operationId: "bulkUpdateCommentStatus",
    tags: ["Admin", "Content", "Comment"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of comment IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "boolean",
                            description: "New status to apply to the comments (true for active, false for inactive)",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Comment"),
    requiresAuth: true,
    permission: "edit.blog.comment",
    logModule: "ADMIN_BLOG",
    logTitle: "Bulk update comment status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating comment IDs and status");
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating status to ${status ? 'active' : 'inactive'} for ${ids.length} comments`);
    const result = await (0, query_1.updateStatus)("comment", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${ids.length} comments status updated successfully`);
    return result;
};
