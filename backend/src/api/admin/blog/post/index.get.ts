import { models } from "@b/db";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import { basePostSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "List all posts",
  operationId: "listPosts",
  tags: ["Admin", "Posts"],
  parameters: crudParameters,
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
  permission: "view.blog.post",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.post,
    query,
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
