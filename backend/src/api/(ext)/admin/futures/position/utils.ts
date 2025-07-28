// backend/api/admin/ext/futures/position/utils.ts

import { baseNumberSchema, baseStringSchema } from "@b/utils/schema";

const id = {
  ...baseStringSchema("ID of the futures position"),
  nullable: true,
};
const userId = {
  ...baseStringSchema("User ID associated with the position"),
  nullable: true,
};
const status = {
  ...baseStringSchema("Current status of the position"),
  enum: ["OPEN", "CLOSED", "CANCELLED"],
};
const symbol = baseStringSchema("Trading symbol of the position");
const side = {
  ...baseStringSchema("Side of the position (BUY, SELL)"),
  enum: ["BUY", "SELL"],
};
const entryPrice = baseNumberSchema("Entry price of the position");
const amount = baseNumberSchema("Amount traded in the position");
const leverage = baseNumberSchema("Leverage used in the position");
const unrealizedPnl = baseNumberSchema(
  "Unrealized profit or loss of the position"
);
const stopLossPrice = baseNumberSchema("Stop loss price of the position");
const takeProfitPrice = baseNumberSchema("Take profit price of the position");

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

export const baseFuturesPositionSchema = {
  id,
  userId,
  status,
  symbol,
  side,
  entryPrice,
  amount,
  leverage,
  unrealizedPnl,
  stopLossPrice,
  takeProfitPrice,
  user,
};

export const positionSchema = {
  ...baseFuturesPositionSchema,
  id: {
    ...baseStringSchema("ID of the created futures position"),
    nullable: false,
  },
};
