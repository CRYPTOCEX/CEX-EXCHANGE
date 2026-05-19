"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiInvestmentPlanStoreSchema = exports.aiInvestmentPlanUpdateSchema = exports.baseAIInvestmentPlanSchema = exports.aiInvestmentPlanSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the AI Investment Plan");
const name = (0, schema_1.baseStringSchema)("Name of the AI Investment Plan", 191);
const title = (0, schema_1.baseStringSchema)("Title of the AI Investment Plan", 191);
const description = (0, schema_1.baseStringSchema)("Description of the AI Investment Plan", 500, 0, true);
const image = (0, schema_1.baseStringSchema)("URL to an image representing the AI Investment Plan", 1000, 0, true);
const status = (0, schema_1.baseBooleanSchema)("Current status of the AI Investment Plan");
const invested = (0, schema_1.baseNumberSchema)("Total amount invested in the AI Investment Plan");
const profitPercentage = (0, schema_1.baseNumberSchema)("Profit percentage of the AI Investment Plan");
const minProfit = (0, schema_1.baseNumberSchema)("Minimum profit of the AI Investment Plan");
const maxProfit = (0, schema_1.baseNumberSchema)("Maximum profit of the AI Investment Plan");
const minAmount = (0, schema_1.baseNumberSchema)("Minimum amount required to join the AI Investment Plan");
const maxAmount = (0, schema_1.baseNumberSchema)("Maximum amount allowed in the AI Investment Plan");
const trending = (0, schema_1.baseBooleanSchema)("Is the AI Investment Plan trending?");
const defaultProfit = (0, schema_1.baseNumberSchema)("Default profit for the AI Investment Plan");
const defaultResult = (0, schema_1.baseEnumSchema)("Default result for the AI Investment Plan", ["WIN", "LOSS", "DRAW"]);
const durations = {
    type: "array",
    description: "Array of Investment Plan Duration IDs",
};
exports.aiInvestmentPlanSchema = {
    id,
    name,
    title,
    description,
    image,
    status,
    invested,
    profitPercentage,
    minProfit,
    maxProfit,
    minAmount,
    maxAmount,
    durations,
    trending,
    defaultProfit,
    defaultResult,
};
exports.baseAIInvestmentPlanSchema = {
    id,
    name,
    title,
    description,
    image,
    status,
    invested,
    profitPercentage,
    minProfit,
    maxProfit,
    minAmount,
    maxAmount,
    trending,
    defaultProfit,
    defaultResult,
    durations,
};
exports.aiInvestmentPlanUpdateSchema = {
    type: "object",
    properties: {
        name,
        title,
        description,
        image,
        status,
        invested,
        profitPercentage,
        minProfit,
        maxProfit,
        minAmount,
        maxAmount,
        trending,
        defaultProfit,
        defaultResult,
        durations,
    },
    required: [
        "name",
        "title",
        "invested",
        "profitPercentage",
        "minProfit",
        "maxProfit",
        "minAmount",
        "maxAmount",
        "defaultProfit",
        "defaultResult",
    ],
};
exports.aiInvestmentPlanStoreSchema = {
    description: `AI Investment Plan created or updated successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.baseAIInvestmentPlanSchema,
            },
        },
    },
};
