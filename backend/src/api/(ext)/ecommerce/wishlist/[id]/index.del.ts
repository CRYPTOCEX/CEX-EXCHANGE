// backend/api/ecommerce/wishlist/[id]/index.del.ts

import { models } from "@b/db";
import { createError } from "@b/utils/error";

import { deleteRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Removes a product from the user's wishlist",
  description: "Allows a user to remove a product from their wishlist.",
  operationId: "removeFromEcommerceWishlist",
  tags: ["Ecommerce", "Wishlist"],
  logModule: "ECOM",
  logTitle: "Remove from wishlist",
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
  const { user, params, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const { id } = params;

  ctx?.step("Finding user wishlist");
  // Find the user's wishlist
  const wishlist = await models.ecommerceWishlist.findOne({
    where: { userId: user.id },
  });

  if (!wishlist) {
    ctx?.fail("Wishlist not found");
    throw createError({
      statusCode: 404,
      message: "Wishlist not found",
    });
  }

  ctx?.step("Removing product from wishlist");
  // Remove the product from the wishlist
  const result = await models.ecommerceWishlistItem.destroy({
    where: { wishlistId: wishlist.id, productId: id },
    force: true,
  });

  if (!result) {
    ctx?.fail("Product not found in wishlist");
    throw createError({
      statusCode: 404,
      message: "Product not found in wishlist",
    });
  }

  ctx?.step("Checking if wishlist is empty");
  // Check if the wishlist is empty
  const remainingItems = await models.ecommerceWishlistItem.findAll({
    where: { wishlistId: wishlist.id },
  });

  if (remainingItems.length === 0) {
    ctx?.step("Removing empty wishlist");
    // Remove the empty wishlist
    await models.ecommerceWishlist.destroy({
      where: { id: wishlist.id },
      force: true,
    });
  }

  ctx?.success(`Product ${id} removed from wishlist`);

  return { message: "Product removed from wishlist successfully" };
};
