import {
  baseStringSchema,
  baseEnumSchema,
  baseNumberSchema,
  baseDateTimeSchema,
} from "@b/utils/schema";

const id = baseStringSchema("ID of the Forex Investment");
const userId = baseStringSchema("ID of the User");
const planId = baseStringSchema("ID of the Forex Plan", 191, 0, true);
const durationId = baseStringSchema("ID of the Forex Duration", 191, 0, true);
const amount = baseNumberSchema("Invested Amount");
const profit = baseNumberSchema("Profit from Investment");
const result = baseEnumSchema("Result of the Investment", [
  "WIN",
  "LOSS",
  "DRAW",
]);
const status = baseEnumSchema("Status of the Investment", [
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
]);
const endDate = baseDateTimeSchema("End Date of the Investment");
const createdAt = baseDateTimeSchema("Creation Date of the Investment");
const updatedAt = baseDateTimeSchema("Last Update Date of the Investment");
const deletedAt = baseDateTimeSchema("Deletion Date of the Investment", true);

export const forexInvestmentSchema = {
  id,
  userId,
  planId,
  durationId,
  amount,
  profit,
  result,
  status,
  endDate,
  createdAt,
  updatedAt,
  deletedAt,
};

export const baseForexInvestmentSchema = {
  id,
  userId,
  planId,
  durationId,
  amount,
  profit,
  result,
  status,
  endDate,
  createdAt,
  updatedAt,
  deletedAt,
};

export const forexInvestmentUpdateSchema = {
  type: "object",
  properties: {
    userId,
    planId,
    durationId,
    amount,
    profit,
    result,
    status,
    endDate,
  },
  required: ["status"],
};

export const forexInvestmentStoreSchema = {
  description: `Forex Investment created or updated successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: baseForexInvestmentSchema,
      },
    },
  },
};
