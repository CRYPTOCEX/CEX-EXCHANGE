// /server/api/investment-plan/show.get.ts

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { models } from "@b/db";
import { baseInvestmentPlanSchema } from "../../utils";

export const metadata: OperationObject = {
  summary: "Retrieves a single investment plan by ID",
  description:
    "Fetches detailed information about a specific investment plan based on its unique identifier.",
  operationId: "getInvestmentPlan",
  tags: ["Finance", "Investment"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "The ID of the investment plan to retrieve",
      schema: { type: "number" },
    },
  ],
  responses: {
    200: {
      description: "Investment plan retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseInvestmentPlanSchema,
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

export default async (data: Handler) => {
  const plan = await models.investmentPlan.findOne({
    where: {
      id: data.params.id,
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
  });

  if (!plan) {
    throw createError(404, "Investment plan not found");
  }

  return plan.get({ plain: true });
};
