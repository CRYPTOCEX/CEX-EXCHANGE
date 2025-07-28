// Assuming base schemas are already created as previously suggested
import {
  baseStringSchema,
  baseNumberSchema,
  baseBooleanSchema,
} from "@b/utils/schema";

export const forexPlanDurationSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      id: baseStringSchema("Duration ID"),
      duration: baseNumberSchema("Duration value"),
      timeframe: baseStringSchema("Timeframe of the duration"),
    },
    required: ["id", "duration", "timeframe"],
  },
};

export const baseForexPlanSchema = {
  id: baseStringSchema("Forex plan ID"),
  title: baseStringSchema("Plan title"),
  description: baseStringSchema("Plan description"),
  image: baseStringSchema("Plan image URL"),
  minAmount: baseNumberSchema("Minimum investment amount"),
  maxAmount: baseNumberSchema("Maximum investment amount"),
  invested: baseNumberSchema("Total amount invested in this plan"),
  trending: baseBooleanSchema("Indicates if the plan is trending"),
  status: baseBooleanSchema("Active status of the plan"),
  forexPlanDuration: forexPlanDurationSchema,
};

export const forexWalletSchema = {
  type: "object",
  properties: {
    currency: baseStringSchema("Wallet currency"),
    type: baseStringSchema("Wallet type"),
  },
};

export const baseForexTransactionSchema = {
  id: baseStringSchema("Transaction ID"),
  userId: baseStringSchema("User ID"),
  type: baseStringSchema("Transaction type"),
  amount: baseNumberSchema("Transaction amount"),
  description: baseStringSchema("Transaction description"),
  status: baseStringSchema("Transaction status"),
  wallet: forexWalletSchema,
};
