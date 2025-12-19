import { models, sequelize } from "@b/db";
import { updateRecordResponses } from "@b/utils/query";
import { sendOrderStatusUpdateEmail } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates the status of an E-commerce Order",
  operationId: "updateEcommerceOrderStatus",
  tags: ["Admin", "Ecommerce Orders"],
  parameters: [
    {
      index: 0, // Ensuring the parameter index is specified as requested
      name: "id",
      in: "path",
      required: true,
      description: "ID of the E-commerce order to update",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["PENDING", "COMPLETED", "CANCELLED", "REJECTED"],
              description: "New status to apply",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("E-commerce Order"),
  requiresAuth: true,
  permission: "edit.ecommerce.order",
  logModule: "ADMIN_ECOM",
  logTitle: "Update order status",
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

  ctx?.step("Validating current order status");
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

  ctx?.step(`Updating order status to ${status}`);
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
    ctx?.success("Order status updated and email sent");
  } catch (error) {
    ctx?.warn("Order status updated but email failed");
    console.error("Failed to send order status update email:", error);
  }
};
