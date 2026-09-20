"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates the status of Posts",
    operationId: "bulkUpdatePostStatus",
    tags: ["Content", "Author", "Post"],
    logModule: "BLOG",
    logTitle: "Bulk update post status",
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
};
exports.default = async (data) => {
    const { body, user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying author credentials");
    const author = await db_1.models.author.findOne({
        where: { userId: user.id },
    });
    if (!author)
        throw (0, error_1.createError)({ statusCode: 404, message: "Author not found" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating ${ids.length} post(s) to ${status}`);
    const result = await (0, query_1.updateStatus)("post", ids, status, undefined, undefined, undefined, {
        authorId: author.id,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Updated ${ids.length} post(s) to ${status} for author ${author.id}`);
    return result;
};
