// /server/api/investment-plan/index.get.ts

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { models } from "@b/db";
import { baseInvestmentPlanSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Lists all investment plans",
  description:
    "Retrieves a list of all available investment plans that are currently active and open for new investments.",
  operationId: "listInvestmentPlans",
  tags: ["Finance", "Investment"],
  responses: {
    200: {
      description: "Investment plans retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: baseInvestmentPlanSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Investment Plan"),
    500: serverErrorResponse,
  },

  requiresAuth: false,
};

export default async () => {
  return (
    await models.investmentPlan.findAll({
      where: {
        status: true,
      },
      include: [
        {
          model: models.investmentDuration,
          as: "durations",
          attributes: ["id", "duration", "timeframe"],
          through: { attributes: [] },
        },
      ],
      attributes: [
        "id",
        "title",
        "description",
        "image",
        "minAmount",
        "maxAmount",
        "profitPercentage",
        "currency",
        "walletType",
        "trending",
      ],
    })
  ).map((plan) => plan.get({ plain: true }));
};
