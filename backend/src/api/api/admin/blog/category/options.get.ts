import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Retrieves a list of categories",
  description: "This endpoint retrieves all available categories for posts.",
  operationId: "getCategories",
  tags: ["Category"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Categories retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Category"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) throw createError(401, "Unauthorized");

  try {
    const categories = await models.category.findAll();
    const formatted = categories.map((category) => ({
      id: category.id,
      name: category.name,
    }));
    return formatted;
  } catch (error) {
    throw createError(500, "An error occurred while fetching categories");
  }
};
