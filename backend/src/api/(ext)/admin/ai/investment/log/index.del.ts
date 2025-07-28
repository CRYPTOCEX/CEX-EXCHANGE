import { models } from "@b/db";
import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes AI Investments by IDs",
  operationId: "bulkDeleteAIInvestments",
  tags: ["Admin", "AI Investment"],
  parameters: commonBulkDeleteParams("AI Investments"),
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              items: { type: "string" },
              description: "Array of AI Investment IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("AI Investments"),
  requiresAuth: true,
  permission: "delete.ai.investment",
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;

  const preDelete = async () => {
    for (const id of ids) {
      const transaction = await models.transaction.findOne({
        where: { referenceId: id },
        include: [{ model: models.wallet, as: "wallet" }],
      });

      if (!transaction) {
        console.warn("Transaction not found for id:", id);
        continue;
      }

      if (!transaction.wallet) {
        console.warn("Wallet not found for transaction:", transaction.id);
        continue;
      }

      // Update wallet balance for each valid transaction.
      const newBalance = transaction.wallet.balance + transaction.amount;
      await models.wallet.update(
        { balance: newBalance },
        { where: { id: transaction.wallet.id } }
      );
    }
  };

  const postDelete = async () => {
    // Remove transaction records for each ID, regardless of preDelete outcome.
    for (const id of ids) {
      await models.transaction.destroy({
        where: { referenceId: id },
      });
    }
  };

  return handleBulkDelete({
    model: "aiInvestment",
    ids,
    query: { ...query, force: true, restore: undefined },
    preDelete,
    postDelete,
  });
};
