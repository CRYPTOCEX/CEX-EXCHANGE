"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.updateComment = updateComment;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const cache_1 = require("@b/utils/cache");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Updates an existing blog comment",
    description: "This endpoint updates an existing blog comment.",
    operationId: "updateComment",
    tags: ["Blog"],
    logModule: "BLOG",
    logTitle: "Update comment",
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "The ID of the comment to update",
            required: true,
            schema: {
                type: "string",
                description: "Comment ID",
            },
        },
    ],
    requestBody: {
        required: true,
        description: "Comment data to update",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        comment: { type: "string", description: "Updated comment content" },
                        content: { type: "string", description: "Alias of `comment`" },
                    },
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Comment"),
};
exports.default = async (data) => {
    var _a;
    const { ctx, user, body } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking who owns the comment");
    const comment = await (0, utils_1.assertCommentActor)(data.params.id, user === null || user === void 0 ? void 0 : user.id);
    const content = (0, utils_1.sanitizeCommentContent)((_a = body === null || body === void 0 ? void 0 : body.comment) !== null && _a !== void 0 ? _a : body === null || body === void 0 ? void 0 : body.content);
    if (!content) {
        throw (0, error_1.createError)({ statusCode: 400, message: "A comment body is required" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating comment");
    const result = await updateComment(comment.id, content, ctx);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Comment ${data.params.id} updated successfully`);
    return result;
};
async function updateComment(id, content, ctx) {
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating comment status");
    const comment = await db_1.models.comment.findByPk(id);
    if (!comment) {
        throw (0, error_1.createError)(404, "Comment not found");
    }
    if (comment.status === "REJECTED") {
        throw (0, error_1.createError)(400, "Comment cannot be updated after rejection");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking moderation settings");
    const cacheManager = cache_1.CacheManager.getInstance();
    const moderateComments = await cacheManager.getSettingBool("moderateComments", true);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Saving comment update");
    await comment.update({
        content,
        status: moderateComments ? "PENDING" : "APPROVED",
    }, {
        where: { id },
    });
    return {
        message: "Comment updated successfully",
    };
}
