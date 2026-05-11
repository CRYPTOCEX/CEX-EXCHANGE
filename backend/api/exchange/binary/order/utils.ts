import {
  baseStringSchema,
  baseNumberSchema,
  baseBooleanSchema,
  baseDateTimeSchema,
} from "@b/utils/schema";

export const baseBinaryOrderSchema = {
  id: baseStringSchema(
    "ID of the binary order",
    undefined,
    undefined,
    false,
    undefined,
    "uuid"
  ),
  userId: baseStringSchema("User ID associated with the order"),
  symbol: baseStringSchema("Trading symbol"),
  price: baseNumberSchema("Entry price of the order"),
  amount: baseNumberSchema("Amount of the order"),
  profit: baseNumberSchema("Profit from the order"),
  side: baseStringSchema("Side of the order (e.g., BUY, SELL)"),
  type: baseStringSchema("Type of order (e.g., LIMIT, MARKET)"),
  status: baseStringSchema("Status of the order (e.g., OPEN, CLOSED)"),
  isDemo: baseBooleanSchema("Whether the order is a demo"),
  closedAt: baseDateTimeSchema("Time when the order was closed", true),
  closePrice: baseNumberSchema("Price at which the order was closed"),
  createdAt: baseDateTimeSchema("Creation date of the order"),
  updatedAt: baseDateTimeSchema("Last update date of the order", true),
};
