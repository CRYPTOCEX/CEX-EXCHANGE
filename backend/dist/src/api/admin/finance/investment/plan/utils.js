"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.investmentPlanStoreSchema = exports.investmentPlanUpdateSchema = exports.baseInvestmentPlanSchema = exports.investmentPlanSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the Investment Plan");
const name = (0, schema_1.baseStringSchema)("Name of the Investment Plan", 191);
const title = (0, schema_1.baseStringSchema)("Title of the Investment Plan", 191, 0, true);
const description = (0, schema_1.baseStringSchema)("Description of the Investment Plan", 191, 0, true);
const image = (0, schema_1.baseStringSchema)("Image URL of the Investment Plan", 191, 0, true);
const minProfit = (0, schema_1.baseNumberSchema)("Minimum Profit");
const maxProfit = (0, schema_1.baseNumberSchema)("Maximum Profit");
const minAmount = (0, schema_1.baseNumberSchema)("Minimum Amount", true);
const maxAmount = (0, schema_1.baseNumberSchema)("Maximum Amount", true);
const invested = (0, schema_1.baseNumberSchema)("Total Invested");
const profitPercentage = (0, schema_1.baseNumberSchema)("Profit Percentage");
const status = (0, schema_1.baseBooleanSchema)("Status of the Plan");
const defaultProfit = (0, schema_1.baseNumberSchema)("Default Profit");
const defaultResult = (0, schema_1.baseEnumSchema)("Default Result of the Plan", [
    "WIN",
    "LOSS",
    "DRAW",
]);
const trending = (0, schema_1.baseBooleanSchema)("Trending Status of the Plan");
const durations = {
    type: "array",
    description: "Array of Investment Plan Duration IDs",
};
const createdAt = (0, schema_1.baseDateTimeSchema)("Creation Date of the Plan");
const updatedAt = (0, schema_1.baseDateTimeSchema)("Last Update Date of the Plan", true);
const deletedAt = (0, schema_1.baseDateTimeSchema)("Deletion Date of the Plan", true);
const currency = (0, schema_1.baseStringSchema)("Currency of the Investment Plan");
const walletType = (0, schema_1.baseStringSchema)("Wallet Type of the Investment Plan");
exports.investmentPlanSchema = {
    id,
    name,
    title,
    description,
    image,
    minProfit,
    maxProfit,
    minAmount,
    maxAmount,
    invested,
    profitPercentage,
    status,
    defaultProfit,
    defaultResult,
    trending,
    durations,
    currency,
    walletType,
    createdAt,
    updatedAt,
    deletedAt,
};
exports.baseInvestmentPlanSchema = {
    id,
    name,
    title,
    description,
    image,
    minProfit,
    maxProfit,
    minAmount,
    maxAmount,
    invested,
    profitPercentage,
    status,
    defaultProfit,
    defaultResult,
    trending,
    durations,
    currency,
    walletType,
    createdAt,
    updatedAt,
    deletedAt,
};
exports.investmentPlanUpdateSchema = {
    type: "object",
    properties: {
        name,
        title,
        description,
        image,
        minProfit,
        maxProfit,
        minAmount,
        maxAmount,
        invested,
        profitPercentage,
        status,
        defaultProfit,
        defaultResult,
        trending,
        durations,
        currency,
        walletType,
    },
    required: ["name"],
};
exports.investmentPlanStoreSchema = {
    description: `Investment Plan created or updated successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.baseInvestmentPlanSchema,
            },
        },
    },
};
