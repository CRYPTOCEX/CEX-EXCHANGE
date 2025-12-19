// backend/api/ecommerce/wishlist/index.post.ts

import { models } from "@b/db";
import { createError } from "@b/utils/error";

import { createRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Adds a product to the user's wishlist",
  description:
    "Allows a user to add a product to their wishlist if it's not already included.",
  operationId: "addToEcommerceWishlist",
  tags: ["Ecommerce", "Wishlist"],
  logModule: "ECOM",
  logTitle: "Add product to wishlist",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            productId: {
              type: "string",
              description: "Product ID to be added to the wishlist",
            },
          },
          required: ["productId"],
        },
      },
    },
  },
  responses: createRecordResponses("Wishlist"),
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user, body, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { productId } = body;

  ctx?.step("Finding or creating user wishlist");
  // Find or create the user's wishlist
  const [wishlist] = await models.ecommerceWishlist.findOrCreate({
    where: { userId: user.id },
  });

  ctx?.step("Checking if product is already in wishlist");
  // Check if the product is already in the wishlist
  const existingWishlistItem = await models.ecommerceWishlistItem.findOne({
    where: { wishlistId: wishlist.id, productId },
  });

  if (existingWishlistItem) {
    ctx?.fail("Product already in wishlist");
    throw createError({
      statusCode: 400,
      message: "Product already in wishlist",
    });
  }

  ctx?.step("Adding product to wishlist");
  // Add the product to the wishlist
  await models.ecommerceWishlistItem.create({
    wishlistId: wishlist.id,
    productId,
  });

  ctx?.success(`Product ${productId} added to wishlist`);

  return {
    message: "Product added to wishlist successfully",
  };
};
