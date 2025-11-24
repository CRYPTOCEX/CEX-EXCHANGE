import {
  baseStringSchema,
  baseNumberSchema,
  baseBooleanSchema,
  baseDateTimeSchema,
  baseEnumSchema,
} from "@b/utils/schema";

const id = baseStringSchema("ID of the Forex Plan");
const name = baseStringSchema("Name of the Forex Plan", 191);
const title = baseStringSchema("Title of the Forex Plan", 191, 0, true);
const description = baseStringSchema(
  "Description of the Forex Plan",
  191,
  0,
  true
);
const image = baseStringSchema("Image URL of the Forex Plan", 191, 0, true);
const minProfit = baseNumberSchema("Minimum Profit");
const maxProfit = baseNumberSchema("Maximum Profit");
const minAmount = baseNumberSchema("Minimum Amount", true);
const maxAmount = baseNumberSchema("Maximum Amount", true);
const invested = baseNumberSchema("Total Invested");
const profitPercentage = baseNumberSchema("Profit Percentage");
const status = baseBooleanSchema("Status of the Plan");
const defaultProfit = baseNumberSchema("Default Profit");
const defaultResult = baseEnumSchema("Default Result of the Plan", [
  "WIN",
  "LOSS",
  "DRAW",
]);
const durations = {
  type: "array",
  description: "Array of Investment Plan Duration IDs",
};
const trending = baseBooleanSchema("Trending Status of the Plan");
const createdAt = baseDateTimeSchema("Creation Date of the Plan");
const updatedAt = baseDateTimeSchema("Last Update Date of the Plan", true);
const deletedAt = baseDateTimeSchema("Deletion Date of the Plan", true);
const currency = baseStringSchema("Currency of the Investment Plan");
const walletType = baseEnumSchema("Wallet Type of the Investment Plan", [
  "FIAT",
  "SPOT",
  "ECO",
]);

export const forexPlanSchema = {
  id,
  name,
  title,
  description,
  image,
  minProfit,
  maxProfit,
  minAmount,
  maxAmount,
  invested,
  profitPercentage,
  status,
  defaultProfit,
  defaultResult,
  trending,
  durations,
  currency,
  walletType,
  createdAt,
  updatedAt,
  deletedAt,
};

export const baseForexPlanSchema = {
  id,
  name,
  title,
  description,
  image,
  minProfit,
  maxProfit,
  minAmount,
  maxAmount,
  invested,
  profitPercentage,
  status,
  defaultProfit,
  defaultResult,
  trending,
  durations,
  currency,
  walletType,
  createdAt,
  updatedAt,
  deletedAt,
};

export const forexPlanUpdateSchema = {
  type: "object",
  properties: {
    name,
    title,
    description,
    image,
    minProfit,
    maxProfit,
    minAmount,
    maxAmount,
    profitPercentage,
    status,
    defaultProfit,
    defaultResult,
    trending,
    durations,
    currency,
    walletType,
  },
  required: ["name"],
};

export const forexPlanStoreSchema = {
  description: `Forex Plan created or updated successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: baseForexPlanSchema,
      },
    },
  },
};
