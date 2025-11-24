// /api/mlm/referralConditions/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import {
  mlmReferralConditionStoreSchema,
  mlmReferralConditionUpdateSchema,
} from "./utils";

export const metadata: OperationObject = {
  summary: "Stores a new MLM Referral Condition",
  operationId: "storeMlmReferralCondition",
  tags: ["Admin", "MLM", "Referral Conditions"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: mlmReferralConditionUpdateSchema,
      },
    },
  },
  responses: storeRecordResponses(
    mlmReferralConditionStoreSchema,
    "MLM Referral Condition"
  ),
  requiresAuth: true,
  permission: "create.affiliate.condition",
};

export default async (data: Handler) => {
  const { body } = data;
  const {
    name,
    title,
    description,
    type,
    reward,
    rewardType,
    rewardWalletType,
    rewardCurrency,
    rewardChain,
    status,
    image,
  } = body;

  return await storeRecord({
    model: "mlmReferralCondition",
    data: {
      name,
      title,
      description,
      type,
      reward,
      rewardType,
      rewardWalletType,
      rewardCurrency,
      rewardChain,
      status,
      image,
    },
  });
};
