import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Retrieves active ecommerce products for selection options",
  description:
    "Returns a simplified list of active ecommerce products (status: true) formatted for use in dropdowns and selection interfaces. Each product includes ID, name, price, and currency.",
  operationId: "getEcommerceProductOptions",
  tags: ["Admin", "Ecommerce", "Product"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Active ecommerce products retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  description: "Product ID"
                },
                name: {
                  type: "string",
                  description: "Product name with price and currency (e.g., 'Product Name - 99.99 USD')"
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Ecommerce Products"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, ctx } = data;
  if (!user?.id) throw createError(401, "Unauthorized");

  ctx?.step("Fetching product options");

  try {
    const products = await models.ecommerceProduct.findAll({
      where: { status: true },
    });

    const formatted = products.map((product) => ({
      id: product.id,
      name: `${product.name} - ${product.price} ${product.currency}`,
    }));

    ctx?.success(`Retrieved ${formatted.length} product options`);

    return formatted;
  } catch (error) {
    throw createError(
      500,
      "An error occurred while fetching ecommerce products"
    );
  }
};
