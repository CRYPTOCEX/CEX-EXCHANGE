import { models } from "@b/db";
import { createError } from "@b/utils/error";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseInvestmentSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Retrieves all investments for the logged-in user",
  description:
    "Fetches all AI trading investments for the currently authenticated user, excluding active investments.",
  operationId: "getAllInvestments",
  tags: ["AI Trading"],
  responses: {
    200: {
      description: "Investments retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: baseInvestmentSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("AI Investment"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  const investments = await models.aiInvestment.findAll({
    where: {
      userId: user.id,
    },
    include: [
      {
        model: models.aiInvestmentPlan,
        as: "plan",
        attributes: ["title"],
      },
      {
        model: models.aiInvestmentDuration,
        as: "duration",
        attributes: ["duration", "timeframe"],
      },
    ],
    attributes: [
      "id",
      "symbol",
      "type",
      "amount",
      "profit",
      "result",
      "status",
      "createdAt",
    ],
    order: [
      ["status", "ASC"],
      ["createdAt", "ASC"],
    ],
  });
  return investments;
};
