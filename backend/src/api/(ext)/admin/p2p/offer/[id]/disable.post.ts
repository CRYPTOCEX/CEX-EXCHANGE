import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";

import { p2pAdminOfferRateLimit } from "@b/handler/Middleware";
import { logP2PAdminAction } from "../../../../p2p/utils/ownership";
import { parseAmountConfig } from "../../../../p2p/utils/json-parser";
import { getWalletSafe } from "@b/api/finance/wallet/utils";
import { logger } from "@b/utils/console";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Disable P2P offer",
  description: "Disables a P2P offer and sets it to CANCELLED status. For SELL offers, releases any locked funds from escrow back to the user. Sends notification with disable reason.",
  operationId: "disableAdminP2POffer",
  tags: ["Admin", "P2P", "Offer"],
  requiresAuth: true,
  middleware: [p2pAdminOfferRateLimit],
  logModule: "ADMIN_P2P",
  logTitle: "Disable P2P offer",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "Offer ID",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    description: "Reason for disabling",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            reason: { type: "string" },
          },
          required: ["reason"],
        },
      },
    },
  },
  responses: {
    200: { description: "Offer disabled successfully." },
    401: unauthorizedResponse,
    404: notFoundResponse("Resource"),
    500: serverErrorResponse,
  },
  permission: "edit.p2p.offer",
};

export default async (data) => {
  const { params, body, user, ctx } = data;
  const { id } = params;
  const { reason } = body;

  // Import validation utilities
  const { sanitizeInput } = await import("../../../../p2p/utils/validation");
  const { notifyOfferEvent } = await import("../../../../p2p/utils/notifications");

  const transaction = await sequelize.transaction();

  try {
    ctx?.step("Fetching offer");
    const offer = await models.p2pOffer.findByPk(id, {
      include: [
        {
          model: models.user,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
      lock: true,
      transaction,
    });

    if (!offer) {
      await transaction.rollback();
      ctx?.fail("Offer not found");
      throw createError({ statusCode: 404, message: "Offer not found" });
    }

    ctx?.step("Getting admin information");
    // Get admin user data for logging
    const adminUser = await models.user.findByPk(user.id, {
      attributes: ["id", "firstName", "lastName", "email"],
      transaction,
    });

    // Sanitize disable reason
    const sanitizedReason = sanitizeInput(reason);
    const adminName = adminUser
      ? `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || 'Admin'
      : 'Admin';

    const previousStatus = offer.status;
    let fundsReleased = false;
    let releasedAmount = 0;

    ctx?.step("Checking for locked funds to release");
    // For SELL offers, release locked funds from escrow (inOrder)
    if (offer.type === "SELL") {
      const amountConfig = parseAmountConfig(offer.amountConfig);
      const lockedAmount = amountConfig.total;

      if (lockedAmount > 0) {
        const wallet = await getWalletSafe(offer.userId, offer.walletType, offer.currency, false, ctx);

        if (wallet && wallet.inOrder >= lockedAmount) {
          ctx?.step("Releasing locked funds");
          await models.wallet.update(
            {
              inOrder: wallet.inOrder - lockedAmount,
            },
            {
              where: { id: wallet.id },
              transaction,
            }
          );
          fundsReleased = true;
          releasedAmount = lockedAmount;
        }
      }
    }

    ctx?.step("Disabling offer");
    // Update offer to CANCELLED status (disabled by admin)
    await offer.update({
      status: "CANCELLED",
      adminNotes: sanitizedReason,
      disabledBy: user.id,
      disabledAt: new Date(),
      activityLog: [
        ...(offer.activityLog || []),
        {
          type: "DISABLED",
          reason: sanitizedReason,
          adminId: user.id,
          adminName: adminName,
          fundsReleased,
          releasedAmount,
          createdAt: new Date().toISOString(),
        },
      ],
    }, { transaction });

    ctx?.step("Logging admin activity");
    // Log admin activity
    await logP2PAdminAction(
      user.id,
      "OFFER_DISABLED",
      "OFFER",
      offer.id,
      {
        offerUserId: offer.userId,
        offerType: offer.type,
        currency: offer.currency,
        previousStatus,
        reason: sanitizedReason,
        disabledBy: adminName,
        fundsReleased,
        releasedAmount,
      }
    );

    await transaction.commit();

    ctx?.step("Sending notification");
    // Send notification to offer owner
    notifyOfferEvent(offer.id, "OFFER_DISABLED", {
      reason: sanitizedReason,
      disabledBy: adminName,
      fundsReleased,
      releasedAmount,
    }).catch((error) => logger.error("P2P", "Failed to send offer disabled notification", error));

    ctx?.success("Offer disabled successfully");
    return {
      message: "Offer disabled successfully.",
      offer: {
        id: offer.id,
        status: "CANCELLED",
        disabledAt: offer.disabledAt,
        fundsReleased,
        releasedAmount,
      }
    };
  } catch (err) {
    await transaction.rollback();
    if (err.statusCode) {
      throw err;
    }
    ctx?.fail("Failed to disable offer");
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
