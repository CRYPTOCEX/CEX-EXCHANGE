import {
  baseStringSchema,
  baseBooleanSchema,
  baseDateTimeSchema,
  baseNumberSchema,
} from "@b/utils/schema";

const id = baseStringSchema("ID of the MLM Referral Reward");
const reward = baseNumberSchema("Amount of the reward");
const isClaimed = baseBooleanSchema("Whether the reward has been claimed");
const conditionId = baseStringSchema(
  "ID of the MLM Referral Condition associated with the reward"
);
const referrerId = baseStringSchema("ID of the user who referred another user");
const createdAt = baseDateTimeSchema(
  "Creation date of the MLM Referral Reward"
);
const updatedAt = baseDateTimeSchema(
  "Last update date of the MLM Referral Reward",
  true
);
const deletedAt = baseDateTimeSchema(
  "Deletion date of the MLM Referral Reward, if any"
);

export const mlmReferralRewardSchema = {
  id,
  reward,
  isClaimed,
  conditionId,
  referrerId,
  createdAt,
  updatedAt,
};

export const baseMlmReferralRewardSchema = {
  id,
  reward,
  isClaimed,
  conditionId,
  referrerId,
  createdAt,
  updatedAt,
  deletedAt,
};

export const mlmReferralRewardUpdateSchema = {
  type: "object",
  properties: {
    reward,
    isClaimed,
  },
  required: ["reward", "isClaimed"],
};

export const mlmReferralRewardStoreSchema = {
  description: `MLM Referral Reward created or updated successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: baseMlmReferralRewardSchema,
      },
    },
  },
};
