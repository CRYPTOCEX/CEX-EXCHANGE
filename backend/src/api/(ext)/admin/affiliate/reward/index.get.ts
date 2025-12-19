// /server/api/mlm/referral-rewards/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import { getFiltered } from "@b/utils/query";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";
import { mlmReferralRewardSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "List all affiliate rewards",
  operationId: "listAffiliateRewards",
  tags: ["Admin", "Affiliate", "Reward"],
  description:
    "Retrieves a paginated list of all affiliate referral rewards with optional filtering and sorting. Includes related referrer user details and referral condition information.",
  parameters: crudParameters,
  responses: {
    200: {
      description: "Affiliate rewards retrieved successfully with pagination",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
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
    404: notFoundResponse("Affiliate Rewards"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.affiliate.reward",
  logModule: "ADMIN_AFFILIATE",
  logTitle: "List affiliate rewards",
  demoMask: ["items.referrer.email"],
};

export default async (data: Handler) => {
  const { query, ctx } = data;

  ctx?.step("Fetching affiliate rewards with related data");
  const result = getFiltered({
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

  ctx?.success("Rewards fetched successfully");
  return result;
};
