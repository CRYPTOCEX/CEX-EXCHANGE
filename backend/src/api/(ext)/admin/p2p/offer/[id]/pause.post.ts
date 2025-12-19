import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";

import { p2pAdminOfferRateLimit } from "@b/handler/Middleware";
import { logP2PAdminAction } from "../../../../p2p/utils/ownership";
import { logger } from "@b/utils/console";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Pause P2P offer",
  description: "Temporarily pauses an ACTIVE P2P offer. Sets the offer status to PAUSED and notifies the offer owner. Funds remain locked for SELL offers.",
  operationId: "pauseAdminP2POffer",
  tags: ["Admin", "P2P", "Offer"],
  requiresAuth: true,
  middleware: [p2pAdminOfferRateLimit],
  logModule: "ADMIN_P2P",
  logTitle: "Pause P2P offer",
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
  responses: {
    200: { description: "Offer paused successfully." },
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse("Resource"),
    500: serverErrorResponse,
  },
  permission: "edit.p2p.offer",
};

export default async (data) => {
  const { params, user, ctx } = data;
  const { id } = params;

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

    ctx?.step("Validating offer status");
    // Only allow pausing ACTIVE offers
    if (offer.status !== "ACTIVE") {
      await transaction.rollback();
      ctx?.fail(`Cannot pause offer with status ${offer.status}`);
      throw createError({
        statusCode: 400,
        message: `Cannot pause offer with status ${offer.status}. Only ACTIVE offers can be paused.`,
      });
    }

    ctx?.step("Getting admin information");
    // Get admin user data for logging
    const adminUser = await models.user.findByPk(user.id, {
      attributes: ["id", "firstName", "lastName", "email"],
      transaction,
    });

    const adminName = adminUser
      ? `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || 'Admin'
      : 'Admin';

    const previousStatus = offer.status;

    ctx?.step("Pausing offer");
    // Update offer to PAUSED status
    await offer.update({
      status: "PAUSED",
      activityLog: [
        ...(offer.activityLog || []),
        {
          type: "PAUSED",
          adminId: user.id,
          adminName: adminName,
          previousStatus,
          createdAt: new Date().toISOString(),
        },
      ],
    }, { transaction });

    ctx?.step("Logging admin activity");
    // Log admin activity
    await logP2PAdminAction(
      user.id,
      "OFFER_PAUSED",
      "OFFER",
      offer.id,
      {
        offerUserId: offer.userId,
        offerType: offer.type,
        currency: offer.currency,
        previousStatus,
        pausedBy: adminName,
      }
    );

    await transaction.commit();

    ctx?.step("Sending notification");
    // Send notification to offer owner
    notifyOfferEvent(offer.id, "OFFER_PAUSED", {
      pausedBy: adminName,
    }).catch((error) => logger.error("P2P", "Failed to send offer paused notification", error));

    ctx?.success("Offer paused successfully");
    return {
      message: "Offer paused successfully.",
      offer: {
        id: offer.id,
        status: "PAUSED",
      }
    };
  } catch (err) {
    await transaction.rollback();
    if (err.statusCode) {
      throw err;
    }
    ctx?.fail("Failed to pause offer");
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
