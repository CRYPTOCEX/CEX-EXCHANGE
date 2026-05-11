import {
  baseStringSchema,
  baseNumberSchema,
  baseBooleanSchema,
} from "@b/utils/schema";

export const baseCurrencySchema = {
  id: baseStringSchema("Unique identifier for the currency"),
  currency: baseStringSchema("Currency code (e.g., USD, EUR)"),
  name: baseStringSchema("Full name of the currency"),
  precision: baseNumberSchema("Number of decimal places used by the currency"),
  price: baseNumberSchema("Current price of the currency in USD"),
  status: baseBooleanSchema("Active status of the currency"),
  chains: {
    type: "object",
    description: "Blockchain networks supported by the currency",
    additionalProperties: {
      type: "object",
      properties: {
        network: baseStringSchema("Network name"),
        protocol: baseStringSchema("Protocol used"),
      },
    },
  },
};
