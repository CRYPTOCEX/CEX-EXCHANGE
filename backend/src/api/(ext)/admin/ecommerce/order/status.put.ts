import { models, sequelize } from "@b/db";
import { updateRecordResponses, updateStatus } from "@b/utils/query";
import { sendOrderStatusUpdateEmail } from "./utils";

export const metadata: OperationObject = {
  summary: "Bulk updates the status of ecommerce orders",
  operationId: "bulkUpdateEcommerceOrderStatus",
  tags: ["Admin", "Ecommerce Orders"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of ecommerce order IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "string",
              enum: ["PENDING", "COMPLETED", "CANCELLED", "REJECTED"],
              description: "New status to apply to the ecommerce orders",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Ecommerce Order"),
  requiresAuth: true,
  permission: "edit.ecommerce.order",
};

export default async (data: Handler) => {
  const { body } = data;
  const { ids, status } = body;

  const orders = await models.ecommerceOrder.findAll({
    where: { id: ids },
  });

  if (!orders.length) {
    throw new Error("Orders not found");
  }

  await sequelize.transaction(async (t) => {
    for (const order of orders) {
      if (order.status !== "PENDING") {
        throw new Error(`Order ${order.id} status is not PENDING`);
      }

      const transaction = await models.transaction.findOne({
        where: { referenceId: order.id },
      });

      if (!transaction) {
        throw new Error(`Transaction not found for order ${order.id}`);
      }

      const wallet = await models.wallet.findByPk(transaction.walletId);

      if (!wallet) {
        throw new Error(`Wallet not found for transaction ${transaction.id}`);
      }

      order.status = status;
      await order.save({ transaction: t });

      if (status === "CANCELLED" || status === "REJECTED") {
        wallet.balance += transaction.amount;
        await wallet.save({ transaction: t });
      }
    }

    await Promise.all(
      orders.map(async (order) => {
        const user = await models.user.findByPk(order.userId);
        await sendOrderStatusUpdateEmail(user, order, status);
      })
    );
  });
};
