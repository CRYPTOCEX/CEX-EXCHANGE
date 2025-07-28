import type { Optional } from "sequelize";

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
