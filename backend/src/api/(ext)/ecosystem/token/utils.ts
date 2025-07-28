import {
  baseStringSchema,
  baseBooleanSchema,
  baseNumberSchema,
} from "@b/utils/schema";

export const baseTokenSchema = {
  name: baseStringSchema("Token name"),
  currency: baseStringSchema("Token currency code"),
  chain: baseStringSchema("Blockchain chain name"),
  type: baseStringSchema("Token type"),
  status: baseBooleanSchema("Token status"),
  precision: baseNumberSchema("Token precision"),
  limits: {
    type: "object",
    description: "Token transfer limits",
    // Define specific properties if necessary
  },
  decimals: baseNumberSchema("Token decimal places"),
  icon: baseStringSchema("Token icon URL", 255, 0, true),
  contractType: baseStringSchema("Type of token contract"),
  network: baseStringSchema("Network type"),
  fee: {
    type: "object",
    description: "Token fee",
    // Define specific properties if necessary
  },
};
