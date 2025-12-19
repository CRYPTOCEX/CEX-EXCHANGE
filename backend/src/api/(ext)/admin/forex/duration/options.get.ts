import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Gets Forex duration options",
  description:
    "Retrieves all available Forex durations formatted as selectable options with ID and display name (e.g., '1 HOUR', '7 DAY'). Useful for dropdown selections in forms.",
  operationId: "getForexDurationOptions",
  tags: ["Admin", "Forex", "Duration"],
  requiresAuth: true,
  logModule: "ADMIN_FOREX",
  logTitle: "Get Forex Duration Options",
  responses: {
    200: {
      description: "Forex durations retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("ForexDuration"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, ctx } = data;
  if (!user?.id) throw createError(401, "Unauthorized");

  try {
    const durations = await models.forexDuration.findAll();
    const formatted = durations.map((duration) => ({
      id: duration.id,
      name: `${duration.duration} ${duration.timeframe}`,
    }));
    return formatted;
  } catch (error) {
    throw createError(
      500,
      "An error occurred while fetching forex durations"
    );
  }
};
