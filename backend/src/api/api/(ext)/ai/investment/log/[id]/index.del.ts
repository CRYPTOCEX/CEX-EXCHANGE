import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { deleteRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes an AI investment",
  description:
    "Deletes an existing AI trading investment for the currently authenticated user.",
  operationId: "deleteInvestment",
  tags: ["AI Trading"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string", description: "Investment ID" },
    },
  ],
  responses: deleteRecordResponses("AI Investment"),
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user, params } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { id } = params;
  const userPk = await models.user.findByPk(user.id);
  if (!userPk) {
    throw createError({ statusCode: 404, message: "User not found" });
  }

  const investment = await models.aiInvestment.findByPk(id);
  if (!investment) {
    throw createError({ statusCode: 404, message: "Investment not found" });
  }

  if (investment.userId !== user.id) {
    throw createError({ statusCode: 403, message: "Forbidden" });
  }

  await sequelize.transaction(async (t) => {
    const wallet = await models.wallet.findOne({
      where: {
        userId: user.id,
        currency: investment.symbol.split("/")[1],
        type: investment.type,
      },
      transaction: t,
    });

    if (!wallet) {
      throw createError({ statusCode: 404, message: "Wallet not found" });
    }

    await models.aiInvestment.destroy({
      where: { id },
      force: true,
      transaction: t,
    });

    await wallet.update(
      { balance: wallet.balance + investment.amount },
      { transaction: t }
    );

    await models.transaction.destroy({
      where: { referenceId: id },
      force: true,
      transaction: t,
    });
  });

  return {
    message: "Investment cancelled successfully",
  };
};
