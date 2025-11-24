import { baseStringSchema, baseDateTimeSchema } from "@b/utils/schema";

const id = baseStringSchema("ID of the e-commerce wishlist entry");
const userId = baseStringSchema(
  "User ID associated with the wishlist entry",
  36
);
const productId = baseStringSchema(
  "Product ID associated with the wishlist entry",
  36
);
const createdAt = baseDateTimeSchema(
  "Creation date of the wishlist entry",
  true
);
const updatedAt = baseDateTimeSchema(
  "Last update date of the wishlist entry",
  true
);
const deletedAt = baseDateTimeSchema(
  "Deletion date of the wishlist entry",
  true
);

export const ecommerceWishlistSchema = {
  id,
  userId,
  productId,
  createdAt,
  updatedAt,
  deletedAt,
};

export const baseEcommerceWishlistSchema = {
  id,
  userId,
  productId,
  createdAt,
  updatedAt,
  deletedAt,
};

export const wishlistUpdateSchema = {
  type: "object",
  properties: {
    userId,
    productId,
  },
  required: ["userId", "productId"],
};
