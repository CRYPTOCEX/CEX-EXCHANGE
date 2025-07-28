// /server/api/investment/cancel.put.ts

import { sendInvestmentEmail } from "@b/utils/emails";
import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { getWallet } from "../../wallet/utils";

export const metadata: OperationObject = {
  summary: "Cancels an investment",
  description:
    "Allows a user to cancel an existing investment by its UUID. The operation reverses any financial transactions associated with the investment and updates the user’s wallet balance accordingly.",
  operationId: "cancelInvestment",
  tags: ["Finance", "Investment"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "The ID of the investment to cancel",
      required: true,
      schema: {
        type: "string",
      },
    },
    {
      name: "type",
      in: "query",
      description: "The type of investment to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Investment canceled successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Investment"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, params, query } = data;
  if (!user) throw createError({ statusCode: 401, message: "Unauthorized" });
  const { id } = params;
  const { type } = query;

  if (!type || typeof type !== "string") {
    throw new Error("Invalid investment type");
  }
  let investment, model, planModel, durationModel;
  switch (type.toLowerCase()) {
    case "general":
      model = models.investment;
      planModel = models.investmentPlan;
      durationModel = models.investmentDuration;
      break;
    case "forex":
      model = models.forexInvestment;
      planModel = models.forexPlan;
      durationModel = models.forexDuration;
      break;
  }

  const userPk = await models.user.findByPk(user.id);

  if (!userPk) {
    throw new Error("User not found");
  }

  await sequelize.transaction(async (transaction) => {
    investment = await model.findOne({
      where: { id },
      include: [
        {
          model: planModel,
          as: "plan",
        },
        {
          model: models.user,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email", "avatar"],
        },
        {
          model: durationModel,
          as: "duration",
        },
      ],
    });
    if (!investment) throw new Error("Investment not found");

    const wallet = await getWallet(
      user.id,
      investment.plan.walletType,
      investment.plan.currency
    );
    if (!wallet) {
      throw new Error("Wallet not found");
    }

    // Check if the transaction exists
    const existingTransaction = await models.transaction.findOne({
      where: { referenceId: id },
    });

    // Update wallet balance
    await models.wallet.update(
      {
        balance: sequelize.literal(`balance + ${investment.amount}`),
      },
      {
        where: { id: wallet.id },
        transaction,
      }
    );

    // Delete investment
    await investment.destroy({
      force: true,
      transaction,
    });

    // Delete associated transaction if it exists
    if (existingTransaction) {
      await existingTransaction.destroy({
        force: true,
        transaction,
      });
    }
  });
  try {
    await sendInvestmentEmail(
      userPk,
      investment.plan,
      investment.duration,
      investment,
      "InvestmentCanceled"
    );
  } catch (error) {
    console.error("Error sending investment email", error);
  }
};
