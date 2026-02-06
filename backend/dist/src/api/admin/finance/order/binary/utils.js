"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.binaryOrderUpdateSchema = exports.orderSchema = exports.baseBinaryOrderSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = {
    ...(0, schema_1.baseStringSchema)("ID of the binary order"),
    nullable: true,
};
const userId = {
    ...(0, schema_1.baseStringSchema)("User ID associated with the order"),
    nullable: true,
};
const symbol = (0, schema_1.baseStringSchema)("Trading symbol");
const price = (0, schema_1.baseNumberSchema)("Price at order placement");
const amount = (0, schema_1.baseNumberSchema)("Amount traded");
const profit = (0, schema_1.baseNumberSchema)("Profit from the order");
const side = (0, schema_1.baseEnumSchema)("Side of the order", ["RISE", "FALL"]);
const type = (0, schema_1.baseEnumSchema)("Type of the order", ["RISE_FALL"]);
const status = (0, schema_1.baseEnumSchema)("Status of the order", [
    "PENDING",
    "WIN",
    "LOSS",
    "DRAW",
]);
const isDemo = (0, schema_1.baseBooleanSchema)("Flag indicating if the order is a demo");
const closePrice = {
    ...(0, schema_1.baseNumberSchema)("Price at order close"),
    nullable: true,
};
exports.baseBinaryOrderSchema = {
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
exports.orderSchema = {
    ...exports.baseBinaryOrderSchema,
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
exports.binaryOrderUpdateSchema = {
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
