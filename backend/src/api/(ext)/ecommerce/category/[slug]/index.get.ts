import { models } from "@b/db";
import { createError } from "@b/utils/error";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseCategorySchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Retrieves a specific ecommerce category by slug",
  description:
    "Fetches a single ecommerce category by its slug, including all active products in that category with calculated ratings and review counts.",
  operationId: "getEcommerceCategoryBySlug",
  tags: ["Ecommerce", "Categories"],
  parameters: [
    {
      index: 0,
      name: "slug",
      in: "path",
      required: true,
      schema: { type: "string", description: "Category slug" },
    },
  ],
  responses: {
    200: {
      description: "Ecommerce category retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseCategorySchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Ecommerce Category"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { params } = data;

  const category = await models.ecommerceCategory.findOne({
    where: { slug: params.slug, status: true },
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

  if (!category) {
    throw createError({ statusCode: 404, message: "Category not found" });
  }

  // Convert the Sequelize instance to a plain object
  const categoryData = category.toJSON();
  const { ecommerceProducts, ...rest } = categoryData;

  try {
    // Process the category data to include ratings and review counts for products
    const processedCategory = {
      ...rest,
      products: ecommerceProducts?.map((product: any) => ({
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

    // Return the processed category
    return JSON.parse(JSON.stringify(processedCategory));
  } catch (error) {
    console.error("Error fetching category:", error);
    throw createError({
      statusCode: 500,
      message: "Error fetching category data",
    });
  }
};
