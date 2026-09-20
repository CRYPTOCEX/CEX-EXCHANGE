"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Updates a specific comment",
    operationId: "updateComment",
    tags: ["Admin", "Content", "Comment"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the comment to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "New data for the comment",
        content: {
            "application/json": {
                schema: utils_1.commentUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Comment"),
    requiresAuth: true,
    permission: "edit.blog.comment",
    logModule: "ADMIN_BLOG",
    logTitle: "Update comment",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { content, userId, postId } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating comment ID and data");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating comment");
    const result = await (0, query_1.updateRecord)("comment", id, {
        content,
        userId,
        postId,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Comment updated successfully");
    return result;
};
