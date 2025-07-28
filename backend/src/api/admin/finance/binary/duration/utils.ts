import {
  baseStringSchema,
  baseBooleanSchema,
  baseNumberSchema,
} from "@b/utils/schema";

const id = baseStringSchema("ID of the binary duration");
const duration = baseNumberSchema("Duration in minutes for binary option expiry");
const profitPercentage = baseNumberSchema("Profit percentage offered for this duration");
const status = baseBooleanSchema("Whether this duration is active and available for trading");

export const binaryDurationSchema = {
  id,
  duration,
  profitPercentage,
  status,
};

export const BinaryDurationStoreSchema = {
  type: "object",
  properties: {
    duration,
    profitPercentage,
    status,
  },
  required: ["duration", "profitPercentage", "status"],
};

export const BinaryDurationUpdateSchema = {
  type: "object",
  properties: {
    duration,
    profitPercentage,
    status,
  },
  required: ["duration", "profitPercentage"],
};