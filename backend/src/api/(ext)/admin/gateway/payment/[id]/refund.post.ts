import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import {
  generateRefundId,
  processMultiWalletRefund,
  sendWebhook,
} from "@b/utils/gateway";
import { logger } from "@b/utils/console";
import {
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Create refund for gateway payment",
  description:
    "Admin creates a full or partial refund for a completed gateway payment. Processes fund transfer from merchant gateway balance back to customer wallet(s), returns proportional fees, updates payment status, and sends webhook notification. Supports multi-wallet refunds distributed proportionally to original payment allocations.",
  operationId: "createGatewayPaymentRefund",
  tags: ["Admin", "Gateway", "Refund"],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      description: "Payment UUID or payment intent ID (pi_xxx)",
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
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              id: { type: "string", description: "Refund ID (ref_xxx)" },
              paymentId: { type: "string", description: "Payment intent ID" },
              amount: { type: "number", description: "Refund amount" },
              currency: { type: "string", description: "Currency code" },
              status: { type: "string", description: "Refund status" },
              reason: { type: "string", description: "Refund reason" },
              description: { type: "string", description: "Refund description" },
              createdAt: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse("Payment"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "manage.gateway.payment",
  logModule: "ADMIN_GATEWAY",
  logTitle: "Create payment refund",
};

export default async (data: Handler) => {
  const { params, body, ctx } = data;
  const { id } = params;

  ctx?.step(`Looking up payment ${id}`);

  // Support lookup by either paymentIntentId (pi_xxx) or UUID
  const isPaymentIntentId = id.startsWith("pi_");
  const whereClause = isPaymentIntentId ? { paymentIntentId: id } : { id };

  // Find payment with merchant
  const payment = await models.gatewayPayment.findOne({
    where: whereClause,
    include: [
      {
        model: models.gatewayMerchant,
        as: "merchant",
      },
    ],
  });

  if (!payment) {
    ctx?.fail("Payment not found");
    throw createError({
      statusCode: 404,
      message: "Payment not found",
    });
  }

  const merchant = payment.merchant;

  ctx?.step("Validating payment status");

  // Check if payment can be refunded
  if (
    payment.status !== "COMPLETED" &&
    payment.status !== "PARTIALLY_REFUNDED"
  ) {
    ctx?.fail(`Payment status ${payment.status} cannot be refunded`);
    throw createError({
      statusCode: 400,
      message: `Payment with status ${payment.status} cannot be refunded`,
    });
  }

  ctx?.step("Calculating refundable amount");

  // Get existing refunds to check remaining refundable amount
  const existingRefunds = await models.gatewayRefund.findAll({
    where: {
      paymentId: payment.id,
      status: "COMPLETED",
    },
  });

  const totalRefunded = existingRefunds.reduce(
    (sum, r) => sum + parseFloat(r.amount),
    0
  );
  const remainingRefundable = payment.amount - totalRefunded;

  // Calculate refund amount
  const refundAmount = body?.amount
    ? parseFloat(body.amount)
    : remainingRefundable;

  if (refundAmount <= 0) {
    ctx?.fail("Refund amount must be greater than 0");
    throw createError({
      statusCode: 400,
      message: "Refund amount must be greater than 0",
    });
  }

  if (refundAmount > remainingRefundable) {
    ctx?.fail(`Refund amount exceeds remaining refundable amount`);
    throw createError({
      statusCode: 400,
      message: `Refund amount ${refundAmount.toFixed(2)} exceeds remaining refundable amount ${remainingRefundable.toFixed(2)}`,
    });
  }

  ctx?.step(`Processing refund of ${refundAmount} ${payment.currency}`);

  // Generate refund ID
  const refundId = generateRefundId();

  // Calculate proportional fee to return
  const feePercentage = payment.feeAmount / payment.amount;
  const proportionalFee = refundAmount * feePercentage;

  let result;

  try {
    // Process refund in transaction
    result = await sequelize.transaction(async (t) => {
      // Create refund record
      const refund = await models.gatewayRefund.create(
        {
          paymentId: payment.id,
          merchantId: merchant.id,
          refundId,
          amount: refundAmount,
          currency: payment.currency,
          reason: body?.reason || "REQUESTED_BY_CUSTOMER",
          description: body?.description || null,
          status: "COMPLETED",
          metadata: null,
        },
        { transaction: t }
      );

      // Process actual fund transfer: merchant gateway balance -> user wallet balance
      // Also returns proportional fee from admin wallet to user
      if (payment.customerId && !payment.testMode) {
        // Get allocations from payment record
        const allocations = payment.allocations || [];

        if (allocations.length === 0) {
          throw createError({
            statusCode: 400,
            message: "Payment has no allocation data for refund processing",
          });
        }

        // Refund proportionally to original wallets
        const refundResult = await processMultiWalletRefund({
          userId: payment.customerId,
          merchantUserId: merchant.userId,
          merchantId: merchant.id,
          paymentCurrency: payment.currency,
          allocations,
          refundAmount,
          totalPaymentAmount: payment.amount,
          feeAmount: proportionalFee,
          refundId,
          paymentId: payment.paymentIntentId,
          description: `Refund for payment ${payment.paymentIntentId} (by admin)`,
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
        newTotalRefunded >= payment.amount ? "REFUNDED" : "PARTIALLY_REFUNDED";
      await payment.update({ status: newStatus }, { transaction: t });

      return refund;
    });
  } catch (error: any) {
    // Handle Sequelize validation errors
    if (error.name === "SequelizeValidationError" || error.name === "SequelizeUniqueConstraintError") {
      const errorMessages: string[] = [];
      if (error.errors && Array.isArray(error.errors)) {
        error.errors.forEach((err: any) => {
          errorMessages.push(err.message);
        });
      }
      const message = errorMessages.length > 0
        ? errorMessages.join("; ")
        : error.message || "Validation failed";

      throw createError({
        statusCode: 400,
        message,
      });
    }

    // Handle insufficient balance error
    if (error.message?.includes("Insufficient")) {
      throw createError({
        statusCode: 400,
        message: error.message,
      });
    }

    // Handle wallet not found error
    if (error.message?.includes("wallet not found")) {
      throw createError({
        statusCode: 400,
        message: error.message,
      });
    }

    // Re-throw custom errors
    if (error.statusCode) {
      throw error;
    }

    // Log and throw generic error for unknown errors
    logger.error("ADMIN_GATEWAY_REFUND", "Refund processing failed", error);
    throw createError({
      statusCode: 500,
      message: `Failed to process refund: ${error.message}`,
    });
  }

  ctx?.step("Sending webhook notification");

  // Send webhook
  if (payment.webhookUrl) {
    try {
      await sendWebhook(
        merchant.id,
        payment.id,
        result.id,
        "refund.completed",
        payment.webhookUrl,
        {
          id: `evt_${refundId}`,
          type: "refund.completed",
          createdAt: new Date().toISOString(),
          data: {
            id: refundId,
            paymentId: payment.paymentIntentId,
            merchantOrderId: payment.merchantOrderId,
            amount: refundAmount,
            currency: payment.currency,
            status: "COMPLETED",
            reason: body?.reason || "REQUESTED_BY_CUSTOMER",
          },
        },
        merchant.webhookSecret
      );
    } catch (error) {
      logger.error("ADMIN_GATEWAY_REFUND", "Failed to send refund.completed webhook", error);
    }
  }

  ctx?.success(`Refund ${refundId} created successfully for ${refundAmount} ${payment.currency}`);

  return {
    id: refundId,
    paymentId: payment.paymentIntentId,
    amount: refundAmount,
    currency: payment.currency,
    status: "COMPLETED",
    reason: body?.reason || "REQUESTED_BY_CUSTOMER",
    description: body?.description || null,
    createdAt: result.createdAt,
  };
};
