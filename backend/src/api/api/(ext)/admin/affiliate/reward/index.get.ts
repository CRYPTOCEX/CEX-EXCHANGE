// /server/api/mlm/referral-rewards/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { mlmReferralRewardSchema } from "./utils";

export const metadata: OperationObject = {
  summary:
    "Lists all MLM Referral Rewards with pagination and optional filtering",
  operationId: "listMlmReferralRewards",
  tags: ["Admin", "MLM", "Referral Rewards"],
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
  permission: "view.affiliate.reward",
};

export default async (data: Handler) => {
  const { query } = data;

  // Call the generic fetch function
  return getFiltered({
    model: models.mlmReferralReward,
    query,
    sortField: query.sortField || "createdAt",
    includeModels: [
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
    ],
  });
};
