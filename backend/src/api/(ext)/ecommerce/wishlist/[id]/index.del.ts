// backend/api/ecommerce/wishlist/[id]/index.del.ts

import { models } from "@b/db";
import { createError } from "@b/utils/error";

import { deleteRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Removes a product from the user's wishlist",
  description: "Allows a user to remove a product from their wishlist.",
  operationId: "removeFromEcommerceWishlist",
  tags: ["Ecommerce", "Wishlist"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: {
        type: "string",
        description: "Product ID to be removed from the wishlist",
      },
    },
  ],
  responses: deleteRecordResponses("Wishlist"),
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user, params } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const { id } = params;

  // Find the user's wishlist
  const wishlist = await models.ecommerceWishlist.findOne({
    where: { userId: user.id },
  });

  if (!wishlist) {
    throw createError({
      statusCode: 404,
      message: "Wishlist not found",
    });
  }

  // Remove the product from the wishlist
  const result = await models.ecommerceWishlistItem.destroy({
    where: { wishlistId: wishlist.id, productId: id },
    force: true,
  });

  if (!result) {
    throw createError({
      statusCode: 404,
      message: "Product not found in wishlist",
    });
  }

  // Check if the wishlist is empty
  const remainingItems = await models.ecommerceWishlistItem.findAll({
    where: { wishlistId: wishlist.id },
  });

  if (remainingItems.length === 0) {
    // Remove the empty wishlist
    await models.ecommerceWishlist.destroy({
      where: { id: wishlist.id },
      force: true,
    });
  }

  return { message: "Product removed from wishlist successfully" };
};
