import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseProductSchema } from "../../../utils";

export const metadata: OperationObject = {
  summary: "Get products by category slug",
  description: "Retrieves all active products within a specific category identified by its slug.",
  operationId: "getProductsByCategorySlug",
  tags: ["Ecommerce", "Categories", "Products"],
  parameters: [
    {
      index: 0,
      name: "slug",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "Category slug",
    },
  ],
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
                reviewsCount: { type: "number", description: "Number of reviews" },
              },
            },
          },
        },
      },
    },
    404: notFoundMetadataResponse("Category"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { params } = data;
  const { slug } = params;

  try {
    // First, find the category to ensure it exists
    const category = await models.ecommerceCategory.findOne({
      where: { slug, status: true },
      attributes: ["id", "name", "slug"],
    });

    if (!category) {
      throw createError({ statusCode: 404, message: "Category not found" });
    }

    // Fetch products in this category
    const products = await models.ecommerceProduct.findAll({
      where: { 
        categoryId: category.get("id"),
        status: true,
      },
      include: [
        {
          model: models.ecommerceCategory,
          as: "category",
          attributes: ["id", "name", "slug"],
        },
        {
          model: models.ecommerceReview,
          as: "ecommerceReviews",
          attributes: ["id", "rating", "status"],
          where: { status: "APPROVED" },
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    if (!products || products.length === 0) {
      return [];
    }

    // Process products to include rating and review count
    const processedProducts = products.map((product: any) => {
      const productData = product.toJSON();
      const reviews = productData.ecommerceReviews || [];
      
      const rating = reviews.length > 0
        ? reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / reviews.length
        : 0;

      return {
        ...productData,
        rating: Math.round(rating * 10) / 10, // Round to 1 decimal place
        reviewsCount: reviews.length,
      };
    });

    return processedProducts;

  } catch (error) {
    console.error("Error fetching category products:", error);
    throw createError({
      statusCode: 500,
      message: "Error fetching category products",
    });
  }
}; 