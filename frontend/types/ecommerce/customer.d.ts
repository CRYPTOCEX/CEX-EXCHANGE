import type { Optional } from "sequelize";

interface ecommerceCustomerAttributes {
  id: string;
  name: string;
  email: string;
  orderCount: number;
  totalSpent: number;
  createdAt: Date;
  updatedAt?: Date;
}

type ecommerceCustomerPk = "id";
type ecommerceCustomerId = ecommerceCustomerAttributes[ecommerceCustomerPk];
type ecommerceCustomerOptionalAttributes = "id" | "updatedAt";
type ecommerceCustomerCreationAttributes = Optional<
  ecommerceCustomerAttributes,
  ecommerceCustomerOptionalAttributes
>;
