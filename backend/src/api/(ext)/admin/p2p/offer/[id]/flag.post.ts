import { models } from "@b/db";
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
  summary: "Flag P2P offer for review",
  description: "Flags a P2P offer for administrative review. Marks the offer as flagged with a reason and notifies the offer owner. Does not change the offer status.",
  operationId: "flagAdminP2POffer",
  tags: ["Admin", "P2P", "Offer"],
  requiresAuth: true,
  middleware: [p2pAdminOfferRateLimit],
  logModule: "ADMIN_P2P",
  logTitle: "Flag P2P offer",
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
    });

    if (!offer) {
      ctx?.fail("Offer not found");
      throw createError({ statusCode: 404, message: "Offer not found" });
    }

    ctx?.step("Getting admin information");
    // Get admin user data for logging
    const adminUser = await models.user.findByPk(user.id, {
      attributes: ["id", "firstName", "lastName", "email"],
    });

    // Sanitize flag reason
    const sanitizedReason = sanitizeInput(reason);
    const adminName = adminUser
      ? `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || 'Admin'
      : 'Admin';

    ctx?.step("Flagging offer");
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

    ctx?.step("Logging admin activity");
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

    ctx?.step("Sending notification");
    // Send notification to offer owner
    notifyOfferEvent(offer.id, "OFFER_FLAGGED", {
      reason: sanitizedReason,
      flaggedBy: adminName,
    }).catch((error) => logger.error("P2P", "Failed to send offer flagged notification", error));

    ctx?.success("Offer flagged successfully");
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
    ctx?.fail("Failed to flag offer");
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
