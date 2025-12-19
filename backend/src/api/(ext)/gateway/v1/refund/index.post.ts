import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import {
  authenticateGatewayApi,
  checkApiPermission,
  generateRefundId,
  processMultiWalletRefund,
  sendWebhook,
} from "@b/utils/gateway";
import { createRefundSchema, refundResponseSchema } from "../utils";
import { logger } from "@b/utils/console";

export const metadata: OperationObject = {
  summary: "Create a refund",
  description:
    "Creates a refund for a completed payment. Can be a full or partial refund.",
  operationId: "createRefund",
  tags: ["Gateway", "Refund"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: createRefundSchema,
      },
    },
  },
  responses: {
    201: {
      description: "Refund created successfully",
      content: {
        "application/json": {
          schema: refundResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid request or payment cannot be refunded",
    },
    401: {
      description: "Invalid or missing API key",
    },
    404: {
      description: "Payment not found",
    },
  },
  requiresAuth: false,
  logModule: "GATEWAY",
  logTitle: "Create Refund",
};

export default async (data: Handler) => {
  const { body, headers, ctx } = data;

  ctx?.step("Authenticate API key");

  // Authenticate using API key
  const apiKeyHeader = headers?.["x-api-key"] || headers?.["X-API-Key"];
  const clientIp = headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
                   headers?.["x-real-ip"] ||
                   headers?.["cf-connecting-ip"] ||
                   null;
  const { merchant, apiKey, isTestMode, isSecretKey } =
    await authenticateGatewayApi(apiKeyHeader, clientIp);

  // Only secret keys can create refunds
  if (!isSecretKey) {
    ctx?.fail("Secret key required");
    throw createError({
      statusCode: 403,
      message: "Secret key required to create refunds",
    });
  }

  // Check permission
  checkApiPermission(apiKey, "refund.create");

  ctx?.step("Validate required fields");

  // Validate required fields
  if (!body.paymentId) {
    ctx?.fail("Missing paymentId");
    throw createError({
      statusCode: 400,
      message: "Missing required field: paymentId",
    });
  }

  ctx?.step("Find payment to refund");

  // Find payment
  const payment = await models.gatewayPayment.findOne({
    where: {
      paymentIntentId: body.paymentId,
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

  // Check test mode consistency
  if (payment.testMode !== isTestMode) {
    ctx?.fail("Test mode mismatch");
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
    ctx?.fail(`Payment status is ${payment.status}`);
    throw createError({
      statusCode: 400,
      message: `Payment with status ${payment.status} cannot be refunded`,
    });
  }

  ctx?.step("Calculate refund amount and validate");

  // Calculate refund amount
  const refundAmount = body.amount
    ? parseFloat(body.amount)
    : payment.amount;

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

  if (refundAmount > remainingRefundable) {
    ctx?.fail("Refund amount exceeds remaining refundable amount");
    throw createError({
      statusCode: 400,
      message: `Refund amount ${refundAmount} exceeds remaining refundable amount ${remainingRefundable}`,
    });
  }

  ctx?.step("Generate refund ID and calculate fees");

  // Generate refund ID
  const refundId = generateRefundId();

  // Calculate proportional fee to return
  // If original payment was $100 with $3 fee, and refund is $50, return $1.50 fee
  const feePercentage = payment.feeAmount / payment.amount;
  const proportionalFee = refundAmount * feePercentage;

  let result;

  ctx?.step("Process refund in database transaction");

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
          reason: body.reason || "REQUESTED_BY_CUSTOMER",
          description: body.description || null,
          status: "COMPLETED",
          metadata: body.metadata || null,
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
          description: `Refund for payment ${payment.paymentIntentId}`,
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
    ctx?.fail(`Refund processing failed: ${error.message}`);
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
    logger.error("GATEWAY_REFUND", "Refund processing failed", error);
    throw createError({
      statusCode: 500,
      message: `Failed to process refund: ${error.message}`,
    });
  }

  ctx?.step("Send refund completion webhook");

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
            reason: body.reason || "REQUESTED_BY_CUSTOMER",
          },
        },
        merchant.webhookSecret
      );
    } catch (error) {
      logger.error("GATEWAY_REFUND", "Failed to send refund.completed webhook", error);
    }
  }

  ctx?.success("Refund created successfully");

  return {
    id: refundId,
    paymentId: payment.paymentIntentId,
    amount: refundAmount,
    currency: payment.currency,
    status: "COMPLETED",
    reason: body.reason || "REQUESTED_BY_CUSTOMER",
    description: body.description || null,
    createdAt: result.createdAt,
  };
};
