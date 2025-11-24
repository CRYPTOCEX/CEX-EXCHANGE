import { models } from "@b/db";
import { createError } from "@b/utils/error";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseForexInvestmentSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Retrieves specific Forex investment status",
  description:
    "Fetches details of a specific Forex investment for the logged-in user.",
  operationId: "getForexInvestmentStatus",
  tags: ["Forex", "Investments"],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string", description: "Forex investment ID" },
    },
  ],
  responses: {
    200: {
      description: "Forex investment details retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseForexInvestmentSchema,
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
  const { user, params } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const investment = await models.forexInvestment.findOne({
    where: {
      id: params.id,
      userId: user.id,
    },
    include: [
      {
        model: models.forexPlan,
        as: "plan",
        attributes: [
          "id",
          "name",
          "title",
          "description",
          "profit_percentage",
          "image",
        ],
      },
      {
        model: models.user,
        as: "user",
        attributes: ["id", "uuid", "avatar", "first_name", "last_name"],
      },
      {
        model: models.forexDuration,
        as: "duration",
        attributes: ["id", "duration", "timeframe"],
      },
    ],
  });

  if (!investment) {
    throw createError({
      statusCode: 404,
      message: "Forex investment not found",
    });
  }

  return investment;
};
