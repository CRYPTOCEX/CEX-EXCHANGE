import { baseNumberSchema, baseStringSchema } from "@b/utils/schema";

export const baseDiscountSchema = {
  id: baseStringSchema("The unique identifier for the discount"),
  code: baseStringSchema("The discount code applied"),
  status: baseStringSchema(
    "The current status of the discount (e.g., ACTIVE, INACTIVE)"
  ),
};

export const baseOrderItemSchema = {
  productId: baseStringSchema("Product ID of the item"),
  quantity: baseNumberSchema("Quantity of the product ordered"),
  product: {
    type: "object",
    description: "Details of the product ordered",
    properties: {
      name: baseStringSchema("Name of the product"),
      price: baseNumberSchema("Price of the product"),
      image: baseStringSchema("Product image URL", 255, 0, true),
    },
    required: ["name", "price"],
  },
};

export const baseOrderSchema = {
  id: baseStringSchema("The unique identifier for the order"),
  status: baseStringSchema("Status of the order"),
  orderItems: {
    type: "array",
    description: "List of items in the order",
    items: {
      type: "object",
      properties: baseOrderItemSchema,
      required: ["productId", "quantity", "product"],
    },
  },
};

export const baseUserSchema = {
  id: baseStringSchema("User's UUID"),
  firstName: baseStringSchema("User's first name"),
  lastName: baseStringSchema("User's last name"),
  avatar: baseStringSchema("User's avatar", 255, 0, true),
};

export const baseReviewSchema = {
  id: baseStringSchema("Review ID"),
  comment: baseStringSchema("Review comment"),
  user: {
    type: "object",
    description: "User who made the review",
    properties: baseUserSchema,
    required: ["id", "firstName", "lastName"],
  },
};

export const baseProductSchema = {
  id: baseStringSchema("The unique identifier for the product"),
  name: baseStringSchema("Name of the product"),
  description: baseStringSchema("Description of the product"),
  type: baseStringSchema("Type of the product"),
  price: baseNumberSchema("Price of the product"),
  categoryId: baseStringSchema("Category ID of the product"),
  inventoryQuantity: baseNumberSchema("Inventory quantity available"),
  image: baseStringSchema("URL of the product image", 255, 0, true),
  currency: baseStringSchema("Currency of the price"),
  walletType: baseStringSchema("Wallet type for the transaction"),
  createdAt: baseStringSchema(
    "Timestamp when the product was created",
    undefined,
    undefined,
    false,
    "date-time"
  ),
  category: {
    type: "object",
    description: "Category details",
    properties: {
      id: baseStringSchema("Category ID"),
      name: baseStringSchema("Category name"),
    },
    required: ["id", "name"],
  },
  reviews: {
    type: "array",
    description: "List of reviews for the product",
    items: {
      type: "object",
      properties: baseReviewSchema,
      required: ["id", "comment", "user"],
    },
  },
};

export const baseProductReviewSchema = {
  uuid: baseStringSchema("User's UUID"),
  firstName: baseStringSchema("User's first name"),
  lastName: baseStringSchema("User's last name"),
  avatar: baseStringSchema("User's avatar", 255, 0, true),
};

export const baseWishlistItemSchema = {
  productId: baseStringSchema("Product ID in the wishlist"),
  product: {
    type: "object",
    description: "Details of the product",
    properties: baseProductSchema,
    required: ["name"],
  },
};
