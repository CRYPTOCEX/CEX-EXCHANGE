import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { processGatewayPayout } from "@b/utils/gateway";
import { createNotification } from "@b/utils/notifications";
import { logger } from "@b/utils/console";
import {
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Approve gateway payout",
  description: "Approves a pending payout request and transfers funds from merchant gateway balance to their wallet. Validates merchant balance, processes payout transaction with locking to prevent concurrent approvals, updates status, and sends notification to merchant.",
  operationId: "approveGatewayPayout",
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
  responses: {
    200: {
      description: "Payout approved successfully",
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
                  processedAt: { type: "string", format: "date-time" },
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
  logTitle: "Approve payout",
};

export default async (data: Handler) => {
  const { params, user, ctx } = data;
  const { id } = params;

  if (!user?.id) {
    ctx?.fail("Unauthorized");
    throw createError({ statusCode: 401, message: "Unauthorized" });
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
    ctx?.fail(`Cannot approve payout with status: ${payout.status}`);
    throw createError({
      statusCode: 400,
      message: `Cannot approve payout with status: ${payout.status}`,
    });
  }

  ctx?.step("Verifying merchant balance");

  // SECURITY: Pre-check that funds are still available in gateway balance before processing
  const merchantBalance = await models.gatewayMerchantBalance.findOne({
    where: {
      merchantId: payout.merchantId,
      currency: payout.currency,
      walletType: payout.walletType,
    },
  });

  if (!merchantBalance) {
    ctx?.fail("Merchant gateway balance not found");
    throw createError({
      statusCode: 400,
      message: `Merchant gateway balance not found for ${payout.currency} (${payout.walletType})`,
    });
  }

  const pendingBalance = parseFloat(merchantBalance.pending?.toString() || "0");
  if (pendingBalance < payout.amount) {
    ctx?.fail("Insufficient funds for payout");
    throw createError({
      statusCode: 400,
      message: `Insufficient funds for payout. Required: ${payout.amount}, Available in gateway balance: ${pendingBalance}. Funds may have been refunded.`,
    });
  }

  ctx?.step(`Processing payout of ${payout.amount} ${payout.currency}`);

  // Process payout in transaction
  await sequelize.transaction(async (t) => {
    // Lock payout record to prevent concurrent approvals
    const lockedPayout = await models.gatewayPayout.findByPk(payout.id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!lockedPayout || lockedPayout.status !== "PENDING") {
      throw createError({
        statusCode: 400,
        message: "Payout is no longer available for approval",
      });
    }

    // Move funds from gateway balance (pending) to merchant's wallet balance
    await processGatewayPayout({
      merchantUserId: payout.merchant.userId,
      merchantId: payout.merchantId,
      currency: payout.currency,
      walletType: payout.walletType as "FIAT" | "SPOT" | "ECO",
      amount: payout.amount,
      payoutId: payout.payoutId,
      transaction: t,
    });

    // Update payout status with admin info for audit trail
    await lockedPayout.update(
      {
        status: "COMPLETED",
        processedAt: new Date(),
        metadata: {
          ...((lockedPayout.metadata as any) || {}),
          approvedBy: user.id,
          approvedAt: new Date().toISOString(),
        },
      },
      { transaction: t }
    );
  });

  ctx?.step("Sending notification to merchant");

  // Send notification to merchant
  try {
    await createNotification({
      userId: payout.merchant.userId,
      relatedId: payout.id,
      type: "system",
      title: "Payout Approved",
      message: `Your payout of ${payout.amount.toFixed(2)} ${payout.currency} has been approved and funds are now available in your wallet.`,
      link: `/gateway/payouts`,
    }, ctx);
  } catch (notifErr) {
    logger.error("ADMIN_GATEWAY_PAYOUT", "Failed to send payout approval notification", notifErr);
  }

  // Reload payout to get updated values
  await payout.reload();

  ctx?.success(`Payout ${payout.payoutId} approved successfully`);

  return {
    message: "Payout approved successfully",
    payout: {
      id: payout.id,
      payoutId: payout.payoutId,
      amount: payout.amount,
      currency: payout.currency,
      status: payout.status,
      processedAt: payout.processedAt,
    },
  };
};
