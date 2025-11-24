import {
  baseStringSchema,
  baseBooleanSchema,
  baseNumberSchema,
  baseEnumSchema,
} from "@b/utils/schema";

const id = baseStringSchema("ID of the AI Investment Plan");
const name = baseStringSchema("Name of the AI Investment Plan", 191);
const title = baseStringSchema("Title of the AI Investment Plan", 191);
const description = baseStringSchema(
  "Description of the AI Investment Plan",
  500,
  0,
  true
);
const image = baseStringSchema(
  "URL to an image representing the AI Investment Plan",
  1000,
  0,
  true
);
const status = baseBooleanSchema("Current status of the AI Investment Plan");
const invested = baseNumberSchema(
  "Total amount invested in the AI Investment Plan"
);
const profitPercentage = baseNumberSchema(
  "Profit percentage of the AI Investment Plan"
);
const minProfit = baseNumberSchema("Minimum profit of the AI Investment Plan");
const maxProfit = baseNumberSchema("Maximum profit of the AI Investment Plan");
const minAmount = baseNumberSchema(
  "Minimum amount required to join the AI Investment Plan"
);
const maxAmount = baseNumberSchema(
  "Maximum amount allowed in the AI Investment Plan"
);
const trending = baseBooleanSchema("Is the AI Investment Plan trending?");
const defaultProfit = baseNumberSchema(
  "Default profit for the AI Investment Plan"
);
const defaultResult = baseEnumSchema(
  "Default result for the AI Investment Plan",
  ["WIN", "LOSS", "DRAW"]
);
const durations = {
  type: "array",
  description: "Array of Investment Plan Duration IDs",
};

export const aiInvestmentPlanSchema = {
  id,
  name,
  title,
  description,
  image,
  status,
  invested,
  profitPercentage,
  minProfit,
  maxProfit,
  minAmount,
  maxAmount,
  durations,
  trending,
  defaultProfit,
  defaultResult,
};

export const baseAIInvestmentPlanSchema = {
  id,
  name,
  title,
  description,
  image,
  status,
  invested,
  profitPercentage,
  minProfit,
  maxProfit,
  minAmount,
  maxAmount,
  trending,
  defaultProfit,
  defaultResult,
  durations,
};

export const aiInvestmentPlanUpdateSchema = {
  type: "object",
  properties: {
    name,
    title,
    description,
    image,
    status,
    invested,
    profitPercentage,
    minProfit,
    maxProfit,
    minAmount,
    maxAmount,
    trending,
    defaultProfit,
    defaultResult,
    durations,
  },
  required: [
    "name",
    "title",
    "invested",
    "profitPercentage",
    "minProfit",
    "maxProfit",
    "minAmount",
    "maxAmount",
    "defaultProfit",
    "defaultResult",
  ],
};

export const aiInvestmentPlanStoreSchema = {
  description: `AI Investment Plan created or updated successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: baseAIInvestmentPlanSchema,
      },
    },
  },
};
