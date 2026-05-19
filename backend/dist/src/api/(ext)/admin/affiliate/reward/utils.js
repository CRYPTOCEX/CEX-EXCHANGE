"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mlmReferralRewardStoreSchema = exports.mlmReferralRewardUpdateSchema = exports.baseMlmReferralRewardSchema = exports.mlmReferralRewardSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the MLM Referral Reward");
const reward = (0, schema_1.baseNumberSchema)("Amount of the reward");
const isClaimed = (0, schema_1.baseBooleanSchema)("Whether the reward has been claimed");
const conditionId = (0, schema_1.baseStringSchema)("ID of the MLM Referral Condition associated with the reward");
const referrerId = (0, schema_1.baseStringSchema)("ID of the user who referred another user");
const createdAt = (0, schema_1.baseDateTimeSchema)("Creation date of the MLM Referral Reward");
const updatedAt = (0, schema_1.baseDateTimeSchema)("Last update date of the MLM Referral Reward", true);
const deletedAt = (0, schema_1.baseDateTimeSchema)("Deletion date of the MLM Referral Reward, if any");
exports.mlmReferralRewardSchema = {
    id,
    reward,
    isClaimed,
    conditionId,
    referrerId,
    createdAt,
    updatedAt,
};
exports.baseMlmReferralRewardSchema = {
    id,
    reward,
    isClaimed,
    conditionId,
    referrerId,
    createdAt,
    updatedAt,
    deletedAt,
};
exports.mlmReferralRewardUpdateSchema = {
    type: "object",
    properties: {
        reward,
        isClaimed,
    },
    required: ["reward", "isClaimed"],
};
exports.mlmReferralRewardStoreSchema = {
    description: `MLM Referral Reward created or updated successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.baseMlmReferralRewardSchema,
            },
        },
    },
};
