// /server/api/mlm/referral-rewards/index.get.ts

import { mlmReferralRewardSchema } from "@b/api/(ext)/admin/affiliate/reward/utils";
import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import { createError } from "@b/utils/error";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary:
    "Lists all MLM Referral Rewards with pagination and optional filtering",
  operationId: "listMlmReferralRewards",
  tags: ["MLM", "Referral Rewards"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "List of MLM Referral Rewards with pagination information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: mlmReferralRewardSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("MLM Referral Rewards"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user, query } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  // Call the generic fetch function
  return getFiltered({
    model: models.mlmReferralReward,
    query,
    where: { referrerId: user.id },
    sortField: query.sortField || "createdAt",
    includeModels: [
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
    ],
  });
};
