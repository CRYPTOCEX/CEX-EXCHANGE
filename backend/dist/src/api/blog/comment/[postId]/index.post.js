"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const cache_1 = require("@b/utils/cache");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Creates a new blog comment",
    description: "This endpoint creates a new blog comment.",
    operationId: "createComment",
    tags: ["Blog"],
    logModule: "BLOG",
    logTitle: "Create comment",
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "postId",
            in: "path",
            description: "The ID of the post to comment on",
            required: true,
            schema: {
                type: "string",
                description: "Post ID",
            },
        },
    ],
    requestBody: {
        description: "Data for creating a new comment",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        content: {
                            type: "string",
                            description: "Name of the comment to create",
                        },
                    },
                    required: ["content"],
                },
            },
        },
        required: true,
    },
    responses: (0, query_1.createRecordResponses)("Comment"),
};
exports.default = async (data) => {
    const { user, body, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        return (0, error_1.createError)(401, "Unauthorized, permission required to create comments");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking comment moderation settings");
    const cacheManager = cache_1.CacheManager.getInstance();
    const settings = await cacheManager.getSettings();
    const moderateCommentsRaw = settings.has("moderateComments")
        ? settings.get("moderateComments")
        : null;
    const moderateComments = typeof moderateCommentsRaw === "boolean"
        ? moderateCommentsRaw
        : Boolean(moderateCommentsRaw);
    const { content } = body;
    if (!content) {
        return (0, error_1.createError)(400, "Comment content is required");
    }
    const { postId } = params;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating comment");
        const newComment = await db_1.models.comment.create({
            content,
            userId: user.id,
            postId,
            status: moderateComments ? "PENDING" : "APPROVED",
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching comment with user details");
        const commentWithUser = await db_1.models.comment.findOne({
            where: { id: newComment.id },
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "email", "avatar"],
                },
            ],
        });
        if (!commentWithUser) {
            return (0, error_1.createError)(404, "Comment created but not found");
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Comment created on post ${postId} by user ${user.id} - ${moderateComments ? "pending moderation" : "approved"}`);
        return {
            message: "Comment created successfully",
        };
    }
    catch (error) {
        console_1.logger.error("BLOG", "Failed to create and retrieve comment", error);
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to create comment");
        return (0, error_1.createError)(500, "Internal server error");
    }
};
