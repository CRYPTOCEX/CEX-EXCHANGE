"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.investmentStoreSchema = exports.investmentUpdateSchema = exports.baseInvestmentSchema = exports.investmentSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the Investment");
const userId = (0, schema_1.baseStringSchema)("ID of the User");
const planId = (0, schema_1.baseStringSchema)("ID of the General Plan", 191, 0, true);
const durationId = (0, schema_1.baseStringSchema)("ID of the General Duration", 191, 0, true);
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
exports.investmentSchema = {
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
exports.baseInvestmentSchema = {
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
exports.investmentUpdateSchema = {
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
exports.investmentStoreSchema = {
    description: `Investment created or updated successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.baseInvestmentSchema,
            },
        },
    },
};
