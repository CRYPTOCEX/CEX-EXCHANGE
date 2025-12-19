import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { processForexInvestment } from "@b/api/(ext)/forex/utils/cron";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { logger } from "@b/utils/console";

export const metadata: OperationObject = {
  summary: "Recovers a failed Forex investment",
  description: "Manually retries processing of a failed Forex investment.",
  operationId: "recoverForexInvestment",
  tags: ["Admin", "Forex", "Investment"],
  requiresAuth: true,
  permission: ["edit.forex.investment"],
  logModule: "ADMIN_FOREX",
  logTitle: "Recover forex investment",
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
  const { user, body, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { investmentId } = body;

  try {
    ctx?.step(`Validating forex investment ${investmentId}`);
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

    ctx?.step("Resetting investment status to ACTIVE");
    // Clear the metadata and set status back to ACTIVE
    await investment.update({
      status: "ACTIVE",
      metadata: null,
    });

    // Attempt to process the investment again
    try {
      ctx?.step("Processing investment");
      await processForexInvestment(investment, 0, ctx);

      ctx?.success("Investment recovery initiated successfully");
      return {
        message: "Investment recovery initiated successfully",
        investment: {
          id: investment.id,
          status: investment.status,
        },
      };
    } catch (processError) {
      ctx?.fail("Failed to process investment");
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
    logger.error("FOREX", "Error recovering forex investment", error);
    throw createError({ statusCode: 500, message: "Internal Server Error" });
  }
};