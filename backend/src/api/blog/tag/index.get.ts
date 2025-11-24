// /server/api/blog/tags/index.get.ts
import { models } from "@b/db";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseTagSchema, tagPostsSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Lists all tags with optional inclusion of posts",
  description:
    "This endpoint retrieves all available tags along with their associated posts.",
  operationId: "getTags",
  tags: ["Blog"],
  requiresAuth: false,
  responses: {
    200: {
      description: "Tags retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                ...baseTagSchema,
                posts: tagPostsSchema,
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Tag"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const tags = await models.tag.findAll({
    include: [
      {
        model: models.post,
        as: "posts",
        through: { attributes: [] },
        where: { status: "PUBLISHED" },
        include: [
          {
            model: models.author,
            as: "author",
            include: [
              {
                model: models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
              },
            ],
          },
          {
            model: models.category,
            as: "category",
          },
        ],
      },
    ],
  });

  // Convert Sequelize models to plain objects
  return tags.map((tag) => tag.get({ plain: true }));
};
