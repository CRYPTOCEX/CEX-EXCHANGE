"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk deletes posts by IDs",
    operationId: "bulkDeletePosts",
    tags: ["Content", "Author", "Post"],
    logModule: "BLOG",
    logTitle: "Bulk delete author posts",
    parameters: [...(0, query_1.commonBulkDeleteParams)("Posts")],
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
};
exports.default = async (data) => {
    const { body, query, user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying author credentials");
    const author = await db_1.models.author.findOne({
        where: { userId: user.id },
    });
    if (!author)
        throw (0, error_1.createError)({ statusCode: 404, message: "Author not found" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting ${ids.length} post(s)`);
    const result = await (0, query_1.handleBulkDelete)({
        model: "post",
        ids,
        query,
        where: { authorId: author.id },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Bulk deleted ${ids.length} post(s) for author ${author.id}`);
    return result;
};
