import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseProductSchema } from "../utils"; // Adjust path if needed

export const metadata: OperationObject = {
  summary: "Retrieves all ecommerce products",
  description:
    "Fetches a list of all active ecommerce products, including their categories and aggregated review stats.",
  operationId: "getEcommerceProducts",
  tags: ["Ecommerce", "Products"],
  responses: {
    200: {
      description: "Products retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                ...baseProductSchema,
                rating: { type: "number", description: "Average rating" },
                reviewsCount: {
                  type: "number",
                  description: "Number of reviews",
                },
              },
              required: ["id", "name", "slug"],
            },
          },
        },
      },
    },
    500: serverErrorResponse,
  },
  // Add pagination/filter parameters if needed
};

export default async (data: Handler) => {
  try {
    // Fetch all active products
    const products = await models.ecommerceProduct.findAll({
      where: { status: true },
      include: [
        {
          model: models.ecommerceCategory,
          as: "category",
          attributes: ["id", "name", "slug"],
        },
        {
          model: models.ecommerceReview,
          as: "ecommerceReviews",
          attributes: ["id", "rating", "userId", "status", "createdAt"],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]], // newest first; change as needed
    });

    // Return empty array if no products found (not an error condition)
    if (!products || products.length === 0) {
      return [];
    }

    // Format products with review stats
    const productsData = products.map((product: any) => {
      const json = product.toJSON();
      const reviews = json.ecommerceReviews || [];
      const rating =
        reviews.length > 0
          ? reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) /
            reviews.length
          : 0;
      return {
        ...json,
        rating,
        reviewsCount: reviews.length,
      };
    });

    return JSON.parse(JSON.stringify(productsData));
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `Error retrieving products: ${error.message}`,
    });
  }
};
