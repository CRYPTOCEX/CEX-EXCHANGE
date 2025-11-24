// /api/admin/transactions/[id]/update.put.ts
import { updateRecordResponses } from "@b/utils/query";
import { models, sequelize } from "@b/db";
import { transactionUpdateSchema } from "@b/api/finance/transaction/utils";
import { sendIcoContributionEmail } from "@b/utils/emails";

export const metadata = {
  summary: "Updates an existing transaction",
  operationId: "updateTransaction",
  tags: ["Admin", "Wallets", "Transactions"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "The ID of the transaction to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    required: true,
    description: "Updated data for the transaction",
    content: {
      "application/json": {
        schema: transactionUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Transaction"),
  requiresAuth: true,
  permission: "edit.transaction",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { id } = params;
  const { status, amount, fee, description, referenceId } = body;

  const transaction = await models.transaction.findOne({
    where: { id },
  });

  if (!transaction) throw new Error("Transaction not found");

  if (transaction.status !== "PENDING") {
    throw new Error("Only pending transactions can be updated");
  }
  transaction.amount = amount;
  transaction.fee = fee;
  transaction.description = description;
  transaction.referenceId = referenceId;

  return await sequelize.transaction(async (t) => {
    transaction.status = status;
    await transaction.save({ transaction: t });

    return { message: "Transaction updated successfully" };
  });
};
