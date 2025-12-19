import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Get gateway payment details",
  description: "Retrieves comprehensive information about a specific gateway payment including merchant details, customer information, refunds, and webhook delivery history. Supports lookup by payment UUID or payment intent ID (pi_xxx).",
  operationId: "getGatewayPayment",
  tags: ["Admin", "Gateway", "Payment"],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      description: "Payment UUID or payment intent ID (pi_xxx)",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Payment details with related data",
      content: {
        "application/json": {
          schema: {
            type: "object",
            description: "Payment object with merchant, customer, refunds, and webhooks",
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundResponse("Payment"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.gateway.payment",
  demoMask: ["customer.email", "merchant.email"],
  logModule: "ADMIN_GATEWAY",
  logTitle: "Get payment details",
};

export default async (data: Handler) => {
  const { params, ctx } = data;
  const { id } = params;

  ctx?.step(`Fetching payment details for ${id}`);

  // Support lookup by either paymentIntentId (pi_xxx) or UUID
  const isPaymentIntentId = id.startsWith("pi_");
  const whereClause = isPaymentIntentId ? { paymentIntentId: id } : { id };

  const payment = await models.gatewayPayment.findOne({
    where: whereClause,
    include: [
      {
        model: models.gatewayMerchant,
        as: "merchant",
        attributes: ["id", "name", "slug", "email", "logo"],
      },
      {
        model: models.user,
        as: "customer",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
      {
        model: models.gatewayRefund,
        as: "gatewayRefunds",
      },
      {
        model: models.gatewayWebhook,
        as: "gatewayWebhooks",
        separate: true,
        order: [["createdAt", "DESC"]],
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

  ctx?.success(`Retrieved payment ${payment.paymentIntentId}`);

  return payment;
};
