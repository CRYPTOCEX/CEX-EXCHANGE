import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";

import { p2pAdminOfferRateLimit } from "@b/handler/Middleware";
import { logP2PAdminAction } from "../../../../p2p/utils/ownership";

export const metadata = {
  summary: "Activate P2P Offer (Admin)",
  description: "Activates a paused, disabled, or rejected offer on the P2P platform.",
  operationId: "activateAdminP2POffer",
  tags: ["Admin", "Offers", "P2P"],
  requiresAuth: true,
  middleware: [p2pAdminOfferRateLimit],
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
    400: { description: "Cannot activate offer in current status." },
    401: { description: "Unauthorized." },
    404: { description: "Offer not found." },
    500: { description: "Internal Server Error." },
  },
  permission: "edit.p2p.offer",
};

export default async (data) => {
  const { params, user } = data;
  const { id } = params;

  const { notifyOfferEvent } = await import("../../../../p2p/utils/notifications");

  const transaction = await sequelize.transaction();

  try {
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
      throw createError({ statusCode: 404, message: "Offer not found" });
    }

    // Only allow activating PAUSED, DISABLED, or REJECTED offers
    const allowedStatuses = ["PAUSED", "DISABLED", "REJECTED", "CANCELLED"];
    if (!allowedStatuses.includes(offer.status)) {
      await transaction.rollback();
      throw createError({
        statusCode: 400,
        message: `Cannot activate offer with status ${offer.status}. Only PAUSED, DISABLED, or REJECTED offers can be activated.`,
      });
    }

    // Get admin user data for logging
    const adminUser = await models.user.findByPk(user.id, {
      attributes: ["id", "firstName", "lastName", "email"],
      transaction,
    });

    const adminName = adminUser
      ? `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || 'Admin'
      : 'Admin';

    const previousStatus = offer.status;

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

    // Send notification to offer owner
    notifyOfferEvent(offer.id, "OFFER_ACTIVATED", {
      activatedBy: adminName,
    }).catch(console.error);

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
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
