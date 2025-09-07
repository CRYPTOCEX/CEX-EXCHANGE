import {
  baseStringSchema,
  baseNumberSchema,
  baseEnumSchema,
  baseDateTimeSchema,
} from "@b/utils/schema";

const id = baseStringSchema("ID of the AI Investment");
const userId = baseStringSchema(
  "ID of the user associated with the investment"
);
const planId = baseStringSchema("ID of the investment plan");
const durationId = baseStringSchema("ID of the investment duration");
const symbol = baseStringSchema("Market targeted by the investment");
const amount = baseNumberSchema("Amount invested");
const profit = baseNumberSchema("Profit from the investment", true);
const result = baseEnumSchema("Result of the investment", [
  "WIN",
  "LOSS",
  "DRAW",
]);
const status = baseEnumSchema("Current status of the investment", [
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
]);
const createdAt = baseDateTimeSchema("Creation date of the investment");
const updatedAt = baseDateTimeSchema(
  "Last update date of the investment",
  true
);
const deletedAt = baseDateTimeSchema("Deletion date of the investment", true);
const type = baseEnumSchema("Type of wallet", ["SPOT", "ECO"]);

export const aiInvestmentSchema = {
  id,
  userId,
  planId,
  durationId,
  symbol,
  type,
  amount,
  profit,
  result,
  status,
  createdAt,
  updatedAt,
};

export const baseAIInvestmentSchema = {
  id,
  userId,
  planId,
  durationId,
  symbol,
  type,
  amount,
  profit,
  result,
  status,
  createdAt,
  updatedAt,
  deletedAt,
};

export const aiInvestmentUpdateSchema = {
  type: "object",
  properties: {
    userId,
    planId,
    durationId,
    symbol,
    type,
    amount,
    profit,
    result,
    status,
  },
  required: ["userId", "planId", "symbol", "amount", "status"],
};

export const aiInvestmentStoreSchema = {
  description: `AI Investment created or updated successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: baseAIInvestmentSchema,
      },
    },
  },
};
