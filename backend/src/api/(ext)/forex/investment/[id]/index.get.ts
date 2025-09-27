import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseForexInvestmentSchema } from "../utils";
import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary:
    "Retrieves detailed information of a specific forex investment by ID",
  operationId: "getForexInvestmentById",
  tags: ["Forex", "Investments"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the forex investment to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Forex investment details",
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

export default async (data) => {
  const { params, user } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    const investment = await models.forexInvestment.findOne({
      where: {
        id: params.id,
        userId: user.id,
      },
      include: [
        {
          model: models.user,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email", "avatar"],
        },
        {
          model: models.forexPlan,
          as: "plan",
          attributes: ["id", "name", "title", "description", "profitPercentage", "image", "currency"],
        },
        {
          model: models.forexDuration,
          as: "duration",
          attributes: ["id", "duration", "timeframe"],
        },
      ],
    });

    if (!investment) {
      throw createError({ statusCode: 404, message: "Forex investment not found" });
    }

    return investment;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error fetching forex investment:", error);
    throw createError({ statusCode: 500, message: "Internal Server Error" });
  }
};
