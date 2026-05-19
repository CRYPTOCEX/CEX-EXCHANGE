"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mlmReferralConditionStoreSchema = exports.mlmReferralConditionUpdateSchema = exports.baseMlmReferralConditionSchema = exports.mlmReferralConditionSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the MLM Referral Condition");
const name = (0, schema_1.baseStringSchema)("Name of the MLM Referral Condition");
const title = (0, schema_1.baseStringSchema)("Title of the MLM Referral Condition");
const description = (0, schema_1.baseStringSchema)("Description of the MLM Referral Condition");
const type = (0, schema_1.baseEnumSchema)("Type of referral condition", [
    "DEPOSIT",
    "TRADE",
    "SPOT_TRADE",
    "BINARY_WIN",
    "INVESTMENT",
    "AI_INVESTMENT",
    "FOREX_INVESTMENT",
    "ICO_CONTRIBUTION",
    "STAKING",
    "ECOMMERCE_PURCHASE",
    "P2P_TRADE",
    "NFT_TRADE",
    "COPY_TRADING",
    "FUTURES_TRADE",
    "TOKEN_PURCHASE",
]);
const minAmount = (0, schema_1.baseNumberSchema)("Minimum transaction amount to trigger this condition");
const reward = (0, schema_1.baseNumberSchema)("Numeric reward value");
const rewardChain = (0, schema_1.baseStringSchema)("Blockchain used for the reward");
const rewardType = (0, schema_1.baseEnumSchema)("Type of reward", ["PERCENTAGE", "FIXED"]);
const rewardWalletType = (0, schema_1.baseEnumSchema)("Wallet type for the reward", [
    "FIAT",
    "SPOT",
    "ECO",
]);
const rewardCurrency = (0, schema_1.baseStringSchema)("Currency of the reward");
const status = (0, schema_1.baseBooleanSchema)("Status of the MLM Referral Condition");
const createdAt = (0, schema_1.baseDateTimeSchema)("Creation date of the MLM Referral Condition");
const updatedAt = (0, schema_1.baseDateTimeSchema)("Last update date of the MLM Referral Condition", true);
const deletedAt = (0, schema_1.baseDateTimeSchema)("Deletion date of the MLM Referral Condition, if any", true);
const image = (0, schema_1.baseStringSchema)("Image URL of the MLM Referral Condition", 1000, 0, true);
exports.mlmReferralConditionSchema = {
    id,
    name,
    title,
    description,
    type,
    reward,
    rewardType,
    rewardWalletType,
    rewardCurrency,
    rewardChain,
    minAmount,
    image,
    status,
    createdAt,
    updatedAt,
};
exports.baseMlmReferralConditionSchema = {
    id,
    name,
    title,
    description,
    type,
    reward,
    rewardType,
    rewardWalletType,
    rewardCurrency,
    rewardChain,
    minAmount,
    image,
    status,
    createdAt,
    updatedAt,
    deletedAt,
};
exports.mlmReferralConditionUpdateSchema = {
    type: "object",
    properties: {
        title,
        description,
        reward,
        rewardType,
        rewardWalletType,
        rewardCurrency,
        rewardChain,
        minAmount,
        image,
        status,
    },
    required: [],
};
exports.mlmReferralConditionStoreSchema = {
    description: `MLM Referral Condition created or updated successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.mlmReferralConditionSchema,
            },
        },
    },
};
