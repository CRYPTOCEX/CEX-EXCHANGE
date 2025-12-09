import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";

import { p2pAdminOfferRateLimit } from "@b/handler/Middleware";
import { logP2PAdminAction } from "../../../../p2p/utils/ownership";

export const metadata = {
  summary: "Pause P2P Offer (Admin)",
  description: "Pauses a user offer on the P2P platform temporarily.",
  operationId: "pauseAdminP2POffer",
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
    200: { description: "Offer paused successfully." },
    400: { description: "Cannot pause offer in current status." },
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

    // Only allow pausing ACTIVE offers
    if (offer.status !== "ACTIVE") {
      await transaction.rollback();
      throw createError({
        statusCode: 400,
        message: `Cannot pause offer with status ${offer.status}. Only ACTIVE offers can be paused.`,
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

    // Send notification to offer owner
    notifyOfferEvent(offer.id, "OFFER_PAUSED", {
      pausedBy: adminName,
    }).catch(console.error);

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
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
