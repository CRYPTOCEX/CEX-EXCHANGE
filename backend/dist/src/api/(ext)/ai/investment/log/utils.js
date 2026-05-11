"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseInvestmentSchema = void 0;
const schema_1 = require("@b/utils/schema");
exports.baseInvestmentSchema = {
    id: (0, schema_1.baseStringSchema)("The unique identifier for the investment"),
    userId: (0, schema_1.baseStringSchema)("User ID associated with the investment"),
    planId: (0, schema_1.baseStringSchema)("Plan ID associated with the investment"),
    durationId: (0, schema_1.baseStringSchema)("Duration ID associated with the investment", 255, 0, true),
    market: (0, schema_1.baseStringSchema)("Market involved in the investment"),
    amount: (0, schema_1.baseNumberSchema)("Amount invested"),
    status: (0, schema_1.baseEnumSchema)("Current status of the investment", [
        "ACTIVE",
        "COMPLETED",
        "CANCELLED",
        "REJECTED",
    ]),
    createdAt: (0, schema_1.baseStringSchema)("Timestamp when the investment was created", undefined, undefined, false, "date-time"),
    updatedAt: (0, schema_1.baseStringSchema)("Timestamp when the investment was last updated", undefined, undefined, true, "date-time"),
};
