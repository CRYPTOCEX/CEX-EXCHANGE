import {
  baseStringSchema,
  baseBooleanSchema,
  baseNumberSchema,
} from "@b/utils/schema";

export const baseForexAccountUserSchema = {
  uuid: baseStringSchema("User UUID"),
  firstName: baseStringSchema("User's first name"),
  lastName: baseStringSchema("User's last name"),
  avatar: baseStringSchema("User's avatar URL", 255, 0, true),
};

export const baseForexAccountSchema = {
  accountId: baseStringSchema("The unique identifier for the Forex account"),
  broker: baseStringSchema("Broker name"),
  status: baseBooleanSchema("Current status of the account"),
  type: baseStringSchema("Type of the account (DEMO or LIVE)"),
  mt: baseStringSchema("MetaTrader version"),
  balance: baseNumberSchema("Current balance in the account"),
  leverage: baseStringSchema("Account leverage"),
  user: {
    type: "object",
    description: "User details associated with the account",
    properties: baseForexAccountUserSchema,
  },
};
