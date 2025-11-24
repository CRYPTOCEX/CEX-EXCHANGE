// /server/api/comments/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { commentSchema } from "./utils";

export const metadata: OperationObject = {
  summary:
    "Lists all comments with pagination and optional filtering by user or post",
  operationId: "listComments",
  tags: ["Admin", "Content", "Comment"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "List of comments with user and post details and pagination",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: commentSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Comments"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.blog.comment",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.comment,
    query,
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
      {
        model: models.post,
        as: "post",
        attributes: ["id", "title", "slug", "image"],
      },
    ],
  });
};
