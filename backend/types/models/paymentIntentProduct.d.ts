interface paymentIntentProductAttributes {
  id: string;
  paymentIntentId: string;
  name: string;
  quantity: number;
  price: number;
  currency: string;
  sku?: string;
  image?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type paymentIntentProductPk = "id";
type paymentIntentProductId = paymentIntentProductAttributes[paymentIntentProductPk];
type paymentIntentProductOptionalAttributes =
  | "id"
  | "sku"
  | "image"
  | "createdAt"
  | "updatedAt";
type paymentIntentProductCreationAttributes = Optional<
  paymentIntentProductAttributes,
  paymentIntentProductOptionalAttributes
>;
