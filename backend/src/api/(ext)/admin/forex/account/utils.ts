import {
  baseStringSchema,
  baseIntegerSchema,
  baseBooleanSchema,
  baseEnumSchema,
  baseDateTimeSchema,
} from "@b/utils/schema";

const id = baseStringSchema("ID of the Forex account");
const userId = baseStringSchema("User ID associated with the Forex account");
const accountId = baseStringSchema("Account ID of the Forex account");
const password = baseStringSchema(
  "Password for the Forex account",
  191,
  6,
  true
);
const broker = baseStringSchema("Broker of the Forex account");
const mt = baseEnumSchema("MT version of the Forex account", ["4", "5"]);
const balance = baseIntegerSchema("Current balance in the Forex account");
const leverage = baseIntegerSchema("Leverage used in the Forex account");
const type = baseEnumSchema("Type of Forex account", ["DEMO", "LIVE"]);
const status = baseBooleanSchema("Status of the Forex account");
const createdAt = baseDateTimeSchema("Creation date of the Forex account");
const updatedAt = baseDateTimeSchema("Last update date of the Forex account");
const deletedAt = baseDateTimeSchema(
  "Deletion date of the Forex account",
  true
);

export const forexAccountSchema = {
  id,
  userId,
  accountId,
  password,
  broker,
  mt,
  balance,
  leverage,
  type,
  status,
  createdAt,
  updatedAt,
  deletedAt,
};

export const baseForexAccountSchema = {
  id,
  userId,
  accountId,
  password,
  broker,
  mt,
  balance,
  leverage,
  type,
  status,
};

export const forexAccountUpdateSchema = {
  type: "object",
  properties: {
    userId,
    accountId,
    password,
    broker,
    mt,
    balance,
    leverage,
    type,
    status,
  },
  required: [
    "accountId",
    "broker",
    "mt",
    "balance",
    "leverage",
    "type",
    "status",
  ],
};

export const forexAccountStoreSchema = {
  description: `Forex account created or updated successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: baseForexAccountSchema,
      },
    },
  },
};
