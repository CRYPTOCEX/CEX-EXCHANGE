import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  authenticateGatewayApi,
  checkApiPermission,
  sendWebhook,
} from "@b/utils/gateway";
import { logger } from "@b/utils/console";

export const metadata: OperationObject = {
  summary: "Cancel a payment",
  description:
    "Cancels a pending payment. Only payments with status PENDING can be cancelled.",
  operationId: "cancelPayment",
  tags: ["Gateway", "Payment"],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      description: "Payment intent ID (e.g., pi_xxx)",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Payment cancelled successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              id: { type: "string" },
              status: { type: "string" },
              cancelledAt: { type: "string" },
            },
          },
        },
      },
    },
    400: {
      description: "Payment cannot be cancelled",
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
  logTitle: "Cancel Payment",
};

export default async (data: Handler) => {
  const { params, headers, ctx } = data;
  const { id } = params;

  ctx?.step("Authenticate API key");

  // Authenticate using API key
  const apiKeyHeader = headers?.["x-api-key"] || headers?.["X-API-Key"];
  const clientIp = headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
                   headers?.["x-real-ip"] ||
                   headers?.["cf-connecting-ip"] ||
                   null;
  const { merchant, apiKey, isTestMode, isSecretKey } =
    await authenticateGatewayApi(apiKeyHeader, clientIp);

  // Only secret keys can cancel payments
  if (!isSecretKey) {
    ctx?.fail("Secret key required");
    throw createError({
      statusCode: 403,
      message: "Secret key required to cancel payments",
    });
  }

  // Check permission
  checkApiPermission(apiKey, "payment.cancel");

  ctx?.step("Find payment to cancel");

  // Find payment
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

  // Check test mode consistency
  if (payment.testMode !== isTestMode) {
    ctx?.fail("Test mode mismatch");
    throw createError({
      statusCode: 404,
      message: "Payment not found",
    });
  }

  ctx?.step("Validate payment can be cancelled");

  // Check if payment can be cancelled
  if (payment.status !== "PENDING" && payment.status !== "PROCESSING") {
    ctx?.fail(`Payment status is ${payment.status}`);
    throw createError({
      statusCode: 400,
      message: `Payment with status ${payment.status} cannot be cancelled`,
    });
  }

  ctx?.step("Update payment status");

  // Update payment status
  await payment.update({
    status: "CANCELLED",
  });

  ctx?.step("Send cancellation webhook");

  // Send webhook
  if (payment.webhookUrl) {
    try {
      await sendWebhook(
        merchant.id,
        payment.id,
        null,
        "payment.cancelled",
        payment.webhookUrl,
        {
          id: `evt_${payment.paymentIntentId}`,
          type: "payment.cancelled",
          createdAt: new Date().toISOString(),
          data: {
            id: payment.paymentIntentId,
            merchantOrderId: payment.merchantOrderId,
            amount: payment.amount,
            currency: payment.currency,
            status: "CANCELLED",
          },
        },
        merchant.webhookSecret
      );
    } catch (error) {
      logger.error("GATEWAY_PAYMENT", "Failed to send payment.cancelled webhook", error);
    }
  }

  ctx?.success("Payment cancelled successfully");

  return {
    id: payment.paymentIntentId,
    status: "CANCELLED",
    cancelledAt: new Date().toISOString(),
  };
};
