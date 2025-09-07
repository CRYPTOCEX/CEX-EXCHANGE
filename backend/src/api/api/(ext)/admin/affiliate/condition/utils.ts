import {
  baseDateTimeSchema,
  baseStringSchema,
  baseNumberSchema,
  baseEnumSchema,
  baseBooleanSchema,
} from "@b/utils/schema";

const id = baseStringSchema("ID of the MLM Referral Condition");
const name = baseStringSchema("Name of the MLM Referral Condition");
const title = baseStringSchema("Title of the MLM Referral Condition");
const description = baseStringSchema(
  "Description of the MLM Referral Condition"
);
const type = baseEnumSchema("Type of referral condition", [
  "DEPOSIT",
  "TRADE",
  "INVESTMENT",
  "BINARY_WIN",
  "AI_INVESTMENT",
  "FOREX_INVESTMENT",
  "ICO_CONTRIBUTION",
  "STAKING",
  "ECOMMERCE_PURCHASE",
  "P2P_TRADE",
]);
const reward = baseNumberSchema("Numeric reward value");
const rewardChain = baseStringSchema("Blockchain used for the reward");
const rewardType = baseEnumSchema("Type of reward", ["PERCENTAGE", "FIXED"]);
const rewardWalletType = baseEnumSchema("Wallet type for the reward", [
  "FIAT",
  "SPOT",
  "ECO",
]);
const rewardCurrency = baseStringSchema("Currency of the reward");
const status = baseBooleanSchema("Status of the MLM Referral Condition");
const createdAt = baseDateTimeSchema(
  "Creation date of the MLM Referral Condition"
);
const updatedAt = baseDateTimeSchema(
  "Last update date of the MLM Referral Condition",
  true
);
const deletedAt = baseDateTimeSchema(
  "Deletion date of the MLM Referral Condition, if any",
  true
);
const image = baseStringSchema(
  "Image URL of the MLM Referral Condition",
  1000,
  0,
  true
);

export const mlmReferralConditionSchema = {
  id,
  name,
  title,
  description,
  reward,
  rewardType,
  rewardWalletType,
  rewardCurrency,
  image,
  status,
  createdAt,
  updatedAt,
};

export const baseMlmReferralConditionSchema = {
  id,
  name,
  title,
  description,
  reward,
  rewardType,
  rewardWalletType,
  rewardCurrency,
  rewardChain,
  image,
  status,
  createdAt,
  updatedAt,
  deletedAt,
};

export const mlmReferralConditionUpdateSchema = {
  type: "object",
  properties: {
    id,
    name,
    title,
    description,
    reward,
    rewardType,
    rewardWalletType,
    rewardCurrency,
    rewardChain,
    image,
    status,
    createdAt,
    updatedAt,
  },
  required: ["reward", "rewardType", "rewardWalletType", "rewardCurrency"],
};

export const mlmReferralConditionStoreSchema = {
  description: `MLM Referral Condition created or updated successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: mlmReferralConditionSchema,
      },
    },
  },
};
