import { models } from "@b/db";

export async function updateTransaction(
  id: string,
  data: Partial<transactionCreationAttributes>
) {
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
    throw new Error("Transaction not found");
  }

  return updatedTransaction.get({
    plain: true,
  }) as unknown as transactionAttributes;
}
