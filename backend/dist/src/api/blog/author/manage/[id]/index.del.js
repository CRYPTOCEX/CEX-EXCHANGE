"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a specific post",
    operationId: "deletePost",
    tags: ["Content", "Author", "Post"],
    logModule: "BLOG",
    logTitle: "Delete blog post",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: `ID of the post to delete`,
            required: true,
            schema: {
                type: "string",
            },
        },
        {
            name: "restore",
            in: "query",
            description: `Restore the post instead of deleting`,
            required: false,
            schema: {
                type: "boolean",
            },
        },
        {
            name: "force",
            in: "query",
            description: `Delete the post permanently`,
            required: false,
            schema: {
                type: "boolean",
            },
        },
    ],
    responses: (0, query_1.deleteRecordResponses)("Post"),
    requiresAuth: true,
};
exports.default = async (data) => {
    const { params, query, user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying author credentials");
    const author = await db_1.models.author.findOne({
        where: { userId: user.id },
    });
    if (!author)
        throw (0, error_1.createError)({ statusCode: 404, message: "Author not found" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting post");
    const result = await (0, query_1.handleSingleDelete)({
        model: "post",
        id: params.id,
        query,
        where: { authorId: author.id },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Post ${params.id} deleted by author ${author.id}`);
    return result;
};
