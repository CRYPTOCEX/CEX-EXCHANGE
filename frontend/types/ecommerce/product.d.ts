import type { Optional } from "sequelize";

declare global {
  interface ecommerceProductAttributes {
    id: string;
    name: string;
    slug: string;
    description: string;
    shortDescription: string;
    type: "DOWNLOADABLE" | "PHYSICAL";
    price: number;
    categoryId: string;
    inventoryQuantity: number;
    status: boolean;
    image?: string;
    currency: string;
    walletType: "FIAT" | "SPOT" | "ECO";
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
    category?: ecommerceCategoryAttributes;
    ecommerceReviews?: ecommerceReviewAttributes[];
  }

  type ecommerceProductPk = "id";
  type ecommerceProductId = ecommerceProductAttributes[ecommerceProductPk];
  type ecommerceProductOptionalAttributes =
    | "id"
    | "status"
    | "image"
    | "currency"
    | "walletType"
    | "createdAt"
    | "deletedAt"
    | "updatedAt";
  type ecommerceProductCreationAttributes = Optional<
    ecommerceProductAttributes,
    ecommerceProductOptionalAttributes
  >;

  // Type alias for easier usage
  type ecommerceProduct = ecommerceProductAttributes;
}

export {};
