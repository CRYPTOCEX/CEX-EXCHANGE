interface ecommerceOrderItemAttributes {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  key?: string;
  filePath?: string;
  instructions?: string;
}

type ecommerceOrderItemPk = "id";
type ecommerceOrderItemId = ecommerceOrderItemAttributes[ecommerceOrderItemPk];
type ecommerceOrderItemOptionalAttributes = "id" | "key";
type ecommerceOrderItemCreationAttributes = Optional<
  ecommerceOrderItemAttributes,
  ecommerceOrderItemOptionalAttributes
>;
