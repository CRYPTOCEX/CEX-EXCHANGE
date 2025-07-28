import type { Optional } from "sequelize";

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
