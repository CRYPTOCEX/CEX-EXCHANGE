import { baseStringSchema, baseBooleanSchema } from "@b/utils/schema";

export const baseMarketSchema = {
  id: baseStringSchema("Unique identifier for the market"),
  currency: baseStringSchema("Primary currency of the market"),
  pair: baseStringSchema("Currency pair traded in this market"),
  isTrending: baseBooleanSchema(
    "Indicator if the market is currently trending"
  ),
  isHot: baseBooleanSchema(
    "Indicator if the market is currently considered 'hot'"
  ),
  metadata: {
    type: "object",
    description: "Additional metadata about the market",
    additionalProperties: true, // This allows any shape of nested object
  },
  status: baseBooleanSchema("Active status of the market"),
};
