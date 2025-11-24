import { models } from "@b/db";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseTradingPlanSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Retrieves all active AI trading plans",
  description:
    "Fetches all active AI trading plans available for users to invest in, including details about each plan and its associated durations.",
  operationId: "getAiTradingPlans",
  tags: ["AI Trading Plans"],
  responses: {
    200: {
      description: "AI trading plans retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: baseTradingPlanSchema,
              required: [
                "id",
                "title",
                "description",
                "minAmount",
                "maxAmount",
                "status",
              ],
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("AI Investment Plan"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const plans = await models.aiInvestmentPlan.findAll({
    where: { status: true },
    include: [
      {
        model: models.aiInvestmentDuration,
        as: "durations",
        through: { attributes: [] },
        attributes: ["id", "duration", "timeframe"],
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
      "invested",
      "trending",
      "status",
    ],
  });
  return plans;
};
