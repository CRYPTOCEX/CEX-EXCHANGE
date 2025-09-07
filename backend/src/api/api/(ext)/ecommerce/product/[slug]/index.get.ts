import { models } from "@b/db";
import { createError } from "@b/utils/error";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseProductSchema } from "../../utils";

export const metadata: OperationObject = {
  summary: "Retrieves a specific ecommerce product by slug",
  description:
    "Fetches a single ecommerce product by its slug, including details such as category and reviews.",
  operationId: "getEcommerceProductBySlug",
  tags: ["Ecommerce", "Products"],
  parameters: [
    {
      index: 0,
      name: "slug",
      in: "path",
      required: true,
      schema: { type: "string", description: "Product slug" },
    },
  ],
  responses: {
    200: {
      description: "Ecommerce product retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseProductSchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Ecommerce Product"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, params } = data;

  let included: any = [];
  if (user?.id) {
    included = [
      {
        model: models.ecommerceOrder,
        as: "orders",
        where: { userId: user.id },
        attributes: ["status"],
        required: false,
        through: {
          attributes: ["quantity", "filePath", "key"],
        },
      },
    ];
  }

  const product = await models.ecommerceProduct.findOne({
    where: { slug: params.slug, status: true },
    include: [
      {
        model: models.ecommerceCategory,
        as: "category",
        attributes: ["id", "name", "slug"],
      },
      {
        model: models.ecommerceReview,
        as: "ecommerceReviews",
        required: false,
        include: [
          {
            model: models.user,
            as: "user",
            attributes: ["id", "firstName", "lastName", "avatar"],
          },
        ],
      },
      ...included,
    ],
  });

  if (!product) {
    throw createError({ statusCode: 404, message: "Product not found" });
  }

  // Convert the Sequelize instance to a plain object
  const productData = product.toJSON();

  // Process the product to include ratings and review counts
  try {
    const processedProduct = {
      ...productData,
      rating: productData.ecommerceReviews?.length
        ? productData.ecommerceReviews.reduce(
            (acc: number, review: any) => acc + review.rating,
            0
          ) / productData.ecommerceReviews.length
        : 0,
      reviewsCount: productData.ecommerceReviews?.length ?? 0,
    };

    // Return the processed product
    return JSON.parse(JSON.stringify(processedProduct));
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: "Error processing product data",
    });
  }
};
