import {
  baseStringSchema,
  baseNumberSchema,
  baseBooleanSchema,
  baseDateTimeSchema,
} from "@b/utils/schema";

// Payment Intent Schemas
const id = baseStringSchema("ID of the Payment Intent");
const userId = baseStringSchema(
  "ID of the user associated with the payment intent"
);
const walletId = baseStringSchema(
  "ID of the wallet associated with the payment intent"
);
const amount = baseNumberSchema("Amount of the payment intent");
const currency = baseStringSchema("Currency used in the payment intent");
const tax = baseNumberSchema("Tax amount of the payment intent");
const discount = baseNumberSchema("Discount applied to the payment intent");
const status = {
  type: "string",
  enum: ["PENDING", "COMPLETED", "FAILED", "EXPIRED"],
  description: "Status of the payment intent",
};
const ipnUrl = baseStringSchema(
  "IPN URL for asynchronous payment notifications"
);
const apiKey = baseStringSchema("API Key used for authentication");
const successUrl = baseStringSchema("URL to redirect upon successful payment");
const failUrl = baseStringSchema("URL to redirect upon failed payment");
const createdAt = baseDateTimeSchema("Creation date of the payment intent");
const updatedAt = baseDateTimeSchema("Last update date of the payment intent");

export const paymentIntentSchema = {
  id,
  userId,
  walletId,
  amount,
  currency,
  tax,
  discount,
  status,
  ipnUrl,
  apiKey,
  successUrl,
  failUrl,
  createdAt,
  updatedAt,
};

export const paymentIntentUpdateSchema = {
  type: "object",
  properties: {
    amount,
    tax,
    discount,
    status,
  },
  required: ["amount", "status"],
};

export const paymentIntentStoreSchema = {
  type: "object",
  properties: {
    userId,
    walletId,
    amount,
    currency,
    tax,
    discount,
    status,
    ipnUrl,
    apiKey,
    successUrl,
    failUrl,
  },
  required: ["amount", "currency", "status", "ipnUrl", "successUrl", "failUrl"],
};

// Payment Intent Product Schemas
const productId = baseStringSchema("ID of the Payment Intent Product");
const paymentIntentId = baseStringSchema(
  "ID of the Payment Intent associated with the product"
);
const name = baseStringSchema("Name of the product");
const quantity = baseNumberSchema("Quantity of the product");
const price = baseNumberSchema("Price of the product");
const image = baseStringSchema("Image URL of the product");

export const paymentIntentProductSchema = {
  productId,
  paymentIntentId,
  name,
  quantity,
  price,
  currency,
  image,
};

export const paymentIntentProductStoreSchema = {
  type: "object",
  properties: {
    name,
    quantity,
    price,
    currency,
    image,
  },
  required: ["name", "quantity", "price", "currency"],
};
