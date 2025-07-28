import {
  baseIntegerSchema,
  baseEnumSchema,
  baseStringSchema,
} from "@b/utils/schema";

const id = baseStringSchema("ID of the Investment Duration");
const duration = baseIntegerSchema("Duration in time units");
const timeframe = baseEnumSchema("Unit of time for duration", [
  "HOUR",
  "DAY",
  "WEEK",
  "MONTH",
]);

export const investmentDurationSchema = {
  id,
  duration,
  timeframe,
};

export const baseInvestmentDurationSchema = {
  id,
  duration,
  timeframe,
};

export const investmentDurationUpdateSchema = {
  type: "object",
  properties: {
    duration,
    timeframe,
  },
  required: ["duration", "timeframe"],
};

export const investmentDurationStoreSchema = {
  description: `Investment Duration created or updated successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: baseInvestmentDurationSchema,
      },
    },
  },
};
