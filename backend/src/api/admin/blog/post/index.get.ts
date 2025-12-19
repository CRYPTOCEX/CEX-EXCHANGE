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
  demoMask: ["items.author.user.email"],
  logModule: "ADMIN_BLOG",
  logTitle: "List blog posts",
};

export default async (data: Handler) => {
  const { query, ctx } = data;

  ctx?.step("Parsing query parameters");

  ctx?.step("Fetching blog posts with filters");
  const result = await getFiltered({
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

  ctx?.success("Blog posts retrieved successfully");
  return result;
};
