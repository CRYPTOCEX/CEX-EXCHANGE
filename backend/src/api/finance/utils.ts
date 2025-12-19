import { models } from "@b/db";

interface LogContext {
  step?: (message: string) => void;
  success?: (message: string) => void;
  fail?: (message: string) => void;
}

export async function updateTransaction(
  id: string,
  data: Partial<transactionCreationAttributes>,
  ctx?: LogContext
) {
  ctx?.step?.(`Updating transaction ${id}`);

  await models.transaction.update(
    {
      ...data,
    },
    {
      where: {
        id,
      },
    }
  );

  ctx?.step?.(`Fetching updated transaction ${id}`);

  const updatedTransaction = await models.transaction.findByPk(id, {
    include: [
      {
        model: models.wallet,
        as: "wallet",
        attributes: ["id", "currency"],
      },
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
    ],
  });

  if (!updatedTransaction) {
    ctx?.fail?.("Transaction not found");
    throw new Error("Transaction not found");
  }

  ctx?.success?.(`Transaction ${id} updated successfully`);

  return updatedTransaction.get({
    plain: true,
  }) as unknown as transactionAttributes;
}
