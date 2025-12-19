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
  logModule: "ADMIN_BLOG",
  logTitle: "Get category options",
};

export default async (data: Handler) => {
  const { user, ctx } = data;

  ctx?.step("Validating user authorization");
  if (!user?.id) throw createError(401, "Unauthorized");

  try {
    ctx?.step("Fetching all categories");
    const categories = await models.category.findAll();

    ctx?.step("Formatting category options");
    const formatted = categories.map((category) => ({
      id: category.id,
      name: category.name,
    }));

    ctx?.success(`${formatted.length} category options retrieved`);
    return formatted;
  } catch (error) {
    ctx?.fail("Failed to fetch categories");
    throw createError(500, "An error occurred while fetching categories");
  }
};
