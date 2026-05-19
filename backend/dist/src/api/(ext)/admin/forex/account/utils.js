"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.forexAccountStoreSchema = exports.forexAccountUpdateSchema = exports.baseForexAccountSchema = exports.forexAccountSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the Forex account");
const userId = (0, schema_1.baseStringSchema)("User ID associated with the Forex account");
const accountId = (0, schema_1.baseStringSchema)("Account ID of the Forex account");
const password = (0, schema_1.baseStringSchema)("Password for the Forex account", 191, 6, true);
const broker = (0, schema_1.baseStringSchema)("Broker of the Forex account");
const mt = (0, schema_1.baseEnumSchema)("MT version of the Forex account", ["4", "5"]);
const balance = (0, schema_1.baseIntegerSchema)("Current balance in the Forex account");
const leverage = (0, schema_1.baseIntegerSchema)("Leverage used in the Forex account");
const type = (0, schema_1.baseEnumSchema)("Type of Forex account", ["DEMO", "LIVE"]);
const status = (0, schema_1.baseBooleanSchema)("Status of the Forex account");
const createdAt = (0, schema_1.baseDateTimeSchema)("Creation date of the Forex account");
const updatedAt = (0, schema_1.baseDateTimeSchema)("Last update date of the Forex account");
const deletedAt = (0, schema_1.baseDateTimeSchema)("Deletion date of the Forex account", true);
exports.forexAccountSchema = {
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
exports.baseForexAccountSchema = {
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
exports.forexAccountUpdateSchema = {
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
exports.forexAccountStoreSchema = {
    description: `Forex account created or updated successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.baseForexAccountSchema,
            },
        },
    },
};
