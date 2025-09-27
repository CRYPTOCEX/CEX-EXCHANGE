import { models, sequelize } from "@b/db";
import { sendInvestmentEmail } from "@b/utils/emails";
import { createError } from "@b/utils/error";
import { createNotification } from "@b/utils/notifications";
import { logInfo, logError } from "@b/utils/logger";
import { ForexFraudDetector } from "@b/api/(ext)/forex/utils/forex-fraud-detector";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Creates a new Forex investment",
  description: "Allows a user to initiate a new Forex investment.",
  operationId: "createForexInvestment",
  tags: ["Forex", "Investments"],
  requiresAuth: true,
  rateLimit: {
    windowMs: 3600000, // 1 hour
    max: 10 // 10 investments per hour
  },
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            planId: { type: "string", description: "Forex plan ID" },
            durationId: {
              type: "string",
              description: "Investment duration ID",
            },
            amount: { type: "number", description: "Amount to invest" },
            acceptTerms: { 
              type: "boolean", 
              description: "User must accept investment terms" 
            },
          },
          required: ["planId", "durationId", "amount", "acceptTerms"],
        },
      },
    },
  },
  responses: {
    201: {
      description: "Forex investment created successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              id: { type: "string", description: "Forex investment ID" },
              userId: { type: "string", description: "User ID" },
              planId: { type: "string", description: "Forex plan ID" },
              durationId: {
                type: "string",
                description: "Investment duration ID",
              },
              amount: { type: "number", description: "Investment amount" },
              profit: { type: "number", description: "Investment profit" },
              result: {
                type: "string",
                description: "Investment result (WIN, LOSS, or DRAW)",
              },
              status: {
                type: "string",
                description:
                  "Investment status (ACTIVE, COMPLETED, CANCELLED, or REJECTED)",
              },
              endDate: { type: "string", description: "Investment end date" },
              createdAt: {
                type: "string",
                description: "Investment creation timestamp",
              },
              updatedAt: {
                type: "string",
                description: "Investment update timestamp",
              },
            },
            required: [
              "id",
              "userId",
              "planId",
              "durationId",
              "amount",
              "status",
              "endDate",
            ],
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
  const { user, body, req } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { planId, durationId, amount, acceptTerms } = body;

  try {
    // Verify terms acceptance
    if (!acceptTerms) {
      throw createError({
        statusCode: 400,
        message: "You must accept the investment terms and conditions to proceed",
      });
    }
    const userPk = await models.user.findByPk(user.id);
    if (!userPk) {
      throw createError({ statusCode: 404, message: "User not found" });
    }

    const plan = await models.forexPlan.findByPk(planId);
    if (!plan) {
      throw createError({ statusCode: 404, message: "Plan not found" });
    }
    
    if (
      (plan.minAmount && amount < plan.minAmount) ||
      (plan.maxAmount && amount > plan.maxAmount)
    ) {
      throw createError({ 
        statusCode: 400, 
        message: `Amount must be between ${plan.minAmount || 0} and ${plan.maxAmount || 'unlimited'}` 
      });
    }

    const account = await models.forexAccount.findOne({
      where: { userId: user.id, type: "LIVE" },
    });
    if (!account) {
      throw createError({ statusCode: 404, message: "Live account not found" });
    }
    
    if (account.balance && account.balance < amount) {
      throw createError({ 
        statusCode: 400, 
        message: "Insufficient balance in your account" 
      });
    }
    
    const newBalance = (account.balance || 0) - amount;
    if (newBalance < 0) {
      throw createError({ 
        statusCode: 400, 
        message: "Insufficient balance in your account" 
      });
    }

    const duration = await models.forexDuration.findByPk(durationId);
    if (!duration) {
      throw createError({ statusCode: 404, message: "Duration not found" });
    }

    // Fraud detection check
    const fraudCheck = await ForexFraudDetector.checkInvestment(
      user.id,
      planId,
      amount
    );
    
    if (!fraudCheck.isValid) {
      throw createError({ 
        statusCode: 400, 
        message: fraudCheck.reason || "Investment flagged for security review" 
      });
    }

    const endDate = new Date();
    switch (duration.timeframe) {
      case "HOUR":
        endDate.setHours(endDate.getHours() + duration.duration);
        break;
      case "DAY":
        endDate.setDate(endDate.getDate() + duration.duration);
        break;
      case "WEEK":
        endDate.setDate(endDate.getDate() + 7 * duration.duration);
        break;
      case "MONTH":
        endDate.setDate(endDate.getDate() + 30 * duration.duration);
        break;
      default:
        throw createError({ statusCode: 400, message: "Invalid timeframe" });
    }

    const investment = await sequelize.transaction(async (t) => {
      const investment = await models.forexInvestment.create(
        {
          userId: user.id,
          planId: planId,
          durationId: durationId,
          amount: amount,
          status: "ACTIVE",
          endDate: endDate,
          termsAcceptedAt: new Date(),
          termsVersion: "1.0", // You should make this configurable
        },
        { transaction: t }
      );

      await models.forexAccount.update(
        {
          balance: newBalance,
        },
        {
          where: { id: account.id },
          transaction: t,
        }
      );

      // Log the investment creation
      logInfo(
        "forex-investment",
        `User ${user.id} created forex investment ${investment.id} with plan ${planId}. Amount: ${amount} USD, Duration: ${duration.duration} ${duration.timeframe}, ROI: ${plan.roi}`,
        __filename
      );

      return investment;
    });

    try {
      await sendInvestmentEmail(
        userPk,
        plan,
        duration,
        investment,
        "NewForexInvestmentCreated"
      );
      await createNotification({
        userId: user.id,
        relatedId: investment.id,
        title: "New Forex Investment",
        message: "You have successfully created a new Forex investment.",
        type: "investment",
        link: `/forex/investment/${investment.id}`,
        actions: [
          {
            label: "View Investment",
            link: `/forex/investment/${investment.id}`,
            primary: true,
          },
        ],
      });
    } catch (emailError) {
      console.error("Error sending investment email:", emailError);
      // Don't fail the investment creation if email fails
    }

    return investment;
  } catch (error: any) {
    // Log the error
    logError(
      "forex-investment-error",
      new Error(`Forex investment creation failed for user ${user.id}, plan ${planId}: ${error.message}. Details: planId=${planId}, durationId=${durationId}, amount=${amount}`),
      __filename
    );
    
    if (error.statusCode) {
      throw error;
    }
    console.error("Error creating forex investment:", error);
    throw createError({ statusCode: 500, message: "Internal Server Error" });
  }
};
