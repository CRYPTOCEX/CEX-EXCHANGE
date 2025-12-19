import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import {
  generateRefundId,
  processMultiWalletRefund,
  sendWebhook,
} from "@b/utils/gateway";

export const metadata: OperationObject = {
  summary: "Create a refund for a payment",
  description:
    "Creates a refund for a completed payment. Merchants can issue full or partial refunds.",
  operationId: "merchantCreateRefund",
  tags: ["Gateway", "Merchant", "Refund"],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      description: "Payment intent ID (pi_xxx)",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: false,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            amount: {
              type: "number",
              description:
                "Refund amount. If not provided, full remaining amount will be refunded.",
            },
            reason: {
              type: "string",
              enum: [
                "REQUESTED_BY_CUSTOMER",
                "DUPLICATE",
                "FRAUDULENT",
                "OTHER",
              ],
              description: "Reason for refund",
            },
            description: {
              type: "string",
              description: "Internal description for the refund",
            },
          },
        },
      },
    },
  },
  responses: {
    201: {
      description: "Refund created successfully",
    },
    400: {
      description: "Invalid request or payment cannot be refunded",
    },
    401: {
      description: "Unauthorized",
    },
    404: {
      description: "Payment not found",
    },
  },
  requiresAuth: true,
  logModule: "GATEWAY",
  logTitle: "Create Payment Refund",
};

export default async (data: Handler) => {
  const { user, params, body, ctx } = data;
  const { id } = params;

  ctx?.step("Validate user authentication");

  if (!user?.id) {
    ctx?.fail("Unauthorized - no user ID");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Find merchant account");

  // Find merchant
  const merchant = await models.gatewayMerchant.findOne({
    where: { userId: user.id },
  });

  if (!merchant) {
    ctx?.fail("Merchant account not found");
    throw createError({
      statusCode: 404,
      message: "Merchant account not found",
    });
  }

  ctx?.step("Validate merchant status");

  // SECURITY: Check merchant status - inactive merchants cannot process refunds
  if (merchant.status !== "ACTIVE") {
    ctx?.fail("Merchant account is not active");
    throw createError({
      statusCode: 403,
      message: "Merchant account is not active. Cannot process refunds.",
    });
  }

  ctx?.step("Find payment to refund");

  // Find payment (initial check without lock)
  const payment = await models.gatewayPayment.findOne({
    where: {
      paymentIntentId: id,
      merchantId: merchant.id,
    },
  });

  if (!payment) {
    ctx?.fail("Payment not found");
    throw createError({
      statusCode: 404,
      message: "Payment not found",
    });
  }

  ctx?.step("Validate payment can be refunded");

  // Check if payment can be refunded
  if (
    payment.status !== "COMPLETED" &&
    payment.status !== "PARTIALLY_REFUNDED"
  ) {
    throw createError({
      statusCode: 400,
      message: `Payment with status ${payment.status} cannot be refunded`,
    });
  }

  // Validate refund amount input
  if (body?.amount !== undefined) {
    const amount = parseFloat(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      ctx?.fail("Invalid refund amount");
      throw createError({
        statusCode: 400,
        message: "Refund amount must be a positive number",
      });
    }
  }

  ctx?.step("Generate refund ID");

  // Generate refund ID
  const refundId = generateRefundId();

  ctx?.step("Process refund in transaction");

  // Process refund in transaction with proper locking
  const result = await sequelize.transaction(async (t) => {
    // SECURITY: Lock payment record to prevent race conditions
    const lockedPayment = await models.gatewayPayment.findByPk(payment.id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!lockedPayment) {
      throw createError({
        statusCode: 404,
        message: "Payment not found",
      });
    }

    // Re-check status after locking
    if (
      lockedPayment.status !== "COMPLETED" &&
      lockedPayment.status !== "PARTIALLY_REFUNDED"
    ) {
      throw createError({
        statusCode: 400,
        message: `Payment with status ${lockedPayment.status} cannot be refunded`,
      });
    }

    // Get existing refunds inside transaction
    const existingRefunds = await models.gatewayRefund.findAll({
      where: {
        paymentId: lockedPayment.id,
        status: "COMPLETED",
      },
      transaction: t,
    });

    const totalRefunded = existingRefunds.reduce(
      (sum, r) => sum + parseFloat(r.amount),
      0
    );
    const remainingRefundable = lockedPayment.amount - totalRefunded;

    // Calculate refund amount
    const refundAmount = body?.amount
      ? parseFloat(body.amount)
      : remainingRefundable;

    if (refundAmount <= 0) {
      throw createError({
        statusCode: 400,
        message: "Refund amount must be greater than 0",
      });
    }

    if (refundAmount > remainingRefundable) {
      throw createError({
        statusCode: 400,
        message: `Refund amount ${refundAmount.toFixed(2)} exceeds remaining refundable amount ${remainingRefundable.toFixed(2)}`,
      });
    }

    // Calculate proportional fee to return
    const feePercentage = lockedPayment.feeAmount / lockedPayment.amount;
    const proportionalFee = refundAmount * feePercentage;

    // Create refund record
    const refund = await models.gatewayRefund.create(
      {
        paymentId: lockedPayment.id,
        merchantId: merchant.id,
        refundId,
        amount: refundAmount,
        currency: lockedPayment.currency,
        reason: body?.reason || "REQUESTED_BY_CUSTOMER",
        description: body?.description || null,
        status: "COMPLETED",
        metadata: null,
      },
      { transaction: t }
    );

    // Process actual fund transfer: merchant gateway balance -> user wallet balance
    // Also returns proportional fee from admin wallet to user
    if (lockedPayment.customerId && !lockedPayment.testMode) {
      // Get allocations from payment record
      const allocations = lockedPayment.allocations || [];

      if (allocations.length === 0) {
        throw createError({
          statusCode: 400,
          message: "Payment has no allocation data for refund processing",
        });
      }

      // Refund proportionally to original wallets
      const refundResult = await processMultiWalletRefund({
        userId: lockedPayment.customerId,
        merchantUserId: merchant.userId,
        merchantId: merchant.id,
        paymentCurrency: lockedPayment.currency,
        allocations,
        refundAmount,
        totalPaymentAmount: lockedPayment.amount,
        feeAmount: proportionalFee,
        refundId: refund.id,
        paymentId: lockedPayment.paymentIntentId,
        description: `Refund for payment ${lockedPayment.paymentIntentId}`,
        transaction: t,
      });

      await refund.update(
        { transactionId: refundResult.userTransaction.id },
        { transaction: t }
      );
    }

    // Update payment status
    const newTotalRefunded = totalRefunded + refundAmount;
    const newStatus =
      newTotalRefunded >= lockedPayment.amount ? "REFUNDED" : "PARTIALLY_REFUNDED";
    await lockedPayment.update({ status: newStatus }, { transaction: t });

    ctx?.success("Refund created successfully");

  return { refund, refundAmount, lockedPayment };
  });

  ctx?.step("Send refund completion webhook");

  // Send webhook
  if (result.lockedPayment.webhookUrl) {
    try {
      await sendWebhook(
        merchant.id,
        result.lockedPayment.id,
        result.refund.id,
        "refund.completed",
        result.lockedPayment.webhookUrl,
        {
          id: `evt_${refundId}`,
          type: "refund.completed",
          createdAt: new Date().toISOString(),
          data: {
            id: refundId,
            paymentId: result.lockedPayment.paymentIntentId,
            merchantOrderId: result.lockedPayment.merchantOrderId,
            amount: result.refundAmount,
            currency: result.lockedPayment.currency,
            status: "COMPLETED",
            reason: body?.reason || "REQUESTED_BY_CUSTOMER",
          },
        },
        merchant.webhookSecret
      );
    } catch (error) {
      console.error("Failed to send refund.completed webhook:", error);
    }
  }

  ctx?.success("Refund created successfully");

  return {
    id: refundId,
    paymentId: result.lockedPayment.paymentIntentId,
    amount: result.refundAmount,
    currency: result.lockedPayment.currency,
    status: "COMPLETED",
    reason: body?.reason || "REQUESTED_BY_CUSTOMER",
    description: body?.description || null,
    createdAt: result.refund.createdAt,
  };
};
