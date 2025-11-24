import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseMlmReferralRewardSchema } from "../utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary:
    "Retrieves detailed information of a specific MLM Referral Reward by ID",
  operationId: "getMlmReferralRewardById",
  tags: ["Admin", "MLM", "Referral Rewards"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the MLM Referral Reward to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "MLM Referral Reward details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseMlmReferralRewardSchema, // Define this schema in your utils if it's not already defined
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("MLM Referral Reward"),
    500: serverErrorResponse,
  },
  permission: "view.affiliate.reward",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  return await getRecord("mlmReferralReward", params.id, [
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
};
