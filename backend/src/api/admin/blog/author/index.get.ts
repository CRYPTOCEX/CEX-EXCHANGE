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
  demoMask: ["items.user.email"],
  logModule: "ADMIN_BLOG",
  logTitle: "List authors",
};

export default async (data: Handler) => {
  const { query, ctx } = data;

  ctx?.step("Parsing query parameters");

  ctx?.step("Fetching authors with filters");
  const result = await getFiltered({
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

  ctx?.success("Authors retrieved successfully");
  return result;
};
