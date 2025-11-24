import { models } from "@b/db";
import { createError } from "@b/utils/error";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseWishlistItemSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Retrieves the user's wishlist",
  description:
    "Fetches all items in the user's wishlist, including product details, categories, and reviews.",
  operationId: "getEcommerceWishlist",
  tags: ["Ecommerce", "Wishlist"],
  responses: {
    200: {
      description: "Wishlist retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: baseWishlistItemSchema,
              required: ["productId", "product"],
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Ecommerce Wishlist"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const wishlist = await models.ecommerceWishlist.findOne({
    where: { userId: user.id },
    include: [
      {
        model: models.ecommerceProduct,
        as: "products",
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
          {
            model: models.ecommerceCategory,
            as: "category",
            attributes: ["slug", "name"],
          },
        ],
      },
    ],
    order: [
      [{ model: models.ecommerceProduct, as: "products" }, "name", "ASC"],
    ],
  });

  if (!wishlist) {
    throw createError({ statusCode: 404, message: "Wishlist not found" });
  }

  if (wishlist.products.length === 0) {
    return [];
  }

  // Process the wishlist to include calculated ratings and categories
  const wishlistData = wishlist.toJSON();

  try {
    const products = wishlistData.products.map((product: any) => ({
      ...product,
      rating: product.ecommerceReviews?.length
        ? product.ecommerceReviews.reduce(
            (acc: number, review: any) => acc + review.rating,
            0
          ) / product.ecommerceReviews.length
        : 0,
      reviewsCount: product.ecommerceReviews?.length ?? 0,
    }));

    return JSON.parse(JSON.stringify(products));
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: "Error processing wishlist data",
    });
  }
};
