import {
  baseStringSchema,
  baseNumberSchema,
  baseBooleanSchema,
  baseDateTimeSchema,
  baseEnumSchema,
} from "@b/utils/schema";

const id = baseStringSchema("ID of the Investment Plan");
const name = baseStringSchema("Name of the Investment Plan", 191);
const title = baseStringSchema("Title of the Investment Plan", 191, 0, true);
const description = baseStringSchema(
  "Description of the Investment Plan",
  191,
  0,
  true
);
const image = baseStringSchema(
  "Image URL of the Investment Plan",
  191,
  0,
  true
);
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
const trending = baseBooleanSchema("Trending Status of the Plan");
const durations = {
  type: "array",
  description: "Array of Investment Plan Duration IDs",
};
const createdAt = baseDateTimeSchema("Creation Date of the Plan");
const updatedAt = baseDateTimeSchema("Last Update Date of the Plan", true);
const deletedAt = baseDateTimeSchema("Deletion Date of the Plan", true);

const currency = baseStringSchema("Currency of the Investment Plan");
const walletType = baseStringSchema("Wallet Type of the Investment Plan");

export const investmentPlanSchema = {
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

export const baseInvestmentPlanSchema = {
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

export const investmentPlanUpdateSchema = {
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
    invested,
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

export const investmentPlanStoreSchema = {
  description: `Investment Plan created or updated successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: baseInvestmentPlanSchema,
      },
    },
  },
};
