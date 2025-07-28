import { models } from "@b/db";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import { baseAuthorSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "List all authors",
  operationId: "listAuthors",
  tags: ["Admin", "Content", "Author"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "Authors retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: baseAuthorSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Authors"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.blog.author",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.author,
    query,
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
    ],
  });
};
