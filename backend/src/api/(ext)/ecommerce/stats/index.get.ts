import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { serverErrorResponse } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Retrieves ecommerce statistics",
  description:
    "Fetches statistics for the ecommerce platform including product count, category count, and order count.",
  operationId: "getEcommerceStats",
  tags: ["Ecommerce", "Stats"],
  logModule: "ECOM",
  logTitle: "Get Stats",
  responses: {
    200: {
      description: "Stats retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              products: {
                type: "number",
                description: "Total number of active products",
              },
              categories: {
                type: "number",
                description: "Total number of active categories",
              },
              orders: {
                type: "number",
                description: "Total number of orders",
              },
            },
            required: ["products", "categories", "orders"],
          },
        },
      },
    },
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { ctx } = data;

  ctx?.step("Fetching Ecommerce Stats");

  try {
    // Fetch counts in parallel
    const [productsCount, categoriesCount, ordersCount] = await Promise.all([
      models.ecommerceProduct.count({
        where: { status: true },
      }),
      models.ecommerceCategory.count({
        where: { status: true },
      }),
      models.ecommerceOrder.count(),
    ]);

    const stats = {
      products: productsCount,
      categories: categoriesCount,
      orders: ordersCount,
    };

    ctx?.success("Stats fetched successfully");

    return stats;
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `Error retrieving stats: ${error.message}`,
    });
  }
};
