import type { Optional } from "sequelize";

declare global {
  interface ecommerceWishlistAttributes {
    id: string;
    userId: string;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type ecommerceWishlistPk = "id";
  type ecommerceWishlistId = ecommerceWishlistAttributes[ecommerceWishlistPk];
  type ecommerceWishlistOptionalAttributes = "id" | "createdAt" | "updatedAt";
  type ecommerceWishlistCreationAttributes = Optional<
    ecommerceWishlistAttributes,
    ecommerceWishlistOptionalAttributes
  >;

  // Type alias for easier usage
  type ecommerceWishlist = ecommerceWishlistAttributes;
}

export {};
