import { models } from "@b/db";
import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a specific AI Investment",
  operationId: "deleteAIInvestment",
  tags: ["Admin", "AI Investment"],
  parameters: deleteRecordParams("AI Investment"),
  responses: deleteRecordResponses("AI Investment"),
  permission: "delete.ai.investment",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;

  const externalData: { transactionId?: string } = {};

  const preDelete = async () => {
    const transaction = await models.transaction.findOne({
      where: { referenceId: params.id },
      include: [{ model: models.wallet, as: "wallet" }],
    });

    if (!transaction) {
      console.warn("Transaction not found for id:", params.id);
      // Skip wallet update and transaction deletion if transaction is missing.
      return;
    }

    if (!transaction.wallet) {
      console.warn("Wallet not found for transaction:", transaction.id);
      return;
    }

    // Update wallet balance if transaction and wallet exist.
    const newBalance = transaction.wallet.balance + transaction.amount;
    await models.wallet.update(
      { balance: newBalance },
      { where: { id: transaction.wallet.id } }
    );

    externalData.transactionId = transaction.id;
  };

  const postDelete = async () => {
    // Only delete the transaction if it was found and processed.
    if (externalData.transactionId) {
      await models.transaction.destroy({
        where: { id: externalData.transactionId },
      });
    }
  };

  return await handleSingleDelete({
    model: "aiInvestment",
    id: params.id,
    query: { ...query, force: "true", restore: undefined },
    preDelete,
    postDelete,
  });
};
