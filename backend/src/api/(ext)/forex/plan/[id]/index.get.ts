import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseForexPlanSchema } from "../../utils";

export const metadata = {
  summary: "Retrieve specific Forex Investment Plan",
  description:
    "Fetches details of a specific Forex investment plan for the logged-in user along with available durations, plus the total number of distinct investors and the total invested amount.",
  operationId: "getForexPlanById",
  tags: ["Forex", "Plan"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string", description: "Forex investment plan ID" },
    },
  ],
  responses: {
    200: {
      description: "Forex plan retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              ...baseForexPlanSchema,
              durations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    duration: { type: "number" },
                    timeframe: { type: "string" },
                  },
                },
              },
              totalInvestors: {
                type: "number",
                description: "Total distinct users who invested in this plan",
              },
              invested: {
                type: "number",
                description: "Total invested amount in this plan",
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Forex Plan"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

interface Handler {
  user?: { id: string; [key: string]: any };
  params: { id: string };
}

export default async (data: Handler) => {
  const { user, params } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { id } = params;

  try {
    const plan = await models.forexPlan.findOne({
      where: { id, status: true },
      include: [
        {
          model: models.forexDuration,
          as: "durations",
          attributes: ["id", "duration", "timeframe"],
          through: { attributes: [] },
        },
      ],
      // Only select fields that should be returned to the user.
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
      throw createError({ statusCode: 404, message: "Forex Plan not found" });
    }

    // Count distinct investors for this plan.
    const totalInvestors = await models.forexInvestment.count({
      where: { planId: id },
      distinct: true,
      col: "userId",
    });

    // Calculate the total invested amount by summing the "amount" field for all investments in this plan.
    const invested = await models.forexInvestment.sum("amount", {
      where: { planId: id },
    });

    const planJson = plan.toJSON();
    planJson.totalInvestors = totalInvestors || 0;
    planJson.invested = invested || 0;

    return planJson;
  } catch (error) {
    console.error("Error fetching forex plan:", error);
    throw createError({ statusCode: 500, message: "Internal Server Error" });
  }
};
