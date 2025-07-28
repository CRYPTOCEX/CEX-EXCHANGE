interface ecommerceProductAttributes {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  type: "DOWNLOADABLE" | "PHYSICAL";
  price: number;
  categoryId: string;
  inventoryQuantity: number;
  status: boolean;
  image?: string;
  currency: string;
  walletType: "FIAT" | "SPOT" | "ECO";
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type ecommerceProductPk = "id";
type ecommerceProductId = ecommerceProductAttributes[ecommerceProductPk];
type ecommerceProductOptionalAttributes =
  | "id"
  | "status"
  | "image"
  | "currency"
  | "walletType"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type ecommerceProductCreationAttributes = Optional<
  ecommerceProductAttributes,
  ecommerceProductOptionalAttributes
>;

interface ecommerceProduct extends ecommerceProductAttributes {
  category?: ecommerceCategoryAttributes;
  ecommerceReviews?: any[]; // Replace 'any' with the actual review type if available
  rating: number;
  reviewsCount: number;
  shortDescription: string | null;
  createdAt?: string | Date;
}
