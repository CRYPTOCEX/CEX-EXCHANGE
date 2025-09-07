import { models, sequelize } from "@b/db";
import { sendInvestmentEmail } from "@b/utils/emails";
import { createError } from "@b/utils/error";
import { createNotification } from "@b/utils/notifications";

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
          },
          required: ["planId", "durationId", "amount"],
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
  const { user, body } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { planId, durationId, amount } = body;

  const userPk = await models.user.findByPk(user.id);
  if (!userPk) throw new Error("User not found");

  const plan = await models.forexPlan.findByPk(planId);
  if (!plan) throw new Error("Plan not found");
  if (
    (plan.minAmount && amount < plan.minAmount) ||
    (plan.maxAmount && amount > plan.maxAmount)
  ) {
    throw new Error("Amount is not within plan limits");
  }

  const account = await models.forexAccount.findOne({
    where: { userId: user.id, type: "LIVE" },
  });
  if (!account) throw new Error("Account not found");
  if (account.balance && account.balance < amount)
    throw new Error("Insufficient balance");
  const newBalance = account.balance - amount;
  if (newBalance < 0) throw new Error("Insufficient balance");

  const duration = await models.forexDuration.findByPk(durationId);
  if (!duration) throw new Error("Duration not found");

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
      throw new Error("Invalid timeframe");
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
      link: `/forex/investments/${investment.id}`,
      actions: [
        {
          label: "View Investment",
          link: `/forex/investments/${investment.id}`,
          primary: true,
        },
      ],
    });
  } catch (error) {
    throw new Error(String(error));
  }

  return investment;
};
