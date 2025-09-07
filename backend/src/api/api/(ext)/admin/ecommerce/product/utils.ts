import {
  baseStringSchema,
  baseEnumSchema,
  baseNumberSchema,
  baseDateTimeSchema,
  baseBooleanSchema,
} from "@b/utils/schema";

const id = baseStringSchema("ID of the e-commerce product");
const name = baseStringSchema("Name of the e-commerce product");
const description = baseStringSchema(
  "Description of the e-commerce product",
  5000,
  0,
  true
);
const shortDescription = baseStringSchema(
  "Short description of the e-commerce product",
  500,
  0,
  true
);
const type = baseStringSchema("Type of the e-commerce product");
const price = baseNumberSchema("Price of the e-commerce product");
const categoryId = baseStringSchema(
  "Category ID associated with the e-commerce product"
);
const inventoryQuantity = baseNumberSchema(
  "Inventory quantity of the e-commerce product"
);
const filePath = baseStringSchema(
  "File path for the product image",
  191,
  0,
  true,
  null,
  "URL"
);
const status = baseBooleanSchema("Status of the e-commerce product");

const image = baseStringSchema(
  "URL to the image of the e-commerce product",
  191,
  0,
  true,
  null,
  "URL"
);
const currency = baseStringSchema("Currency used for the e-commerce product");
const walletType = baseEnumSchema(
  "Wallet type associated with the e-commerce product",
  ["FIAT", "SPOT", "ECO"]
);
const createdAt = baseDateTimeSchema(
  "Creation date of the e-commerce product",
  true
);
const updatedAt = baseDateTimeSchema(
  "Last update date of the e-commerce product",
  true
);
const deletedAt = baseDateTimeSchema(
  "Deletion date of the e-commerce product",
  true
);

export const ecommerceProductSchema = {
  id,
  name,
  description,
  shortDescription,
  type,
  price,
  categoryId,
  inventoryQuantity,
  filePath,
  status,
  image,
  currency,
  walletType,
  createdAt,
  updatedAt,
  deletedAt,
};

export const baseEcommerceProductSchema = {
  id,
  name,
  description,
  shortDescription,
  type,
  price,
  categoryId,
  inventoryQuantity,
  filePath,
  status,
  image,
  currency,
  walletType,
  createdAt,
  deletedAt,
  updatedAt,
};

export const ecommerceProductUpdateSchema = {
  type: "object",
  properties: {
    name,
    description,
    shortDescription,
    type,
    price,
    categoryId,
    status,
    image,
    currency,
    walletType,
    inventoryQuantity,
  },
  required: ["name", "description", "type", "price", "categoryId", "currency", "walletType", "inventoryQuantity"],
};

export const ecommerceProductStoreSchema = {
  description: `E-commerce product created or updated successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: baseEcommerceProductSchema,
      },
    },
  },
};
