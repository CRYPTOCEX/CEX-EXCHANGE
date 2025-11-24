import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Retrieves a list of ecommerce products",
  description:
    "This endpoint retrieves active ecommerce products for selection in the UI. Only products with status true are returned.",
  operationId: "getEcommerceProductOptions",
  tags: ["Ecommerce", "Product"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Ecommerce products retrieved successfully",
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
    404: notFoundMetadataResponse("EcommerceProduct"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) throw createError(401, "Unauthorized");

  try {
    const products = await models.ecommerceProduct.findAll({
      where: { status: true },
    });

    const formatted = products.map((product) => ({
      id: product.id,
      name: `${product.name} - ${product.price} ${product.currency}`,
    }));

    return formatted;
  } catch (error) {
    throw createError(
      500,
      "An error occurred while fetching ecommerce products"
    );
  }
};
