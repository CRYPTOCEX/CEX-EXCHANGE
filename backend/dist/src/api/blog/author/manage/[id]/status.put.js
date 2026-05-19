"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Update Status for a Post",
    operationId: "updatePostStatus",
    tags: ["Content", "Author", "Post"],
    logModule: "BLOG",
    logTitle: "Update post status",
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
};
exports.default = async (data) => {
    const { body, params, user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying author credentials");
    const author = await db_1.models.author.findOne({
        where: { userId: user.id },
    });
    if (!author)
        throw (0, error_1.createError)({ statusCode: 404, message: "Author not found" });
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating post ${id} status to ${status}`);
    const result = await (0, query_1.updateStatus)("post", id, status, undefined, undefined, undefined, {
        authorId: author.id,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Post ${id} status updated to ${status} by author ${author.id}`);
    return result;
};
