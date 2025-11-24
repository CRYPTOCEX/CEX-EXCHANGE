interface ecommerceDiscountAttributes {
  id: string;
  code: string;
  percentage: number;
  validUntil: Date;
  productId: string;
  status: boolean;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type ecommerceDiscountPk = "id";
type ecommerceDiscountId = ecommerceDiscountAttributes[ecommerceDiscountPk];
type ecommerceDiscountOptionalAttributes =
  | "id"
  | "status"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type ecommerceDiscountCreationAttributes = Optional<
  ecommerceDiscountAttributes,
  ecommerceDiscountOptionalAttributes
>;
