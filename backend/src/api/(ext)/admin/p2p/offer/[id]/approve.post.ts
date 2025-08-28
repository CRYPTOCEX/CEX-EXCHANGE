import { models } from "@b/db";
import { createError } from "@b/utils/error";

import { p2pAdminOfferRateLimit } from "@b/handler/Middleware";
import { logP2PAdminAction } from "../../../../p2p/utils/ownership";

export const metadata = {
  summary: "Approve P2P Offer (Admin)",
  description: "Approves a user offer on the P2P platform.",
  operationId: "approveAdminP2POffer",
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
    401: { description: "Unauthorized." },
    404: { description: "Offer not found." },
    500: { description: "Internal Server Error." },
  },
  permission: "Access P2P Management",
};

export default async (data) => {
  const { params, body, user } = data;
  const { id } = params;
  const { notes } = body;

  // Import validation utilities
  const { sanitizeInput, validateOfferStatusTransition } = await import("../../../../p2p/utils/validation");
  const { notifyOfferEvent } = await import("../../../../p2p/utils/notifications");

  try {
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
      throw createError({ statusCode: 404, message: "Offer not found" });
    }

    // Validate status transition
    if (!validateOfferStatusTransition(offer.status, "ACTIVE")) {
      throw createError({ 
        statusCode: 400, 
        message: `Cannot approve offer from status: ${offer.status}` 
      });
    }

    // Validate offer has all required fields
    if (!offer.amountConfig?.total || offer.amountConfig.total <= 0) {
      throw createError({ 
        statusCode: 400, 
        message: "Cannot approve offer with zero or invalid amount" 
      });
    }

    if (!offer.paymentMethods || offer.paymentMethods.length === 0) {
      throw createError({ 
        statusCode: 400, 
        message: "Cannot approve offer without payment methods" 
      });
    }

    // Sanitize admin notes if provided
    const sanitizedNotes = notes ? sanitizeInput(notes) : null;

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
          adminName: `${user.firstName} ${user.lastName}`,
          createdAt: new Date().toISOString(),
        },
      ],
    });

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
        approvedBy: `${user.firstName} ${user.lastName}`,
      }
    );

    // Send notification to offer owner
    notifyOfferEvent(offer.id, "OFFER_APPROVED", {
      adminNotes: sanitizedNotes,
      approvedBy: `${user.firstName} ${user.lastName}`,
    }).catch(console.error);

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
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
