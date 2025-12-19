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
  logModule: "AI_INVEST",
  logTitle: "Cancel AI investment",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user, params, ctx } = data;

  ctx?.step("Validating user authentication");
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { id } = params;

  ctx?.step("Fetching user details");
  const userPk = await models.user.findByPk(user.id);
  if (!userPk) {
    throw createError({ statusCode: 404, message: "User not found" });
  }

  ctx?.step("Fetching investment details");
  const investment = await models.aiInvestment.findByPk(id);
  if (!investment) {
    throw createError({ statusCode: 404, message: "Investment not found" });
  }

  ctx?.step("Verifying investment ownership");
  if (investment.userId !== user.id) {
    throw createError({ statusCode: 403, message: "Forbidden" });
  }

  ctx?.step("Processing cancellation transaction");
  await sequelize.transaction(async (t) => {
    ctx?.step("Locating user wallet for refund");
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

    ctx?.step("Deleting investment record");
    await models.aiInvestment.destroy({
      where: { id },
      force: true,
      transaction: t,
    });

    ctx?.step("Refunding investment amount to wallet");
    await wallet.update(
      { balance: wallet.balance + investment.amount },
      { transaction: t }
    );

    ctx?.step("Removing associated transaction");
    await models.transaction.destroy({
      where: { referenceId: id },
      force: true,
      transaction: t,
    });
  });

  ctx?.success(`Cancelled investment of ${investment.amount} ${investment.symbol.split("/")[1]} and refunded to wallet`);

  return {
    message: "Investment cancelled successfully",
  };
};
