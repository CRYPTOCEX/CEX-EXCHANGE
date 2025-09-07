// /server/api/investment/store.post.ts

import { sendInvestmentEmail } from "@b/utils/emails";
import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { createRecordResponses } from "@b/utils/query";
import { getWallet } from "../wallet/utils";
import { getEndDate } from "@b/utils/date";

export const metadata: OperationObject = {
  summary: "Creates a new investment",
  description:
    "Initiates a new investment based on the specified plan and amount. This process involves updating the user's wallet balance and creating transaction records.",
  operationId: "createInvestment",
  tags: ["Finance", "Investment"],
  parameters: [],
  requestBody: {
    description: "Data required to create a new investment",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            type: {
              type: "string",
              description: "The type of investment plan",
              example: "general",
            },
            planId: {
              type: "string",
              description: "The unique identifier of the investment plan",
              example: "1",
            },
            amount: {
              type: "number",
              description: "Investment amount",
              example: 1000.0,
            },
            durationId: {
              type: "string",
              description: "The unique identifier of the investment duration",
              example: "1",
            },
          },
          required: ["type", "planId", "durationId", "amount"],
        },
      },
    },
  },
  responses: createRecordResponses("Investment"),
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user, body } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  const { type, planId, amount, durationId } = body;

  const userPk = await models.user.findByPk(user.id);
  if (!userPk) {
    throw new Error("User not found");
  }

  if (!type || typeof type !== "string") {
    throw new Error("Invalid investment type");
  }

  let model, planModel, durationModel, trxType, mailType;
  switch (type.toLowerCase()) {
    case "general":
      model = models.investment;
      planModel = models.investmentPlan;
      durationModel = models.investmentDuration;
      trxType = "INVESTMENT";
      mailType = "NewInvestmentCreated";
      break;
    case "forex":
      model = models.forexInvestment;
      planModel = models.forexPlan;
      durationModel = models.forexDuration;
      trxType = "FOREX_INVESTMENT";
      mailType = "NewForexInvestmentCreated";
      break;
  }
  if (!model) {
    throw new Error("Invalid investment type");
  }

  const plan = await planModel.findByPk(planId);
  if (!plan) {
    throw new Error("Investment plan not found");
  }

  const duration = await durationModel.findByPk(durationId);
  if (!duration) {
    throw new Error("Investment duration not found");
  }

  const wallet = await getWallet(user.id, plan.walletType, plan.currency);

  if (wallet.balance < amount) {
    throw new Error("Insufficient balance");
  }

  const roi = (plan.profitPercentage / 100) * amount;

  const newBalance = wallet.balance - amount;

  const newInvestment = await sequelize.transaction(async (transaction) => {
    await models.wallet.update(
      { balance: newBalance },
      {
        where: { id: wallet.id },
        transaction,
      }
    );

    let newInvestment;
    try {
      newInvestment = await model.create(
        {
          userId: user.id,
          planId,
          durationId: duration.id,
          walletId: wallet.id,
          amount,
          profit: roi,
          status: "ACTIVE",
          endDate: getEndDate(duration.duration, duration.timeframe),
        },
        { transaction }
      );
    } catch (error) {
      throw createError({
        statusCode: 400,
        message: "Already invested in this plan",
      });
    }

    // Assuming transaction model exists and is for logging financial transactions
    await models.transaction.create(
      {
        userId: user.id,
        walletId: wallet.id,
        amount,
        description: `Investment in ${plan.name} plan for ${duration.duration} ${duration.timeframe}`,
        status: "COMPLETED",
        fee: 0,
        type: "INVESTMENT",
        referenceId: newInvestment.id,
      },
      { transaction }
    );

    return newInvestment;
  });

  // Re-fetch the investment with related data after creation for email
  const investmentForEmail = await model.findByPk(newInvestment.id, {
    include: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
      {
        model: planModel,
        as: "plan",
      },
      {
        model: durationModel,
        as: "duration",
      },
    ],
  });

  if (investmentForEmail) {
    await sendInvestmentEmail(
      userPk,
      plan,
      duration,
      investmentForEmail,
      mailType
    );
  } else {
    throw new Error("Failed to fetch the newly created investment for email.");
  }

  return {
    message: "Investment created successfully",
  };
};
