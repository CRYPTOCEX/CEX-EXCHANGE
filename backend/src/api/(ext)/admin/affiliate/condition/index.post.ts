// /api/mlm/referralConditions/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import {
  mlmReferralConditionStoreSchema,
  mlmReferralConditionUpdateSchema,
} from "./utils";

export const metadata: OperationObject = {
  summary: "Creates a new affiliate condition",
  description:
    "Creates a new affiliate condition with specified reward parameters. Conditions define how affiliates earn rewards based on referral actions such as deposits, trades, investments, and more. Supports various reward types (percentage or fixed) and wallet types (FIAT, SPOT, ECO).",
  operationId: "createAffiliateCondition",
  tags: ["Admin", "Affiliate", "Condition"],
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
    "Affiliate Condition"
  ),
  requiresAuth: true,
  permission: "create.affiliate.condition",
  logModule: "ADMIN_AFFILIATE",
  logTitle: "Create affiliate condition",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
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

  ctx?.step("Validating condition data");

  ctx?.step("Creating condition record");
  const result = await storeRecord({
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

  ctx?.success("Condition created successfully");
  return result;
};
