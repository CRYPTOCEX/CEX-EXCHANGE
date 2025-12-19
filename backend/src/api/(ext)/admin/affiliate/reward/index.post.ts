// /api/mlm/referralRewards/store.post.ts

import { storeRecord } from "@b/utils/query";
import {
  mlmReferralRewardStoreSchema,
  mlmReferralRewardUpdateSchema,
} from "./utils";
import { models } from "@b/db";
import {
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Create a new affiliate reward",
  operationId: "createAffiliateReward",
  tags: ["Admin", "Affiliate", "Reward"],
  description:
    "Creates a new affiliate referral reward for a specific referrer and condition. Validates that the referrer exists before creating the reward.",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: mlmReferralRewardUpdateSchema,
      },
    },
  },
  responses: {
    200: mlmReferralRewardStoreSchema,
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse("Referrer"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "create.affiliate.reward",
  logModule: "ADMIN_AFFILIATE",
  logTitle: "Create affiliate reward",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { reward, isClaimed, conditionId, referrerId } = body;

  ctx?.step("Verifying referrer exists");
  const referrer = await models.user.findOne({ where: { id: referrerId } });
  if (!referrer) throw new Error("Referrer not found");

  ctx?.step("Creating reward record");
  const result = await storeRecord({
    model: "mlmReferralReward",
    data: {
      reward,
      isClaimed,
      conditionId,
      referrerId,
    },
  });

  ctx?.success("Reward created successfully");
  return result;
};
