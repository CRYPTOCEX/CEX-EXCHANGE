import {
  baseStringSchema,
  baseNumberSchema,
  baseBooleanSchema,
} from "@b/utils/schema";

export const baseDurationSchema = {
  id: baseStringSchema("Unique identifier of the duration"),
  duration: baseNumberSchema("Duration number"),
  timeframe: baseStringSchema("Timeframe of the duration (e.g., days, months)"),
};

export const baseTradingPlanSchema = {
  id: baseStringSchema("The unique identifier for the trading plan"),
  title: baseStringSchema("Title of the trading plan"),
  description: baseStringSchema("Description of the trading plan"),
  image: baseStringSchema("URL of the image representing the trading plan"),
  minAmount: baseNumberSchema("Minimum amount required to invest in the plan"),
  maxAmount: baseNumberSchema(
    "Maximum amount allowed for investment in the plan"
  ),
  invested: baseNumberSchema("Total amount currently invested in the plan"),
  trending: baseBooleanSchema("Indicator if the plan is trending"),
  status: baseBooleanSchema("Status of the trading plan (active/inactive)"),
  durations: {
    type: "array",
    description: "List of durations available for this trading plan",
    items: {
      type: "object",
      properties: baseDurationSchema,
      required: ["id", "duration", "timeframe"],
    },
  },
};
