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
  summary: "Activate P2P offer",
  description: "Activates a paused, disabled, rejected, or cancelled P2P offer. Changes the offer status to ACTIVE and logs the admin action with activity trail.",
  operationId: "activateAdminP2POffer",
  tags: ["Admin", "P2P", "Offer"],
  requiresAuth: true,
  middleware: [p2pAdminOfferRateLimit],
  logModule: "ADMIN_P2P",
  logTitle: "Activate P2P offer",
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
    200: { description: "Offer activated successfully." },
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
    // Only allow activating PAUSED, DISABLED, or REJECTED offers
    const allowedStatuses = ["PAUSED", "DISABLED", "REJECTED", "CANCELLED"];
    if (!allowedStatuses.includes(offer.status)) {
      await transaction.rollback();
      ctx?.fail(`Cannot activate offer with status ${offer.status}`);
      throw createError({
        statusCode: 400,
        message: `Cannot activate offer with status ${offer.status}. Only PAUSED, DISABLED, or REJECTED offers can be activated.`,
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

    ctx?.step("Activating offer");
    // Update offer to ACTIVE status
    await offer.update({
      status: "ACTIVE",
      activityLog: [
        ...(offer.activityLog || []),
        {
          type: "ACTIVATED",
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
      "OFFER_ACTIVATED",
      "OFFER",
      offer.id,
      {
        offerUserId: offer.userId,
        offerType: offer.type,
        currency: offer.currency,
        previousStatus,
        activatedBy: adminName,
      }
    );

    await transaction.commit();

    ctx?.step("Sending notification");
    // Send notification to offer owner
    notifyOfferEvent(offer.id, "OFFER_ACTIVATED", {
      activatedBy: adminName,
    }).catch((error) => logger.error("P2P", "Failed to send offer activated notification", error));

    ctx?.success("Offer activated successfully");
    return {
      message: "Offer activated successfully.",
      offer: {
        id: offer.id,
        status: "ACTIVE",
      }
    };
  } catch (err) {
    await transaction.rollback();
    if (err.statusCode) {
      throw err;
    }
    ctx?.fail("Failed to activate offer");
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
