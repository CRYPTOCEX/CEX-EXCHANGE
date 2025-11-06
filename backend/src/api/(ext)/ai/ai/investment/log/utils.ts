import {
  baseStringSchema,
  baseNumberSchema,
  baseEnumSchema,
} from "@b/utils/schema";

export const baseInvestmentSchema = {
  id: baseStringSchema("The unique identifier for the investment"),
  userId: baseStringSchema("User ID associated with the investment"),
  planId: baseStringSchema("Plan ID associated with the investment"),
  durationId: baseStringSchema(
    "Duration ID associated with the investment",
    255,
    0,
    true
  ),
  market: baseStringSchema("Market involved in the investment"),
  amount: baseNumberSchema("Amount invested"),
  status: baseEnumSchema("Current status of the investment", [
    "ACTIVE",
    "COMPLETED",
    "CANCELLED",
    "REJECTED",
  ]),
  createdAt: baseStringSchema(
    "Timestamp when the investment was created",
    undefined,
    undefined,
    false,
    "date-time"
  ),
  updatedAt: baseStringSchema(
    "Timestamp when the investment was last updated",
    undefined,
    undefined,
    true,
    "date-time"
  ),
};
