import type { Optional } from "sequelize";

declare global {
  interface ecommerceCategoryAttributes {
    id: string;
    name: string;
    slug: string;
    description: string;
    image?: string;
    status: boolean;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
    products?: ecommerceProductAttributes[];
  }

  type ecommerceCategoryPk = "id";
  type ecommerceCategoryId = ecommerceCategoryAttributes[ecommerceCategoryPk];
  type ecommerceCategoryOptionalAttributes =
    | "id"
    | "image"
    | "status"
    | "createdAt"
    | "deletedAt"
    | "updatedAt";
  type ecommerceCategoryCreationAttributes = Optional<
    ecommerceCategoryAttributes,
    ecommerceCategoryOptionalAttributes
  >;

  // Type alias for easier usage
  type ecommerceCategory = ecommerceCategoryAttributes;
}

export type { ecommerceCategoryAttributes };
