import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Retrieves a list of forex durations",
  description:
    "This endpoint retrieves all available forex durations for selection.",
  operationId: "getForexDurations",
  tags: ["Forex", "Duration"],
  requiresAuth: true,
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
  const { user } = data;
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
