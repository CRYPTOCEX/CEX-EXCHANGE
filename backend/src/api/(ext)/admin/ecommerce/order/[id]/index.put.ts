import { updateRecordResponses } from "@b/utils/query";
import {
  ecommerceOrderUpdateSchema,
  sendOrderStatusUpdateEmail,
} from "../utils";
import { models, sequelize } from "@b/db";

export const metadata: OperationObject = {
  summary: "Updates a specific ecommerce order",
  operationId: "updateEcommerceOrder",
  tags: ["Admin", "Ecommerce", "Orders"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the ecommerce order to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the ecommerce order",
    content: {
      "application/json": {
        schema: ecommerceOrderUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Ecommerce Order"),
  requiresAuth: true,
  permission: "edit.ecommerce.order",
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const { status } = body;

  const order = await models.ecommerceOrder.findByPk(id);
  if (!order) {
    throw new Error("Order not found");
  }

  if (order.status !== "PENDING") {
    throw new Error("Order status is not PENDING");
  }

  const transaction = await models.transaction.findOne({
    where: { referenceId: order.id },
  });

  if (!transaction) {
    throw new Error("Transaction not found");
  }

  const wallet = await models.wallet.findByPk(transaction.walletId);

  if (!wallet) {
    throw new Error("Wallet not found");
  }

  await sequelize.transaction(async (t) => {
    order.status = status;
    await order.save({ transaction: t });

    if (status === "CANCELLED" || status === "REJECTED") {
      wallet.balance += transaction.amount;
      wallet.save({ transaction: t });
    }

    return order;
  });

  try {
    const user = await models.user.findByPk(order.userId);
    await sendOrderStatusUpdateEmail(user, order, status);
  } catch (error) {
    console.error("Failed to send order status update email:", error);
  }
};
