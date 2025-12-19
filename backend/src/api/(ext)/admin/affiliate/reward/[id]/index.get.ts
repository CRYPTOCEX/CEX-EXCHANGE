import { getRecord } from "@b/utils/query";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";
import { baseMlmReferralRewardSchema } from "../utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Get affiliate reward by ID",
  operationId: "getAffiliateRewardById",
  tags: ["Admin", "Affiliate", "Reward"],
  description:
    "Retrieves detailed information for a specific affiliate referral reward including the referrer user details and associated referral condition.",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the affiliate reward to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Affiliate reward details retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseMlmReferralRewardSchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundResponse("Affiliate Reward"),
    500: serverErrorResponse,
  },
  permission: "view.affiliate.reward",
  requiresAuth: true,
  logModule: "ADMIN_AFFILIATE",
  logTitle: "Get affiliate reward details",
  demoMask: ["referrer.email"],
};

export default async (data) => {
  const { params, ctx } = data;

  ctx?.step(`Fetching reward with ID: ${params.id}`);
  const result = await getRecord("mlmReferralReward", params.id, [
    {
      model: models.user,
      as: "referrer",
      attributes: ["id", "firstName", "lastName", "email", "avatar"],
    },
    {
      model: models.mlmReferralCondition,
      as: "condition",
      attributes: [
        "title",
        "rewardType",
        "rewardWalletType",
        "rewardCurrency",
        "rewardChain",
      ],
    },
  ]);

  ctx?.success("Reward details retrieved successfully");
  return result;
};
