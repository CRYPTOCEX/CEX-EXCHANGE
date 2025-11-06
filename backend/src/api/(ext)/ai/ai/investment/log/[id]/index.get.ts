import { models } from "@b/db";
import { createError } from "@b/utils/error";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseInvestmentSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Retrieves specific investment by ID for the logged-in user",
  description:
    "Fetches a specific AI trading investment by ID for the currently authenticated user.",
  operationId: "getInvestmentById",
  tags: ["AI Trading"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string", description: "Investment ID" },
    },
  ],
  responses: {
    200: {
      description: "Investment retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseInvestmentSchema,
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
  const { user, params } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const { id } = params;

  const investment = await models.aiInvestment.findByPk(id, {
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
  });
  if (!investment) {
    throw createError({ statusCode: 404, message: "Investment not found" });
  }
  return investment;
};
