import type { Optional } from "sequelize";

declare global {
  interface ecommerceWishlistItemAttributes {
    id: string;
    wishlistId: string;
    productId: string;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type ecommerceWishlistItemPk = "id";
  type ecommerceWishlistItemId =
    ecommerceWishlistItemAttributes[ecommerceWishlistItemPk];
  type ecommerceWishlistItemOptionalAttributes = "id" | "createdAt" | "updatedAt";
  type ecommerceWishlistItemCreationAttributes = Optional<
    ecommerceWishlistItemAttributes,
    ecommerceWishlistItemOptionalAttributes
  >;

  // Type alias for easier usage
  type ecommerceWishlistItem = ecommerceWishlistItemAttributes;
}

export {};
