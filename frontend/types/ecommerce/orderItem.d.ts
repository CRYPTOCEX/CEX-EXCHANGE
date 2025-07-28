import type { Optional } from "sequelize";

interface ecommerceOrderItemAttributes {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  key?: string;
  filePath?: string;
}

type ecommerceOrderItemPk = "id";
type ecommerceOrderItemId = ecommerceOrderItemAttributes[ecommerceOrderItemPk];
type ecommerceOrderItemOptionalAttributes = "id" | "key" | "filePath";
type ecommerceOrderItemCreationAttributes = Optional<
  ecommerceOrderItemAttributes,
  ecommerceOrderItemOptionalAttributes
>;
