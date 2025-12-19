import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { createNotification } from "@b/utils/notifications";
import { logger } from "@b/utils/console";
import {
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Reject gateway payout",
  description: "Rejects a pending payout request. Funds remain in merchant's gateway balance (escrow). Requires a rejection reason for audit trail. Updates payout status to CANCELLED and sends notification to merchant.",
  operationId: "rejectGatewayPayout",
  tags: ["Admin", "Gateway", "Payout"],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      description: "Payout UUID",
      schema: { type: "string", format: "uuid" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            reason: {
              type: "string",
              description: "Reason for rejection (required)",
            },
          },
          required: ["reason"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Payout rejected successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              payout: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  payoutId: { type: "string" },
                  amount: { type: "number" },
                  currency: { type: "string" },
                  status: { type: "string" },
                  rejectionReason: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse("Payout"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.gateway.payout",
  logModule: "ADMIN_GATEWAY",
  logTitle: "Reject payout",
};

export default async (data: Handler) => {
  const { params, body, user, ctx } = data;
  const { id } = params;

  if (!user?.id) {
    ctx?.fail("Unauthorized");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Validating rejection reason");

  // Require rejection reason
  if (!body?.reason?.trim()) {
    ctx?.fail("Rejection reason is required");
    throw createError({
      statusCode: 400,
      message: "Rejection reason is required",
    });
  }

  ctx?.step(`Looking up payout ${id}`);

  const payout = await models.gatewayPayout.findByPk(id, {
    include: [
      {
        model: models.gatewayMerchant,
        as: "merchant",
      },
    ],
  });

  if (!payout) {
    ctx?.fail("Payout not found");
    throw createError({
      statusCode: 404,
      message: "Payout not found",
    });
  }

  ctx?.step("Validating payout status");

  if (payout.status !== "PENDING") {
    ctx?.fail(`Cannot reject payout with status: ${payout.status}`);
    throw createError({
      statusCode: 400,
      message: `Cannot reject payout with status: ${payout.status}`,
    });
  }

  ctx?.step("Verifying merchant balance");

  // SECURITY: Verify funds are still in merchant's gateway balance
  // This is important because if funds were refunded, we shouldn't reject a payout
  // that no longer has corresponding funds
  const merchantBalance = await models.gatewayMerchantBalance.findOne({
    where: {
      merchantId: payout.merchantId,
      currency: payout.currency,
      walletType: payout.walletType,
    },
  });

  const pendingAmount = parseFloat(merchantBalance?.pending?.toString() || "0");
  if (pendingAmount < payout.amount) {
    // Funds have been partially or fully refunded
    // We should still allow rejection but note the discrepancy
    logger.warn(
      "ADMIN_GATEWAY_PAYOUT",
      `Payout ${payout.payoutId} rejection: Funds mismatch. Expected ${payout.amount}, found ${pendingAmount} in gateway balance.`
    );
  }

  ctx?.step("Updating payout status to CANCELLED");

  // Update payout status with audit info
  await payout.update({
    status: "CANCELLED",
    processedAt: new Date(),
    metadata: {
      ...((payout.metadata as any) || {}),
      rejectedBy: user.id,
      rejectedAt: new Date().toISOString(),
      rejectionReason: body.reason.trim(),
    },
  });

  ctx?.step("Sending notification to merchant");

  // Send notification to merchant
  try {
    await createNotification({
      userId: payout.merchant.userId,
      relatedId: payout.id,
      type: "system",
      title: "Payout Rejected",
      message: `Your payout request for ${payout.amount.toFixed(2)} ${payout.currency} has been rejected. Reason: ${body.reason.trim()}`,
      link: `/gateway/payouts`,
    }, ctx);
  } catch (notifErr) {
    logger.error("ADMIN_GATEWAY_PAYOUT", "Failed to send payout rejection notification", notifErr);
  }

  ctx?.success(`Payout ${payout.payoutId} rejected successfully`);

  return {
    message: "Payout rejected",
    payout: {
      id: payout.id,
      payoutId: payout.payoutId,
      amount: payout.amount,
      currency: payout.currency,
      status: "CANCELLED",
      rejectionReason: body.reason.trim(),
    },
  };
};
