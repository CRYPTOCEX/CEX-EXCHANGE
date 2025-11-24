import { baseNumberSchema, baseStringSchema } from "@b/utils/schema";

// Base schema for exchange orders using reusable schema components
const id = {
  ...baseStringSchema("ID of the exchange order"),
  nullable: true, // Optional for creation or updates where not needed
};
const referenceId = {
  ...baseStringSchema("Reference ID of the order"),
  nullable: true,
};
const userId = {
  ...baseStringSchema("User ID associated with the order"),
  nullable: true,
};
const status = {
  ...baseStringSchema("Current status of the order"),
  enum: ["OPEN", "CLOSED", "CANCELLED"],
};
const symbol = baseStringSchema("Trading symbol of the order");
const type = {
  ...baseStringSchema("Type of the order (LIMIT, MARKET)"),
  enum: ["LIMIT", "MARKET"],
};
const timeInForce = {
  ...baseStringSchema("Time in Force for the order (GTC, IOC)"),
  enum: ["GTC", "IOC"],
};
const side = {
  ...baseStringSchema("Side of the order (BUY, SELL)"),
  enum: ["BUY", "SELL"],
};
const price = baseNumberSchema("Price at which the order was placed");
const amount = baseNumberSchema("Amount traded in the order");
const fee = baseNumberSchema("Transaction fee for the order");
const feeCurrency = baseStringSchema("Currency of the transaction fee");

const user = {
  type: "object",
  properties: {
    id: { type: "string", description: "User ID" },
    firstName: {
      ...baseStringSchema("User's first name"),
      nullable: true,
    },
    lastName: {
      ...baseStringSchema("User's last name"),
      nullable: true,
    },
    avatar: {
      ...baseStringSchema("User's avatar"),
      nullable: true,
    },
  },
  nullable: true,
};

const baseExchangeOrderSchema = {
  id,
  referenceId,
  userId,
  status,
  symbol,
  type,
  timeInForce,
  side,
  price,
  amount,
  fee,
  feeCurrency,
  user,
};

// Full schema for an exchange order including user details
export const orderSchema = {
  ...baseExchangeOrderSchema,
  id: {
    ...baseStringSchema("ID of the created exchange order"),
    nullable: false, // ID should always be present for a created order
  },
};

// Schema for updating an exchange order
export const exchangeOrderUpdateSchema = {
  type: "object",
  properties: {
    referenceId,
    symbol,
    type,
    timeInForce,
    status,
    side,
    price,
    amount,
    feeCurrency,
    fee,
  },
  required: [
    "referenceId",
    "status",
    "symbol",
    "type",
    "timeInForce",
    "side",
    "price",
    "amount",
    "fee",
    "feeCurrency",
  ],
};
