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
  summary: "Approve P2P offer",
  description: "Approves a pending P2P offer and sets it to ACTIVE status. Validates offer requirements (amount, payment methods) and sends approval notification to the offer owner.",
  operationId: "approveAdminP2POffer",
  tags: ["Admin", "P2P", "Offer"],
  requiresAuth: true,
  middleware: [p2pAdminOfferRateLimit],
  logModule: "ADMIN_P2P",
  logTitle: "Approve P2P offer",
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
    description: "Optional notes for approval",
    required: false,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            notes: { type: "string" },
          },
        },
      },
    },
  },
  responses: {
    200: { description: "Offer approved successfully." },
    401: unauthorizedResponse,
    404: notFoundResponse("Resource"),
    500: serverErrorResponse,
  },
  permission: "edit.p2p.offer",
};

export default async (data) => {
  const { params, body, user, ctx } = data;
  const { id } = params;
  const { notes } = body;

  // Import validation utilities
  const { sanitizeInput, validateOfferStatusTransition } = await import("../../../../p2p/utils/validation");
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
        {
          model: models.p2pPaymentMethod,
          as: "paymentMethods",
          through: { attributes: [] },
        }
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

    ctx?.step("Validating offer status transition");
    // Validate status transition
    if (!validateOfferStatusTransition(offer.status, "ACTIVE")) {
      ctx?.fail(`Cannot approve offer from status: ${offer.status}`);
      throw createError({
        statusCode: 400,
        message: `Cannot approve offer from status: ${offer.status}`
      });
    }

    ctx?.step("Validating offer requirements");
    // Validate offer has all required fields
    if (!offer.amountConfig?.total || offer.amountConfig.total <= 0) {
      ctx?.fail("Offer has invalid amount");
      throw createError({
        statusCode: 400,
        message: "Cannot approve offer with zero or invalid amount"
      });
    }

    if (!offer.paymentMethods || offer.paymentMethods.length === 0) {
      ctx?.fail("Offer has no payment methods");
      throw createError({
        statusCode: 400,
        message: "Cannot approve offer without payment methods"
      });
    }

    // Sanitize admin notes if provided
    const sanitizedNotes = notes ? sanitizeInput(notes) : null;
    const adminName = adminUser
      ? `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || 'Admin'
      : 'Admin';

    ctx?.step("Approving offer");
    // Update offer with correct uppercase status
    await offer.update({
      status: "ACTIVE", // Fixed: uppercase status
      adminNotes: sanitizedNotes,
      approvedBy: user.id,
      approvedAt: new Date(),
      activityLog: [
        ...(offer.activityLog || []),
        {
          type: "APPROVAL",
          notes: sanitizedNotes,
          adminId: user.id,
          adminName: adminName,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    ctx?.step("Logging admin activity");
    // Log admin activity with enhanced audit trail
    await logP2PAdminAction(
      user.id,
      "OFFER_APPROVED",
      "OFFER",
      offer.id,
      {
        offerUserId: offer.userId,
        offerType: offer.type,
        currency: offer.currency,
        amount: offer.amountConfig.total,
        previousStatus: offer.status,
        adminNotes: sanitizedNotes,
        approvedBy: adminName,
      }
    );

    ctx?.step("Sending notification");
    // Send notification to offer owner
    notifyOfferEvent(offer.id, "OFFER_APPROVED", {
      adminNotes: sanitizedNotes,
      approvedBy: adminName,
    }).catch((error) => logger.error("P2P", "Failed to send offer approved notification", error));

    ctx?.success("Offer approved successfully");
    return {
      message: "Offer approved successfully.",
      offer: {
        id: offer.id,
        status: "ACTIVE",
        approvedAt: offer.approvedAt,
      }
    };
  } catch (err) {
    if (err.statusCode) {
      throw err;
    }
    ctx?.fail("Failed to approve offer");
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
