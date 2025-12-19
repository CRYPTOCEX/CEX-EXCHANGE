import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { sendWebhook } from "@b/utils/gateway";
import { logger } from "@b/utils/console";

export const metadata: OperationObject = {
  summary: "Cancel checkout",
  description: "Cancels the checkout session and redirects to cancel URL.",
  operationId: "cancelCheckout",
  tags: ["Gateway", "Checkout"],
  parameters: [
    {
      name: "paymentIntentId",
      in: "path",
      required: true,
      description: "Payment intent ID",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Checkout cancelled",
    },
    400: {
      description: "Checkout cannot be cancelled",
    },
  },
  requiresAuth: false,
  logModule: "GATEWAY",
  logTitle: "Cancel Checkout Session",
};

export default async (data: Handler) => {
  const { params, ctx } = data;
  const { paymentIntentId } = params;

  ctx?.step("Find payment session");

  // Find payment with merchant info
  const payment = await models.gatewayPayment.findOne({
    where: {
      paymentIntentId,
    },
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

  ctx?.step("Validate payment can be cancelled");

  // Check if payment can be cancelled
  if (payment.status !== "PENDING" && payment.status !== "PROCESSING") {
    ctx?.fail(`Payment is already ${payment.status.toLowerCase()}`);
    throw createError({
      statusCode: 400,
      message: `Payment is already ${payment.status.toLowerCase()}`,
    });
  }

  ctx?.step("Update payment status to cancelled");

  // Update status
  await payment.update({ status: "CANCELLED" });

  ctx?.step("Send cancellation webhook");

  // Send webhook
  if (payment.webhookUrl) {
    try {
      await sendWebhook(
        payment.merchant.id,
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
        payment.merchant.webhookSecret
      );
    } catch (error) {
      logger.error("GATEWAY_CHECKOUT", "Failed to send payment.cancelled webhook", error);
    }
  }

  ctx?.step("Build redirect URL");

  // Build redirect URL
  const redirectUrl = payment.cancelUrl || payment.returnUrl;
  const url = new URL(redirectUrl);
  url.searchParams.set("payment_id", payment.paymentIntentId);
  url.searchParams.set("status", "cancelled");

  ctx?.success("Checkout cancelled successfully");

  return {
    success: true,
    paymentId: payment.paymentIntentId,
    status: "CANCELLED",
    redirectUrl: url.toString(),
  };
};
