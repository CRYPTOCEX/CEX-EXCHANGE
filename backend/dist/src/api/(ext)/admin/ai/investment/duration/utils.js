"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiInvestmentDurationStoreSchema = exports.aiInvestmentDurationUpdateSchema = exports.baseAIInvestmentDurationSchema = exports.aiInvestmentDurationSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the AI Investment Duration");
const duration = (0, schema_1.baseIntegerSchema)("Duration of the investment period");
const timeframe = (0, schema_1.baseEnumSchema)("Timeframe of the investment duration", [
    "HOUR",
    "DAY",
    "WEEK",
    "MONTH",
]);
exports.aiInvestmentDurationSchema = {
    id,
    duration,
    timeframe,
};
exports.baseAIInvestmentDurationSchema = {
    id,
    duration,
    timeframe,
};
exports.aiInvestmentDurationUpdateSchema = {
    type: "object",
    properties: {
        duration,
        timeframe,
    },
    required: ["duration", "timeframe"],
};
exports.aiInvestmentDurationStoreSchema = {
    description: `AI Investment Duration created or updated successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.baseAIInvestmentDurationSchema,
            },
        },
    },
};
