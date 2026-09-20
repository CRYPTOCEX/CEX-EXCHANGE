"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentPostsSchema = exports.basePostCommentSchema = exports.baseCommentSchema = void 0;
exports.sanitizeCommentContent = sanitizeCommentContent;
exports.canModerateComments = canModerateComments;
exports.assertCommentActor = assertCommentActor;
const schema_1 = require("@b/utils/schema");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const MODERATION_PERMISSIONS = ["edit.comment", "delete.comment", "access.blog.comment"];
function sanitizeCommentContent(raw) {
    if (typeof raw !== "string")
        return "";
    return (raw
        .replace(/<\s*(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?(<\s*\/\s*\1\s*>|$)/gi, "")
        .replace(/<\/?[a-zA-Z][^>]*>?/g, "")
        .trim());
}
async function canModerateComments(userId) {
    const user = await db_1.models.user.findByPk(userId, {
        include: [
            {
                model: db_1.models.role,
                as: "role",
                include: [
                    { model: db_1.models.permission, as: "permissions", through: { attributes: [] } },
                ],
            },
        ],
    });
    if (!(user === null || user === void 0 ? void 0 : user.role))
        return false;
    if (user.role.name === "Super Admin")
        return true;
    const held = new Set((user.role.permissions || []).map((p) => p.name));
    return MODERATION_PERMISSIONS.some((p) => held.has(p));
}
async function assertCommentActor(commentId, userId) {
    if (!userId) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const comment = await db_1.models.comment.findByPk(commentId);
    if (!comment) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Comment not found" });
    }
    if (comment.userId === userId)
        return comment;
    if (await canModerateComments(userId))
        return comment;
    throw (0, error_1.createError)({ statusCode: 404, message: "Comment not found" });
}
exports.baseCommentSchema = {
    id: (0, schema_1.baseStringSchema)("Comment ID"),
    name: (0, schema_1.baseStringSchema)("Name associated with the comment"),
    slug: (0, schema_1.baseStringSchema)("Slug for the comment"),
};
exports.basePostCommentSchema = {
    type: "object",
    properties: {
        id: (0, schema_1.baseStringSchema)("Post ID"),
        content: (0, schema_1.baseStringSchema)("Content of the post"),
        userId: (0, schema_1.baseStringSchema)("User ID of the poster"),
        postId: (0, schema_1.baseStringSchema)("ID of the post commented on"),
        createdAt: (0, schema_1.baseDateTimeSchema)("Creation date of the comment"),
        updatedAt: (0, schema_1.baseDateTimeSchema)("Last update date of the comment"),
        deletedAt: (0, schema_1.baseDateTimeSchema)("Deletion date of the comment", true),
    },
};
exports.commentPostsSchema = {
    type: "array",
    items: exports.basePostCommentSchema,
};
