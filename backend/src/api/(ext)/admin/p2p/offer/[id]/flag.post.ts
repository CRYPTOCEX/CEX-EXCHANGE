import { models } from "@b/db";
import { createError } from "@b/utils/error";

import { p2pAdminOfferRateLimit } from "@b/handler/Middleware";
import { logP2PAdminAction } from "../../../../p2p/utils/ownership";

export const metadata = {
  summary: "Flag P2P Offer (Admin)",
  description: "Flags a user offer on the P2P platform for review.",
  operationId: "flagAdminP2POffer",
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
  requestBody: {
    description: "Reason for flagging",
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
    200: { description: "Offer flagged successfully." },
    401: { description: "Unauthorized." },
    404: { description: "Offer not found." },
    500: { description: "Internal Server Error." },
  },
  permission: "edit.p2p.offer",
};

export default async (data) => {
  const { params, body, user } = data;
  const { id } = params;
  const { reason } = body;

  // Import validation utilities
  const { sanitizeInput } = await import("../../../../p2p/utils/validation");
  const { notifyOfferEvent } = await import("../../../../p2p/utils/notifications");

  try {
    const offer = await models.p2pOffer.findByPk(id, {
      include: [
        {
          model: models.user,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
    });

    if (!offer) {
      throw createError({ statusCode: 404, message: "Offer not found" });
    }

    // Get admin user data for logging
    const adminUser = await models.user.findByPk(user.id, {
      attributes: ["id", "firstName", "lastName", "email"],
    });

    // Sanitize flag reason
    const sanitizedReason = sanitizeInput(reason);
    const adminName = adminUser
      ? `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || 'Admin'
      : 'Admin';

    // Update offer with flag information
    await offer.update({
      isFlagged: true,
      flagReason: sanitizedReason,
      flaggedBy: user.id,
      flaggedAt: new Date(),
      activityLog: [
        ...(offer.activityLog || []),
        {
          type: "FLAGGED",
          reason: sanitizedReason,
          adminId: user.id,
          adminName: adminName,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    // Log admin activity
    await logP2PAdminAction(
      user.id,
      "OFFER_FLAGGED",
      "OFFER",
      offer.id,
      {
        offerUserId: offer.userId,
        offerType: offer.type,
        currency: offer.currency,
        previousStatus: offer.status,
        reason: sanitizedReason,
        flaggedBy: adminName,
      }
    );

    // Send notification to offer owner
    notifyOfferEvent(offer.id, "OFFER_FLAGGED", {
      reason: sanitizedReason,
      flaggedBy: adminName,
    }).catch(console.error);

    return {
      message: "Offer flagged successfully.",
      offer: {
        id: offer.id,
        isFlagged: true,
        flaggedAt: offer.flaggedAt,
      }
    };
  } catch (err) {
    if (err.statusCode) {
      throw err;
    }
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
