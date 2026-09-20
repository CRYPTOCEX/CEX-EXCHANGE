import type { Optional } from "sequelize";

declare global {
  interface ecommerceUserDiscountAttributes {
    id: string;
    userId: string;
    discountId: string;
    status: boolean;
  }

  type ecommerceUserDiscountPk = "id";
  type ecommerceUserDiscountId =
    ecommerceUserDiscountAttributes[ecommerceUserDiscountPk];
  type ecommerceUserDiscountOptionalAttributes = "id" | "status";
  type ecommerceUserDiscountCreationAttributes = Optional<
    ecommerceUserDiscountAttributes,
    ecommerceUserDiscountOptionalAttributes
  >;

  // Type alias for easier usage
  type ecommerceUserDiscount = ecommerceUserDiscountAttributes;
}

export {};
