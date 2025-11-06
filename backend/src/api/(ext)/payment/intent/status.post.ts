import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Checks the status of a payment intent",
  operationId: "checkPaymentIntentStatus",
  tags: ["Payments"],
  requiresAuth: false,
  requiresApi: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            paymentIntentId: {
              type: "string",
              description: "Payment Intent ID",
            },
          },
          required: ["paymentIntentId"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Payment intent status retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              paymentIntentId: { type: "string" },
              status: { type: "string" },
              amount: { type: "number" },
              currency: { type: "string" },
              userId: { type: "string" },
              transactionId: { type: "string" },
            },
          },
        },
      },
    },
    400: { description: "Invalid request parameters" },
    401: { description: "Unauthorized" },
    404: { description: "Payment intent not found" },
  },
};

export default async (data: Handler) => {
  const { user, body } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { paymentIntentId } = body;

  if (!paymentIntentId) {
    throw createError({
      statusCode: 400,
      message: "Invalid request parameters. PaymentIntentId is required.",
    });
  }

  const paymentIntent = await models.paymentIntent.findByPk(paymentIntentId);

  if (!paymentIntent) {
    throw createError({
      statusCode: 404,
      message: "Payment intent not found",
    });
  }

  // Ensure the user is authorized to check this payment intent
  if (paymentIntent.userId !== user.id) {
    throw createError({
      statusCode: 403,
      message: "You are not authorized to view this payment intent",
    });
  }

  return {
    paymentIntentId: paymentIntent.id,
    status: paymentIntent.status,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    userId: paymentIntent.userId,
    transactionId: paymentIntent.transactionId || null, // Optional, only if the transaction exists
    message: "Payment intent status retrieved successfully",
  };
};
