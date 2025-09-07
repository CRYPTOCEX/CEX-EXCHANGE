import { baseNumberSchema, baseStringSchema } from "@b/utils/schema";

const id = {
  ...baseStringSchema("ID of the futures order"),
  nullable: true,
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
  enum: ["OPEN", "CLOSED", "CANCELLED", "PARTIALLY_FILLED"],
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

const baseFuturesOrderSchema = {
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

export const orderSchema = {
  ...baseFuturesOrderSchema,
  id: {
    ...baseStringSchema("ID of the created futures order"),
    nullable: false,
  },
};

export const futuresOrderUpdateSchema = {
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
