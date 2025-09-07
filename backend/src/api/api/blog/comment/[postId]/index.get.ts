// /server/api/blog/comments/index.get.ts
import { models } from "@b/db";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseCommentSchema, commentPostsSchema } from "../utils";

export const metadata: OperationObject = {
  summary:
    "Lists all comments for a given post along with optional inclusion of posts",
  description:
    "This endpoint retrieves all comments for the specified post along with their associated posts.",
  operationId: "getPostComments",
  tags: ["Blog"],
  requiresAuth: false,
  parameters: [
    {
      index: 0,
      name: "postId",
      in: "path",
      description: "The ID of the post",
      required: true,
      schema: {
        type: "string",
        description: "Post ID",
      },
    },
  ],
  responses: {
    200: {
      description: "Comments retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                ...baseCommentSchema,
                posts: commentPostsSchema,
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Comments"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  // Extract the postId from the request parameters
  const { postId } = data.params;

  const comments = await models.comment.findAll({
    where: { postId },
    include: {
      model: models.user,
      as: "user",
      attributes: ["id", "firstName", "lastName", "email", "avatar"],
    },
  });

  // Convert Sequelize models to plain objects
  return comments.map((comment) => comment.get({ plain: true }));
};
