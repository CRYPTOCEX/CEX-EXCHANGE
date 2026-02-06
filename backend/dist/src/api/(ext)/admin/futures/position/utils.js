"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.positionSchema = exports.baseFuturesPositionSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = {
    ...(0, schema_1.baseStringSchema)("ID of the futures position"),
    nullable: true,
};
const userId = {
    ...(0, schema_1.baseStringSchema)("User ID associated with the position"),
    nullable: true,
};
const status = {
    ...(0, schema_1.baseStringSchema)("Current status of the position"),
    enum: ["OPEN", "CLOSED", "CANCELLED"],
};
const symbol = (0, schema_1.baseStringSchema)("Trading symbol of the position");
const side = {
    ...(0, schema_1.baseStringSchema)("Side of the position (BUY, SELL)"),
    enum: ["BUY", "SELL"],
};
const entryPrice = (0, schema_1.baseNumberSchema)("Entry price of the position");
const amount = (0, schema_1.baseNumberSchema)("Amount traded in the position");
const leverage = (0, schema_1.baseNumberSchema)("Leverage used in the position");
const unrealizedPnl = (0, schema_1.baseNumberSchema)("Unrealized profit or loss of the position");
const stopLossPrice = (0, schema_1.baseNumberSchema)("Stop loss price of the position");
const takeProfitPrice = (0, schema_1.baseNumberSchema)("Take profit price of the position");
const user = {
    type: "object",
    properties: {
        id: { type: "string", description: "User ID" },
        firstName: {
            ...(0, schema_1.baseStringSchema)("User's first name"),
            nullable: true,
        },
        lastName: {
            ...(0, schema_1.baseStringSchema)("User's last name"),
            nullable: true,
        },
        avatar: {
            ...(0, schema_1.baseStringSchema)("User's avatar"),
            nullable: true,
        },
    },
    nullable: true,
};
exports.baseFuturesPositionSchema = {
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
exports.positionSchema = {
    ...exports.baseFuturesPositionSchema,
    id: {
        ...(0, schema_1.baseStringSchema)("ID of the created futures position"),
        nullable: false,
    },
};
