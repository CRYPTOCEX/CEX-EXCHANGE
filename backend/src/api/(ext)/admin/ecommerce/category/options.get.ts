import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Retrieves a list of ecommerce categories",
  description:
    "This endpoint retrieves active ecommerce categories for selection in the UI. Only categories with status true are returned.",
  operationId: "getEcommerceCategoryOptions",
  tags: ["Ecommerce", "Category"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Ecommerce categories retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                value: { type: "string" },
                label: { type: "string" },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("EcommerceCategory"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) throw createError(401, "Unauthorized");

  try {
    const categories = await models.ecommerceCategory.findAll({
      where: { status: true },
      attributes: ["id", "name"],
      order: [["name", "ASC"]],
    });

    const formatted = categories.map((category) => ({
      value: category.id,
      label: category.name,
    }));

    return formatted;
  } catch (error) {
    throw createError(
      500,
      "An error occurred while fetching ecommerce categories"
    );
  }
}; 