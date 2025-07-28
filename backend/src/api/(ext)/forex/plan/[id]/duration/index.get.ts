import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata = {
  summary: "Get durations for a specific Forex plan",
  description: "Retrieves all available durations for a specific forex investment plan",
  operationId: "getForexPlanDurations",
  tags: ["Forex", "Plan", "Duration"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the forex plan",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Plan durations retrieved successfully",
      content: {
        "application/json": {
          schema: {
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
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Forex Plan"),
    500: serverErrorResponse,
  },
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
    // Check if plan exists
    const plan = await models.forexPlan.findOne({
      where: { id, status: true },
    });

    if (!plan) {
      throw createError({ statusCode: 404, message: "Forex Plan not found" });
    }

    // Get durations associated with this plan
    const durations = await models.forexDuration.findAll({
      include: [
        {
          model: models.forexPlan,
          as: "plans",
          where: { id },
          through: { attributes: [] },
          required: true,
        },
      ],
      attributes: ["id", "duration", "timeframe"],
      order: [
        ["timeframe", "ASC"],
        ["duration", "ASC"],
      ],
    });

    return durations;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error fetching plan durations:", error);
    throw createError({ statusCode: 500, message: "Internal Server Error" });
  }
}; 