// /server/api/blog/comments/store.post.ts
import { CacheManager } from "@b/utils/cache";
import { models } from "@b/db";
import { createError } from "@b/utils/error";

import { createRecordResponses } from "@b/utils/query";
import { logger } from "@b/utils/console";

export const metadata: OperationObject = {
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
  responses: createRecordResponses("Comment"),
};

export default async (data: Handler) => {
  const { user, body, params, ctx } = data;

  if (!user?.id) {
    return createError(
      401,
      "Unauthorized, permission required to create comments"
    );
  }

  ctx?.step("Checking comment moderation settings");
  const cacheManager = CacheManager.getInstance();
  const settings = await cacheManager.getSettings();
  const moderateCommentsRaw = settings.has("moderateComments")
    ? settings.get("moderateComments")
    : null;
  const moderateComments =
    typeof moderateCommentsRaw === "boolean"
      ? moderateCommentsRaw
      : Boolean(moderateCommentsRaw);

  const { content } = body;
  if (!content) {
    return createError(400, "Comment content is required");
  }

  const { postId } = params;

  try {
    ctx?.step("Creating comment");
    // Create the comment
    const newComment = await models.comment.create({
      content,
      userId: user.id,
      postId,
      status: moderateComments ? "PENDING" : "APPROVED",
    });

    ctx?.step("Fetching comment with user details");
    // Fetch the comment along with the associated user
    const commentWithUser = await models.comment.findOne({
      where: { id: newComment.id },
      include: [
        {
          model: models.user,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email", "avatar"],
        },
      ],
    });

    if (!commentWithUser) {
      return createError(404, "Comment created but not found");
    }

    ctx?.success(`Comment created on post ${postId} by user ${user.id} - ${moderateComments ? "pending moderation" : "approved"}`);
    return {
      message: "Comment created successfully",
    };
  } catch (error) {
    logger.error("BLOG", "Failed to create and retrieve comment", error);
    ctx?.fail("Failed to create comment");
    return createError(500, "Internal server error");
  }
};
