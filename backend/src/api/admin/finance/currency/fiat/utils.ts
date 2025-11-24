import {
  baseBooleanSchema,
  baseNumberSchema,
  baseStringSchema,
} from "@b/utils/schema";

// Basic component definitions
const id = baseStringSchema("ID of the created currency");
const name = baseStringSchema("Name of the created currency", 100);
const symbol = baseStringSchema("Symbol of the created currency", 10);
const precision = baseNumberSchema("Precision of the created currency values");
const price = baseNumberSchema("Current price of the created currency", true);
const status = baseBooleanSchema("Status of the created currency");

// Base schema using these components
export const baseFiatCurrencySchema = {
  id,
  name,
  symbol,
  precision,
  price,
  status,
};

export const fiatCurrencyUpdateSchema = {
  type: "object",
  properties: {
    price: {
      ...price,
      minimum: 0, // Ensure price cannot be negative
    },
  },
  required: ["price"],
};

export const fiatCurrencyStoreSchema = {
  description: `Currency created successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: baseFiatCurrencySchema,
      },
    },
  },
};
