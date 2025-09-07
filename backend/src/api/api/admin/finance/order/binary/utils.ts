import {
  baseBooleanSchema,
  baseEnumSchema,
  baseNumberSchema,
  baseStringSchema,
} from "@b/utils/schema";

// Reusable schema components
const id = {
  ...baseStringSchema("ID of the binary order"),
  nullable: true,
};
const userId = {
  ...baseStringSchema("User ID associated with the order"),
  nullable: true,
};
const symbol = baseStringSchema("Trading symbol");
const price = baseNumberSchema("Price at order placement");
const amount = baseNumberSchema("Amount traded");
const profit = baseNumberSchema("Profit from the order");
const side = baseEnumSchema("Side of the order", ["RISE", "FALL"]);
const type = baseEnumSchema("Type of the order", ["RISE_FALL"]);
const status = baseEnumSchema("Status of the order", [
  "PENDING",
  "WIN",
  "LOSS",
  "DRAW",
]);
const isDemo = baseBooleanSchema("Flag indicating if the order is a demo");
const closePrice = {
  ...baseNumberSchema("Price at order close"),
  nullable: true,
};

// Base schema definition for binary orders
export const baseBinaryOrderSchema = {
  id,
  userId,
  symbol,
  price,
  amount,
  profit,
  side,
  type,
  status,
  isDemo,
  closePrice,
};

// Schema for full details including user information
export const orderSchema = {
  ...baseBinaryOrderSchema,
  user: {
    type: "object",
    properties: {
      id: { type: "string", description: "User ID" },
      firstName: {
        type: "string",
        description: "User's first name",
        nullable: true,
      },
      lastName: {
        type: "string",
        description: "User's last name",
        nullable: true,
      },
      avatar: {
        type: "string",
        description: "User's avatar",
        nullable: true,
      },
    },
    nullable: true,
  },
};

// Schema for updating a binary order
export const binaryOrderUpdateSchema = {
  type: "object",
  properties: {
    symbol,
    price,
    amount,
    profit,
    side,
    type,
    status,
    isDemo,
    closePrice,
  },
  required: ["symbol", "price", "amount", "side", "status", "closePrice"],
};
