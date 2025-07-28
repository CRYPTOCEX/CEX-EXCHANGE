import {
  baseStringSchema,
  baseEnumSchema,
  baseIntegerSchema,
} from "@b/utils/schema";

const id = baseStringSchema("ID of the AI Investment Duration");
const duration = baseIntegerSchema("Duration of the investment period");
const timeframe = baseEnumSchema("Timeframe of the investment duration", [
  "HOUR",
  "DAY",
  "WEEK",
  "MONTH",
]);

export const aiInvestmentDurationSchema = {
  id,
  duration,
  timeframe,
};

export const baseAIInvestmentDurationSchema = {
  id,
  duration,
  timeframe,
};

export const aiInvestmentDurationUpdateSchema = {
  type: "object",
  properties: {
    duration,
    timeframe,
  },
  required: ["duration", "timeframe"],
};

export const aiInvestmentDurationStoreSchema = {
  description: `AI Investment Duration created or updated successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: baseAIInvestmentDurationSchema,
      },
    },
  },
};
