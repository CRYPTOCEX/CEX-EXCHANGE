import { models, sequelize } from "@b/db";
import { sendAiInvestmentEmail } from "@b/utils/emails";
import { createError } from "@b/utils/error";
import { createNotification } from "@b/utils/notifications";
import { makeUuid } from "@b/utils/passwords";

import { createRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Creates a new investment",
  description:
    "Creates a new AI trading investment for the currently authenticated user based on the provided details.",
  operationId: "createInvestment",
  tags: ["AI Trading"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            currency: {
              type: "string",
              description: "Currency of the investment",
            },
            pair: { type: "string", description: "Trading pair" },
            planId: {
              type: "string",
              description: "Plan ID to be used for the investment",
            },
            durationId: {
              type: "string",
              description: "Duration ID for the investment",
            },
            amount: { type: "number", description: "Amount to be invested" },
            type: { type: "string", description: "Type of wallet" },
          },
          required: ["planId", "durationId", "amount", "currency", "pair"],
        },
      },
    },
  },
  responses: createRecordResponses("AI Investment"),
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user, body } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const userPk = await models.user.findByPk(user.id);
  if (!userPk) {
    throw createError({ statusCode: 404, message: "User not found" });
  }

  const { planId, durationId, amount, currency, pair, type } = body;

  const plan = await models.aiInvestmentPlan.findByPk(planId);
  if (!plan) {
    throw createError({ statusCode: 404, message: "Plan not found" });
  }
  if (!plan.status) {
    throw createError({ statusCode: 400, message: "Plan is not active" });
  }

  const duration = await models.aiInvestmentDuration.findByPk(durationId);
  if (!duration) {
    throw createError({ statusCode: 404, message: "Duration not found" });
  }

  if (plan.minAmount > amount || plan.maxAmount < amount) {
    throw createError({
      statusCode: 400,
      message: `Amount must be between ${plan.minAmount} and ${plan.maxAmount}`,
    });
  }

  const investment = await sequelize.transaction(async (t) => {
    const wallet = await models.wallet.findOne({
      where: {
        userId: user.id,
        currency: pair,
        type,
      },
      transaction: t,
    });

    if (!wallet) {
      throw createError({ statusCode: 404, message: "Wallet not found" });
    }

    if (wallet.balance < amount) {
      throw createError({
        statusCode: 400,
        message: "Insufficient funds",
      });
    }

    const investmentId = makeUuid();
    const investment = await models.aiInvestment.create(
      {
        id: investmentId,
        userId: user.id,
        planId,
        durationId,
        symbol: `${currency}/${pair}`,
        amount,
        status: "ACTIVE",
        type: type || "SPOT",
      },
      { transaction: t }
    );

    await wallet.update(
      { balance: wallet.balance - amount },
      { transaction: t }
    );

    await models.transaction.create(
      {
        userId: user.id,
        walletId: wallet.id,
        amount: amount,
        description: `Investment: Plan "${plan.title}" | Duration: ${duration.duration} ${duration.timeframe}`,
        status: "COMPLETED",
        type: "AI_INVESTMENT",
        referenceId: investmentId,
      },
      { transaction: t }
    );

    return investment;
  });

  try {
    await sendAiInvestmentEmail(
      userPk,
      plan,
      duration,
      investment,
      "NewAiInvestmentCreated"
    );
    await createNotification({
      userId: user.id,
      relatedId: investment.id,
      title: "AI Investment Created",
      message: `Your AI investment for ${investment.symbol} has been created successfully.`,
      type: "investment",
      link: `/ai/investment/${investment.id}`,
      actions: [
        {
          label: "View Investment",
          link: `/ai/investment/${investment.id}`,
          primary: true,
        },
      ],
    });
  } catch (error) {
    console.error("Failed to send email or create notification", error);
  }

  return { message: "Investment created successfully" };
};
