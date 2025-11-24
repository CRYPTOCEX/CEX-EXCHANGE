import { models } from "@b/db";
import { createError } from "@b/utils/error";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseForexInvestmentSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Retrieves active Forex investments for the logged-in user",
  description:
    "Fetches active Forex investments associated with the currently authenticated user.",
  operationId: "getActiveForexInvestments",
  tags: ["Forex", "Investments"],
  responses: {
    200: {
      description: "Active Forex investments retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: baseForexInvestmentSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Forex Investment"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const activeInvestments = await models.forexInvestment.findAll({
    where: { userId: user.id, status: "ACTIVE" },
    include: [
      {
        model: models.forexPlan,
        as: "plan",
        attributes: [
          "id",
          "name",
          "title",
          "description",
          "profitPercentage",
          "image",
        ],
      },
      {
        model: models.user,
        as: "user",
        attributes: ["id", "avatar", "firstName", "lastName"],
      },
      {
        model: models.forexDuration,
        as: "duration",
        attributes: ["id", "duration", "timeframe"],
      },
    ],
  });

  return activeInvestments;
};
