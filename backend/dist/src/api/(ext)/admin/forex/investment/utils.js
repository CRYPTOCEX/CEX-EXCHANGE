"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.forexInvestmentStoreSchema = exports.forexInvestmentUpdateSchema = exports.baseForexInvestmentSchema = exports.forexInvestmentSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the Forex Investment");
const userId = (0, schema_1.baseStringSchema)("ID of the User");
const planId = (0, schema_1.baseStringSchema)("ID of the Forex Plan", 191, 0, true);
const durationId = (0, schema_1.baseStringSchema)("ID of the Forex Duration", 191, 0, true);
const amount = (0, schema_1.baseNumberSchema)("Invested Amount");
const profit = (0, schema_1.baseNumberSchema)("Profit from Investment");
const result = (0, schema_1.baseEnumSchema)("Result of the Investment", [
    "WIN",
    "LOSS",
    "DRAW",
]);
const status = (0, schema_1.baseEnumSchema)("Status of the Investment", [
    "ACTIVE",
    "COMPLETED",
    "CANCELLED",
    "REJECTED",
]);
const endDate = (0, schema_1.baseDateTimeSchema)("End Date of the Investment");
const createdAt = (0, schema_1.baseDateTimeSchema)("Creation Date of the Investment");
const updatedAt = (0, schema_1.baseDateTimeSchema)("Last Update Date of the Investment");
const deletedAt = (0, schema_1.baseDateTimeSchema)("Deletion Date of the Investment", true);
exports.forexInvestmentSchema = {
    id,
    userId,
    planId,
    durationId,
    amount,
    profit,
    result,
    status,
    endDate,
    createdAt,
    updatedAt,
    deletedAt,
};
exports.baseForexInvestmentSchema = {
    id,
    userId,
    planId,
    durationId,
    amount,
    profit,
    result,
    status,
    endDate,
    createdAt,
    updatedAt,
    deletedAt,
};
exports.forexInvestmentUpdateSchema = {
    type: "object",
    properties: {
        userId,
        planId,
        durationId,
        amount,
        profit,
        result,
        status,
        endDate,
    },
    required: ["status"],
};
exports.forexInvestmentStoreSchema = {
    description: `Forex Investment created or updated successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.baseForexInvestmentSchema,
            },
        },
    },
};
