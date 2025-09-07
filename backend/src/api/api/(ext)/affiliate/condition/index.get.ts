// /server/api/mlm/referral-conditions/index.get.ts

import { models } from "@b/db";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { CacheManager } from "@b/utils/cache";

export const metadata: OperationObject = {
  summary:
    "Lists all MLM Referral Conditions with pagination and optional filtering",
  operationId: "listMlmReferralConditions",
  tags: ["MLM", "Referral Conditions"],
  responses: {
    200: {
      description:
        "List of MLM Referral Conditions with pagination information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "number" },
                    title: { type: "string" },
                    description: { type: "string" },
                    reward: { type: "number" },
                    reward_type: { type: "string" },
                    reward_currency: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("MLM Referral Conditions"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const conditions = await models.mlmReferralCondition.findAll({
    where: { status: true },
  });

  // Create a map of condition names and their presence in extensions
  const conditionExtensionMap = new Map<string, boolean>();
  const cacheManager = CacheManager.getInstance();
  const extensions = await cacheManager.getExtensions();
  conditions.forEach((condition) => {
    const conditionMapping: { [key: string]: string } = {
      STAKING_LOYALTY: "staking",
      P2P_TRADE: "p2p",
      AI_INVESTMENT: "ai_investment",
      ICO_CONTRIBUTION: "ico",
      FOREX_INVESTMENT: "forex",
      ECOMMERCE_PURCHASE: "ecommerce",
    };

    if (conditionMapping[condition.name]) {
      conditionExtensionMap.set(
        condition.name,
        extensions.has(conditionMapping[condition.name])
      );
    } else {
      conditionExtensionMap.set(condition.name, true);
    }
  });

  const filteredConditions = conditions.filter((condition) => {
    return conditionExtensionMap.get(condition.name);
  });

  return filteredConditions;
};
