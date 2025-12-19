import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Get gateway merchant details",
  description: "Retrieves comprehensive information about a specific gateway merchant including user details, balances, API keys (filtered by mode), and statistics such as payment count, total volume, refunds, and payouts.",
  operationId: "getGatewayMerchant",
  tags: ["Admin", "Gateway", "Merchant"],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      description: "Merchant UUID",
      schema: { type: "string", format: "uuid" },
    },
    {
      name: "mode",
      in: "query",
      description: "Filter API keys by mode (LIVE or TEST)",
      schema: {
        type: "string",
        enum: ["LIVE", "TEST"],
      },
    },
  ],
  responses: {
    200: {
      description: "Merchant details with statistics",
      content: {
        "application/json": {
          schema: {
            type: "object",
            description: "Merchant object with associated user, balances, API keys, and statistics",
            properties: {
              stats: {
                type: "object",
                properties: {
                  paymentCount: { type: "number", description: "Total number of completed payments" },
                  totalVolume: { type: "number", description: "Total payment volume" },
                  refundCount: { type: "number", description: "Total number of refunds" },
                  payoutCount: { type: "number", description: "Total number of completed payouts" },
                  totalPaidOut: { type: "number", description: "Total amount paid out to merchant" },
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundResponse("Merchant"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.gateway.merchant",
  demoMask: ["user.email", "email", "phone", "webhookSecret"],
  logModule: "ADMIN_GATEWAY",
  logTitle: "Get merchant details",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;
  const { id } = params;
  const mode = (query?.mode as "LIVE" | "TEST") || "LIVE";
  const isTestMode = mode === "TEST";

  ctx?.step(`Fetching merchant ${id} details (mode: ${mode})`);

  const merchant = await models.gatewayMerchant.findByPk(id, {
    include: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
      {
        model: models.gatewayMerchantBalance,
        as: "gatewayMerchantBalances",
      },
      {
        model: models.gatewayApiKey,
        as: "gatewayApiKeys",
        where: { mode },
        required: false,
        attributes: [
          "id",
          "name",
          "keyPrefix",
          "lastFourChars",
          "type",
          "mode",
          "permissions",
          "ipWhitelist",
          "allowedWalletTypes",
          "successUrl",
          "cancelUrl",
          "webhookUrl",
          "lastUsedAt",
          "lastUsedIp",
          "status",
          "expiresAt",
          "createdAt",
        ],
      },
    ],
  });

  if (!merchant) {
    ctx?.fail("Merchant not found");
    throw createError({
      statusCode: 404,
      message: "Merchant not found",
    });
  }

  ctx?.step("Calculating merchant statistics");

  // Get stats filtered by mode
  const [paymentCount, totalVolume, refundCount, payoutCount, totalPaidOut] = await Promise.all([
    models.gatewayPayment.count({
      where: { merchantId: id, status: "COMPLETED", testMode: isTestMode },
    }),
    models.gatewayPayment.sum("amount", {
      where: { merchantId: id, status: "COMPLETED", testMode: isTestMode },
    }),
    // Refunds don't have testMode, so we join with payment to filter
    models.gatewayRefund.count({
      where: { merchantId: id },
      include: [
        {
          model: models.gatewayPayment,
          as: "payment",
          where: { testMode: isTestMode },
          required: true,
          attributes: [],
        },
      ],
    }),
    models.gatewayPayout.count({
      where: { merchantId: id, status: "COMPLETED" },
    }),
    models.gatewayPayout.sum("netAmount", {
      where: { merchantId: id, status: "COMPLETED" },
    }),
  ]);

  ctx?.success(`Retrieved merchant details with ${paymentCount} payments`);

  return {
    ...merchant.toJSON(),
    stats: {
      paymentCount,
      totalVolume: totalVolume || 0,
      refundCount,
      payoutCount,
      totalPaidOut: totalPaidOut || 0,
    },
  };
};
