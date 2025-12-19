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
  logModule: "FINANCE",
  logTitle: "Create investment",
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
  const { user, body, ctx } = data;

  if (!user?.id) {
    ctx?.fail("User not authenticated");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { type, planId, amount, durationId } = body;

  ctx?.step("Fetching user account");
  const userPk = await models.user.findByPk(user.id);
  if (!userPk) {
    ctx?.fail("User account not found");
    throw new Error("User not found");
  }

  ctx?.step("Validating investment type");
  if (!type || typeof type !== "string") {
    ctx?.fail(`Invalid investment type: ${type}`);
    throw new Error("Invalid investment type");
  }

  ctx?.step(`Initializing ${type} investment models`);
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
    ctx?.fail(`Invalid investment type: ${type}`);
    throw new Error("Invalid investment type");
  }

  ctx?.step("Fetching investment plan");
  const plan = await planModel.findByPk(planId);
  if (!plan) {
    ctx?.fail(`Investment plan not found: ${planId}`);
    throw new Error("Investment plan not found");
  }

  ctx?.step("Fetching investment duration");
  const duration = await durationModel.findByPk(durationId);
  if (!duration) {
    ctx?.fail(`Investment duration not found: ${durationId}`);
    throw new Error("Investment duration not found");
  }

  ctx?.step(`Fetching ${plan.currency} ${plan.walletType} wallet`);
  const wallet = await getWallet(user.id, plan.walletType, plan.currency);

  ctx?.step("Verifying wallet balance");
  if (wallet.balance < amount) {
    ctx?.fail(`Insufficient balance: ${wallet.balance} < ${amount}`);
    throw new Error("Insufficient balance");
  }

  ctx?.step("Calculating ROI");
  const roi = (plan.profitPercentage / 100) * amount;
  const newBalance = wallet.balance - amount;

  ctx?.step("Creating investment record and transaction");
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
      ctx?.fail("Already invested in this plan");
      throw createError({
        statusCode: 400,
        message: "Already invested in this plan",
      });
    }

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

  ctx?.step("Fetching investment details for email notification");
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
    ctx?.step("Sending investment confirmation email");
    await sendInvestmentEmail(
      userPk,
      plan,
      duration,
      investmentForEmail,
      mailType,
      ctx
    );
  } else {
    ctx?.fail("Failed to fetch investment for email");
    throw new Error("Failed to fetch the newly created investment for email.");
  }

  ctx?.success(`${type} investment created: ${amount} ${plan.currency} for ${duration.duration} ${duration.timeframe}`);
  return {
    message: "Investment created successfully",
  };
};
