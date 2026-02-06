"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Update Status for a Post",
    operationId: "updatePostStatus",
    tags: ["Admin", "Content", "Posts"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the Post to update",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        status: {
                            type: "string",
                            enum: ["PUBLISHED", "DRAFT", "TRASH"],
                            description: "New status to apply to the Post",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Post"),
    requiresAuth: true,
    permission: "edit.blog.post",
    logModule: "ADMIN_BLOG",
    logTitle: "Update blog post status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating blog post ID and status");
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating blog post status to ${status}`);
    const result = await (0, query_1.updateStatus)("post", id, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Blog post status updated successfully");
    return result;
};
