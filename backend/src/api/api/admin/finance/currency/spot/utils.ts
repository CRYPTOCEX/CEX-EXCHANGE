import {
  baseBooleanSchema,
  baseNumberSchema,
  baseStringSchema,
} from "@b/utils/schema";

// Basic component definitions
const currency = baseStringSchema("Currency code, like USDT, ETH", 10);
const name = baseStringSchema("Full name of the currency.", 100);
const precision = baseNumberSchema(
  "Number of decimal places to which this currency is accounted."
);
const price = baseNumberSchema(
  "Current exchange rate relative to a base currency.",
  true
);
const chains = {
  type: "object",
  description: "Supported blockchain networks for this currency.",
  additionalProperties: {
    type: "string",
    description: "Blockchain network name",
    maxLength: 50,
  },
};
const status = baseBooleanSchema("Active status of the currency.");

export const baseExchangeCurrencySchema = {
  currency,
  name,
  precision,
  price,
  chains,
  status,
};

export const exchangeCurrencyUpdateSchema = {
  type: "object",
  properties: {
    name: {
      ...name,
      minLength: 1, // Ensure the name is not empty
    },
    chains: chains,
  },
  required: ["name", "chains"],
};
