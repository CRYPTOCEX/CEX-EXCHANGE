// /server/api/blog/comments/index.get.ts
import { models } from "@b/db";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseCommentSchema, commentPostsSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Lists all comments with optional inclusion of posts",
  description:
    "This endpoint retrieves all available comments along with their associated posts.",
  operationId: "getComments",
  tags: ["Blog"],
  requiresAuth: false,
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
  const comments = await models.comment.findAll({
    include: {
      model: models.user,
      as: "user",
      attributes: ["id", "firstName", "lastName", "email", "avatar"],
    },
  });

  // Convert Sequelize models to plain objects
  return comments.map((comment) => comment.get({ plain: true }));
};
