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
  logModule: "ADMIN_ECOM",
  logTitle: "Update order",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step(`Finding order: ${id}`);
  const order = await models.ecommerceOrder.findByPk(id);
  if (!order) {
    throw new Error("Order not found");
  }

  ctx?.step("Validating order status");
  if (order.status !== "PENDING") {
    throw new Error("Order status is not PENDING");
  }

  ctx?.step("Finding related transaction");
  const transaction = await models.transaction.findOne({
    where: { referenceId: order.id },
  });

  if (!transaction) {
    throw new Error("Transaction not found");
  }

  ctx?.step("Finding wallet");
  const wallet = await models.wallet.findByPk(transaction.walletId);

  if (!wallet) {
    throw new Error("Wallet not found");
  }

  ctx?.step("Updating order and wallet");
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
    ctx?.step("Sending status update email");
    const user = await models.user.findByPk(order.userId);
    await sendOrderStatusUpdateEmail(user, order, status, ctx);
    ctx?.success("Order updated and email sent successfully");
  } catch (error) {
    ctx?.warn("Order updated but failed to send email");
    console.error("Failed to send order status update email:", error);
  }
};
