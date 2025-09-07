import {
  baseStringSchema,
  baseEnumSchema,
  baseNumberSchema,
  baseDateTimeSchema,
} from "@b/utils/schema";

const id = baseStringSchema("ID of the Investment");
const userId = baseStringSchema("ID of the User");
const planId = baseStringSchema("ID of the General Plan", 191, 0, true);
const durationId = baseStringSchema("ID of the General Duration", 191, 0, true);
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

export const investmentSchema = {
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

export const baseInvestmentSchema = {
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

export const investmentUpdateSchema = {
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

export const investmentStoreSchema = {
  description: `Investment created or updated successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: baseInvestmentSchema,
      },
    },
  },
};
