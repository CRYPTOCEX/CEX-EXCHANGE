"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.forexDurationStoreSchema = exports.forexDurationUpdateSchema = exports.baseForexDurationSchema = exports.forexDurationSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the Forex Duration");
const duration = (0, schema_1.baseIntegerSchema)("Duration in time units");
const timeframe = (0, schema_1.baseEnumSchema)("Unit of time for duration", [
    "HOUR",
    "DAY",
    "WEEK",
    "MONTH",
]);
exports.forexDurationSchema = {
    id,
    duration,
    timeframe,
};
exports.baseForexDurationSchema = {
    id,
    duration,
    timeframe,
};
exports.forexDurationUpdateSchema = {
    type: "object",
    properties: {
        duration,
        timeframe,
    },
    required: ["duration", "timeframe"],
};
exports.forexDurationStoreSchema = {
    description: `Forex Duration created or updated successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.baseForexDurationSchema,
            },
        },
    },
};
