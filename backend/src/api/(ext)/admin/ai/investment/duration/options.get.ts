import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Get AI investment duration options",
  operationId: "getAiInvestmentDurationOptions",
  tags: ["Admin", "AI Investment", "Duration"],
  description:
    "Retrieves all available AI investment durations formatted as selectable options. Returns simplified data structure with ID and formatted name for dropdown/select use.",
  requiresAuth: true,
  logModule: "ADMIN_AI",
  logTitle: "Get AI Investment Duration Options",
  responses: {
    200: {
      description: "AI investment duration options retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                  description: "Unique identifier of the duration",
                },
                name: {
                  type: "string",
                  description:
                    "Formatted duration name (e.g., '30 DAY', '1 MONTH')",
                },
              },
              required: ["id", "name"],
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("AI Investment Duration"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, ctx } = data;
  if (!user?.id) throw createError(401, "Unauthorized");

  try {
  ctx?.step("Get AI Investment Duration Options");

  const durations = await models.aiInvestmentDuration.findAll();
    const formatted = durations.map((duration) => ({
      id: duration.id,
      name: `${duration.duration} ${duration.timeframe}`,
    }));
  ctx?.success("Get AI Investment Duration Options retrieved successfully");
  return formatted;
  } catch (error) {
    throw createError(
      500,
      "An error occurred while fetching AI investment durations"
    );
  }
};
