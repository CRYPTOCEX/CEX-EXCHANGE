"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiInvestmentStoreSchema = exports.aiInvestmentUpdateSchema = exports.baseAIInvestmentSchema = exports.aiInvestmentSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the AI Investment");
const userId = (0, schema_1.baseStringSchema)("ID of the user associated with the investment");
const planId = (0, schema_1.baseStringSchema)("ID of the investment plan");
const durationId = (0, schema_1.baseStringSchema)("ID of the investment duration");
const symbol = (0, schema_1.baseStringSchema)("Market targeted by the investment");
const amount = (0, schema_1.baseNumberSchema)("Amount invested");
const profit = (0, schema_1.baseNumberSchema)("Profit from the investment", true);
const result = (0, schema_1.baseEnumSchema)("Result of the investment", [
    "WIN",
    "LOSS",
    "DRAW",
]);
const status = (0, schema_1.baseEnumSchema)("Current status of the investment", [
    "ACTIVE",
    "COMPLETED",
    "CANCELLED",
    "REJECTED",
]);
const createdAt = (0, schema_1.baseDateTimeSchema)("Creation date of the investment");
const updatedAt = (0, schema_1.baseDateTimeSchema)("Last update date of the investment", true);
const deletedAt = (0, schema_1.baseDateTimeSchema)("Deletion date of the investment", true);
const type = (0, schema_1.baseEnumSchema)("Type of wallet", ["SPOT", "ECO"]);
exports.aiInvestmentSchema = {
    id,
    userId,
    planId,
    durationId,
    symbol,
    type,
    amount,
    profit,
    result,
    status,
    createdAt,
    updatedAt,
};
exports.baseAIInvestmentSchema = {
    id,
    userId,
    planId,
    durationId,
    symbol,
    type,
    amount,
    profit,
    result,
    status,
    createdAt,
    updatedAt,
    deletedAt,
};
exports.aiInvestmentUpdateSchema = {
    type: "object",
    properties: {
        planId,
        durationId,
        symbol,
        type,
        profit,
        result,
    },
    required: ["planId", "symbol"],
};
exports.aiInvestmentStoreSchema = {
    description: `AI Investment created or updated successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.baseAIInvestmentSchema,
            },
        },
    },
};
