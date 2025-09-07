import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { processForexInvestment } from "@b/utils/crons/forex";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Recovers a failed Forex investment",
  description: "Manually retries processing of a failed Forex investment.",
  operationId: "recoverForexInvestment",
  tags: ["Admin", "Forex", "Investments"],
  requiresAuth: true,
  permission: ["edit.forex.investment"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            investmentId: {
              type: "string",
              description: "ID of the investment to recover",
            },
          },
          required: ["investmentId"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Investment recovery initiated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              investment: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  status: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Forex Investment"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, body } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { investmentId } = body;

  try {
    // Find the investment
    const investment = await models.forexInvestment.findOne({
      where: { 
        id: investmentId,
        status: "CANCELLED"
      },
      include: [
        {
          model: models.forexPlan,
          as: "plan",
        },
        {
          model: models.forexDuration,
          as: "duration",
        },
      ],
    });

    if (!investment) {
      throw createError({
        statusCode: 404,
        message: "Investment not found or not in CANCELLED status",
      });
    }

    // Clear the metadata and set status back to ACTIVE
    await investment.update({
      status: "ACTIVE",
      metadata: null,
    });

    // Attempt to process the investment again
    try {
      await processForexInvestment(investment);
      
      return {
        message: "Investment recovery initiated successfully",
        investment: {
          id: investment.id,
          status: investment.status,
        },
      };
    } catch (processError) {
      // If processing fails again, the cron job will handle it
      throw createError({
        statusCode: 500,
        message: "Failed to process investment. It will be retried automatically.",
      });
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error recovering forex investment:", error);
    throw createError({ statusCode: 500, message: "Internal Server Error" });
  }
};