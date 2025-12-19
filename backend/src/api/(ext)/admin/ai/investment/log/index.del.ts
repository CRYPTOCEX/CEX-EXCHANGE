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
  logModule: "ADMIN_AI",
  logTitle: "Bulk delete AI investments",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  const preDelete = async () => {
    ctx?.step(`Processing ${ids.length} investment(s) for deletion`);
    for (const id of ids) {
      const transaction = await models.transaction.findOne({
        where: { referenceId: id },
        include: [{ model: models.wallet, as: "wallet" }],
      });

      if (!transaction) {
        ctx?.warn(`Transaction not found for id: ${id}`);
        continue;
      }

      if (!transaction.wallet) {
        ctx?.warn(`Wallet not found for transaction: ${transaction.id}`);
        continue;
      }

      // Update wallet balance for each valid transaction.
      const newBalance = transaction.wallet.balance + transaction.amount;
      await models.wallet.update(
        { balance: newBalance },
        { where: { id: transaction.wallet.id } }
      );
    }
    ctx?.step("Wallet balances updated");
  };

  const postDelete = async () => {
    ctx?.step("Cleaning up transaction records");
    // Remove transaction records for each ID, regardless of preDelete outcome.
    for (const id of ids) {
      await models.transaction.destroy({
        where: { referenceId: id },
      });
    }
  };

  const result = await handleBulkDelete({
    model: "aiInvestment",
    ids,
    query: { ...query, force: true, restore: undefined },
    preDelete,
    postDelete,
  });

  ctx?.success(`Deleted ${ids.length} investment(s)`);
  return result;
};
