"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.investmentDurationStoreSchema = exports.investmentDurationUpdateSchema = exports.baseInvestmentDurationSchema = exports.investmentDurationSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the Investment Duration");
const duration = (0, schema_1.baseIntegerSchema)("Duration in time units");
const timeframe = (0, schema_1.baseEnumSchema)("Unit of time for duration", [
    "HOUR",
    "DAY",
    "WEEK",
    "MONTH",
]);
exports.investmentDurationSchema = {
    id,
    duration,
    timeframe,
};
exports.baseInvestmentDurationSchema = {
    id,
    duration,
    timeframe,
};
exports.investmentDurationUpdateSchema = {
    type: "object",
    properties: {
        duration,
        timeframe,
    },
    required: ["duration", "timeframe"],
};
exports.investmentDurationStoreSchema = {
    description: `Investment Duration created or updated successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.baseInvestmentDurationSchema,
            },
        },
    },
};
