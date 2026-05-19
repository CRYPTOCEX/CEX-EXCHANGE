import type { Optional } from "sequelize";

declare global {
  interface ecommerceOrderAttributes {
    id: string;
    userId: string;
    status: "PENDING" | "COMPLETED" | "CANCELLED" | "REJECTED";
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
    shippingId?: string;
  }

  type ecommerceOrderPk = "id";
  type ecommerceOrderId = ecommerceOrderAttributes[ecommerceOrderPk];
  type ecommerceOrderOptionalAttributes =
    | "id"
    | "status"
    | "createdAt"
    | "deletedAt"
    | "updatedAt"
    | "shippingId";
  type ecommerceOrderCreationAttributes = Optional<
    ecommerceOrderAttributes,
    ecommerceOrderOptionalAttributes
  >;

  // Type alias for easier usage
  type ecommerceOrder = ecommerceOrderAttributes;
}

export {};
