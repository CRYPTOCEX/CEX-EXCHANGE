import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { models } from "@b/db";
import {
  unauthorizedResponse as unauthorizedError,
  serverErrorResponse as serverError,
  notFoundResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Gets ecommerce category options for selection",
  description:
    "Retrieves a list of active ecommerce categories formatted as value-label pairs for use in dropdown menus and selection components. Only returns categories with status set to true.",
  operationId: "getEcommerceCategoryOptions",
  tags: ["Admin", "Ecommerce", "Category"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Category options retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                value: {
                  type: "string",
                  description: "Category ID",
                },
                label: {
                  type: "string",
                  description: "Category name",
                },
              },
              required: ["value", "label"],
            },
          },
        },
      },
    },
    401: unauthorizedError,
    404: notFoundResponse("Ecommerce category"),
    500: serverError,
  },
  logModule: "ADMIN_ECOM",
  logTitle: "Get category options",
};

export default async (data: Handler) => {
  const { user, ctx } = data;

  if (!user?.id) throw createError(401, "Unauthorized");

  try {
    ctx?.step("Fetching active categories");
    const categories = await models.ecommerceCategory.findAll({
      where: { status: true },
      attributes: ["id", "name"],
      order: [["name", "ASC"]],
    });

    ctx?.step("Formatting category options");
    const formatted = categories.map((category) => ({
      value: category.id,
      label: category.name,
    }));

    ctx?.success(`Retrieved ${formatted.length} category options`);
    return formatted;
  } catch (error) {
    ctx?.fail("Failed to fetch category options");
    throw createError(
      500,
      "An error occurred while fetching ecommerce categories"
    );
  }
}; 
