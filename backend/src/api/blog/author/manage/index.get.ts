import { models } from "@b/db";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import { basePostSchema } from "./utils";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "List all posts",
  operationId: "listPosts",
  tags: ["Content", "Author", "Post"],
  parameters: [...crudParameters],
  responses: {
    200: {
      description: "Posts retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: basePostSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Posts"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { query, user, params } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  const author = await models.author.findOne({
    where: { userId: user.id },
  });

  if (!author)
    throw createError({ statusCode: 404, message: "Author not found" });

  return getFiltered({
    model: models.post,
    query,
    where: { authorId: author.id },
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: models.category,
        as: "category",
        attributes: ["id", "name", "slug"],
      },
      {
        model: models.author,
        as: "author",
        includeModels: [
          {
            model: models.user,
            as: "user",
            attributes: ["id", "firstName", "lastName", "email", "avatar"],
          },
        ],
      },
    ],
  });
};
