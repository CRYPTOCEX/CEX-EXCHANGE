import { models } from "@b/db";
import { createError } from "@b/utils/error";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseCategorySchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Retrieves all active ecommerce categories",
  description:
    "Fetches all active ecommerce categories along with their active products, with calculated ratings and review counts for each product.",
  operationId: "listEcommerceCategories",
  tags: ["Ecommerce", "Categories"],
  responses: {
    200: {
      description: "Ecommerce categories retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: baseCategorySchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Ecommerce Category"),
    500: serverErrorResponse,
  },
};

export default async () => {
  const categories = await models.ecommerceCategory.findAll({
    where: { status: true },
    attributes: [
      "id",
      "name",
      "slug",
      "description",
      "image",
      "status",
      "createdAt",
    ],
    include: [
      {
        model: models.ecommerceProduct,
        as: "ecommerceProducts",
        where: { status: true },
        attributes: [
          "id",
          "name",
          "slug",
          "description",
          "shortDescription",
          "type",
          "price",
          "status",
          "image",
          "currency",
          "inventoryQuantity",
          "createdAt",
        ],
        include: [
          {
            model: models.ecommerceReview,
            as: "ecommerceReviews",
            attributes: [
              "id",
              "productId",
              "userId",
              "rating",
              "status",
              "createdAt",
            ],
          },
        ],
        order: [["name", "ASC"]],
      },
    ],
  });

  if (!categories) {
    throw createError({ statusCode: 404, message: "No categories found" });
  }

  if (categories.length === 0) {
    return [];
  }

  try {
    // Convert the Sequelize instances to plain objects
    const processedCategories = categories.map((category) => {
      const categoryData = category.toJSON();
      const { ecommerceProducts, ...rest } = categoryData;
      return {
        ...rest,
        products: ecommerceProducts.map((product: any) => ({
          ...product,
          rating: product.ecommerceReviews?.length
            ? product.ecommerceReviews.reduce(
                (acc: number, review: any) => acc + review.rating,
                0
              ) / product.ecommerceReviews.length
            : 0,
          reviewsCount: product.ecommerceReviews?.length ?? 0,
        })),
      };
    });

    // Return the processed categories
    return JSON.parse(JSON.stringify(processedCategories));
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw createError({
      statusCode: 500,
      message: "Error fetching category data",
    });
  }
};
