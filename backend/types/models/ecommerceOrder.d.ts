interface ecommerceOrderAttributes {
  id: string;
  userId: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED" | "REJECTED";
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
  shippingId?: string; // Added shippingId
}

type ecommerceOrderPk = "id";
type ecommerceOrderId = ecommerceOrderAttributes[ecommerceOrderPk];
type ecommerceOrderOptionalAttributes =
  | "id"
  | "status"
  | "createdAt"
  | "deletedAt"
  | "updatedAt"
  | "shippingId"; // Added shippingId

type ecommerceOrderCreationAttributes = Optional<
  ecommerceOrderAttributes,
  ecommerceOrderOptionalAttributes
>;

interface ecommerceOrder extends ecommerceOrderAttributes {
  products: ecommerceProductAttributes[]; // Array of products in the order
}
