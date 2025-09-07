import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { p2pAdminOfferRateLimit } from "@b/handler/Middleware";
import { createNotification } from "@b/utils/notifications";
import { 
  sendOfferApprovalEmail, 
  sendOfferRejectionEmail, 
  sendOfferFlaggedEmail, 
  sendOfferDisabledEmail 
} from "../../utils";

export const metadata = {
  summary: "Update P2P Offer (Admin)",
  description: "Updates a P2P offer with admin privileges. Automatically handles approval/rejection notifications based on status changes.",
  operationId: "updateAdminP2POffer",
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
    description: "Offer update data",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            type: { 
              type: "string",
              enum: ["BUY", "SELL"],
              description: "Trade type"
            },
            currency: { 
              type: "string",
              description: "Cryptocurrency"
            },
            walletType: { 
              type: "string",
              enum: ["SPOT", "FIAT", "ECO"],
              description: "Wallet type"
            },
            status: {
              type: "string",
              enum: ["ACTIVE", "PENDING_APPROVAL", "PAUSED", "DISABLED", "FLAGGED", "REJECTED", "DRAFT", "COMPLETED", "CANCELLED", "EXPIRED"],
              description: "Offer status"
            },
            amountConfig: {
              type: "string",
              description: "JSON string of amount configuration"
            },
            priceConfig: {
              type: "string", 
              description: "JSON string of price configuration"
            },
            tradeSettings: {
              type: "string",
              description: "JSON string of trade settings"
            },
            locationSettings: {
              type: "string",
              description: "JSON string of location settings"
            },
            userRequirements: {
              type: "string",
              description: "JSON string of user requirements"
            },
            paymentMethodIds: {
              type: "array",
              items: { type: "string" },
              description: "Array of payment method IDs"
            },
            adminNotes: {
              type: "string",
              description: "Admin notes about the offer"
            },
            rejectionReason: {
              type: "string",
              description: "Reason for rejection (used when status is set to REJECTED)"
            },
          },
        },
      },
    },
  },
  responses: {
    200: { description: "Offer updated successfully" },
    401: { description: "Unauthorized" },
    404: { description: "Offer not found" },
    500: { description: "Internal Server Error" },
  },
  permission: "Access P2P Management",
};

export default async (data: any) => {
  const { params, body, user } = data;
  const { id } = params;

  try {
    // First, find the offer without associations to avoid issues
    const offer = await models.p2pOffer.findByPk(id);

    if (!offer) {
      throw createError({ statusCode: 404, message: "Offer not found" });
    }
    
    // Get user data separately
    const offerUser = await models.user.findByPk(offer.userId, {
      attributes: ["id", "firstName", "lastName", "email"],
    });
    
    // Store original status for comparison
    const originalStatus = offer.status;

    // Prepare update data
    const updateData: any = {};

    // Basic fields
    if (body.type !== undefined) updateData.type = body.type;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.walletType !== undefined) updateData.walletType = body.walletType;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.adminNotes !== undefined) updateData.adminNotes = body.adminNotes;

    // JSON fields - parse if string, keep as object for Sequelize
    if (body.amountConfig !== undefined) {
      try {
        const amountConfig = typeof body.amountConfig === 'string' 
          ? JSON.parse(body.amountConfig) 
          : body.amountConfig;
        // Store as object, not string - Sequelize will handle JSON serialization
        updateData.amountConfig = amountConfig;
      } catch (e) {
        throw createError({ statusCode: 400, message: "Invalid amountConfig format" });
      }
    }

    if (body.priceConfig !== undefined) {
      try {
        const priceConfig = typeof body.priceConfig === 'string'
          ? JSON.parse(body.priceConfig)
          : body.priceConfig;
        // Store as object, not string
        updateData.priceConfig = priceConfig;
      } catch (e) {
        throw createError({ statusCode: 400, message: "Invalid priceConfig format" });
      }
    }

    if (body.tradeSettings !== undefined) {
      try {
        const tradeSettings = typeof body.tradeSettings === 'string'
          ? JSON.parse(body.tradeSettings)
          : body.tradeSettings;
        // Store as object, not string
        updateData.tradeSettings = tradeSettings;
      } catch (e) {
        throw createError({ statusCode: 400, message: "Invalid tradeSettings format" });
      }
    }

    if (body.locationSettings !== undefined) {
      try {
        const locationSettings = typeof body.locationSettings === 'string'
          ? JSON.parse(body.locationSettings)
          : body.locationSettings;
        // Store as object, not string
        updateData.locationSettings = locationSettings;
      } catch (e) {
        throw createError({ statusCode: 400, message: "Invalid locationSettings format" });
      }
    }

    if (body.userRequirements !== undefined) {
      try {
        const userRequirements = typeof body.userRequirements === 'string'
          ? JSON.parse(body.userRequirements)
          : body.userRequirements;
        // Store as object, not string
        updateData.userRequirements = userRequirements;
      } catch (e) {
        throw createError({ statusCode: 400, message: "Invalid userRequirements format" });
      }
    }

    // Handle status-specific actions
    let actionType = "ADMIN_UPDATE";
    let shouldSendEmail = false;
    let emailType = "";
    let emailReplacements: Record<string, string> = {};
    
    if (body.status && body.status !== originalStatus) {
      switch (body.status) {
        case "ACTIVE":
          if (originalStatus === "PENDING_APPROVAL") {
            actionType = "OFFER_APPROVED";
            shouldSendEmail = true;
            emailType = "approval";
            emailReplacements = {
              OFFER_TYPE: offer.type,
              CURRENCY: offer.currency,
              APPROVED_BY: `${user.firstName} ${user.lastName}`,
              NOTES: body.adminNotes || "",
              USER_NAME: `${offerUser.firstName} ${offerUser.lastName}`,
            };
          }
          break;
          
        case "REJECTED":
          actionType = "OFFER_REJECTED";
          shouldSendEmail = true;
          emailType = "rejection";
          emailReplacements = {
            OFFER_TYPE: offer.type,
            CURRENCY: offer.currency,
            REJECTED_BY: `${user.firstName} ${user.lastName}`,
            REASON: body.rejectionReason || "Does not meet platform requirements",
            USER_NAME: `${offerUser.firstName} ${offerUser.lastName}`,
          };
          // Store rejection reason in admin notes
          updateData.adminNotes = `Rejected: ${body.rejectionReason || "No reason provided"}\n${body.adminNotes || ""}`;
          break;
          
        case "FLAGGED":
          actionType = "OFFER_FLAGGED";
          shouldSendEmail = true;
          emailType = "flagged";
          emailReplacements = {
            OFFER_TYPE: offer.type,
            CURRENCY: offer.currency,
            FLAGGED_BY: `${user.firstName} ${user.lastName}`,
            REASON: body.adminNotes || "Flagged for review",
            USER_NAME: `${offerUser.firstName} ${offerUser.lastName}`,
          };
          break;
          
        case "DISABLED":
          actionType = "OFFER_DISABLED";
          shouldSendEmail = true;
          emailType = "disabled";
          emailReplacements = {
            OFFER_TYPE: offer.type,
            CURRENCY: offer.currency,
            DISABLED_BY: `${user.firstName} ${user.lastName}`,
            REASON: body.adminNotes || "Disabled by admin",
            USER_NAME: `${offerUser.firstName} ${offerUser.lastName}`,
          };
          break;
      }
    }

    // Note: Activity log should be stored separately, not in the offer model
    // You could create a separate p2pOfferActivityLog table if needed

    // Update the offer
    await offer.update(updateData);

    // Handle payment methods if provided
    if (body.paymentMethodIds && Array.isArray(body.paymentMethodIds)) {
      try {
        // Use the offer's association methods instead of direct table manipulation
        const offerWithAssociations = await models.p2pOffer.findByPk(id);
        
        if (offerWithAssociations && offerWithAssociations.setPaymentMethods) {
          // This will automatically handle the join table
          await offerWithAssociations.setPaymentMethods(body.paymentMethodIds);
        } else {
          // Fallback: Use raw query with proper parameterization
          await models.sequelize.query(
            'DELETE FROM p2p_offer_payment_method WHERE offerId = :offerId',
            {
              replacements: { offerId: id },
              type: models.sequelize.QueryTypes.DELETE,
            }
          );

          // Insert new associations one by one with parameterization
          for (const methodId of body.paymentMethodIds) {
            await models.sequelize.query(
              'INSERT INTO p2p_offer_payment_method (offerId, paymentMethodId) VALUES (:offerId, :methodId)',
              {
                replacements: { offerId: id, methodId: methodId },
                type: models.sequelize.QueryTypes.INSERT,
              }
            );
          }
        }
      } catch (pmError) {
        console.error("Error updating payment methods:", pmError);
        // Don't fail the entire update if payment methods fail
      }
    }

    // Send email notification if status changed
    if (shouldSendEmail && offerUser?.email) {
      try {
        switch (emailType) {
          case "approval":
            await sendOfferApprovalEmail(offerUser.email, emailReplacements);
            break;
          case "rejection":
            await sendOfferRejectionEmail(offerUser.email, emailReplacements);
            break;
          case "flagged":
            await sendOfferFlaggedEmail(offerUser.email, emailReplacements);
            break;
          case "disabled":
            await sendOfferDisabledEmail(offerUser.email, emailReplacements);
            break;
        }
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
        // Don't throw error for email failures
      }
    }

    // Create notification for the user
    if (body.status && body.status !== originalStatus && offerUser) {
      try {
        let notificationTitle = "";
        let notificationMessage = "";
        
        switch (body.status) {
          case "ACTIVE":
            notificationTitle = "Offer Approved";
            notificationMessage = `Your ${offer.type} offer for ${offer.currency} has been approved and is now active.`;
            break;
          case "REJECTED":
            notificationTitle = "Offer Rejected";
            notificationMessage = `Your ${offer.type} offer for ${offer.currency} has been rejected. Reason: ${body.rejectionReason || "Does not meet requirements"}`;
            break;
          case "FLAGGED":
            notificationTitle = "Offer Flagged";
            notificationMessage = `Your ${offer.type} offer for ${offer.currency} has been flagged for review.`;
            break;
          case "DISABLED":
            notificationTitle = "Offer Disabled";
            notificationMessage = `Your ${offer.type} offer for ${offer.currency} has been disabled by an administrator.`;
            break;
        }
        
        if (notificationMessage) {
          await createNotification({
            userId: offerUser.id,
            type: "system",
            title: notificationTitle,
            message: notificationMessage,
            link: `/p2p/offer/${offer.id}`,
          });
        }
      } catch (notifError) {
        console.error("Failed to create notification:", notifError);
        // Don't throw error for notification failures
      }
    }

    // Fetch updated offer
    const updatedOffer = await models.p2pOffer.findByPk(id);
    
    // Add user data
    if (updatedOffer && offerUser) {
      updatedOffer.dataValues.user = offerUser.dataValues;
    }
    
    // Add payment methods
    if (updatedOffer && body.paymentMethodIds && body.paymentMethodIds.length > 0) {
      try {
        const paymentMethods = await models.p2pPaymentMethod.findAll({
          where: { 
            id: body.paymentMethodIds 
          },
          attributes: ["id", "name", "icon"],
          raw: true,
        });
        updatedOffer.dataValues.paymentMethods = paymentMethods;
      } catch (pmError) {
        console.error("Error fetching payment methods:", pmError);
        // Don't fail the whole request if payment methods can't be fetched
        updatedOffer.dataValues.paymentMethods = [];
      }
    } else {
      updatedOffer.dataValues.paymentMethods = [];
    }

    // Log admin action
    try {
      const { logP2PAdminAction } = await import("../../../../p2p/utils/ownership");
      await logP2PAdminAction(
        user.id,
        actionType,
        "OFFER",
        offer.id,
        {
          offerUserId: offer.userId,
          offerType: offer.type,
          currency: offer.currency,
          changes: Object.keys(updateData).filter(key => key !== 'activityLog'),
          updatedBy: `${user.firstName} ${user.lastName}`,
          statusChange: body.status && originalStatus !== body.status ? `${originalStatus} -> ${body.status}` : null,
        }
      );
    } catch (logError) {
      console.error("Failed to log admin action:", logError);
      // Don't throw error for logging failures
    }

    return {
      message: body.status && body.status !== originalStatus 
        ? `Offer ${body.status.toLowerCase()} successfully` 
        : "Offer updated successfully",
      data: updatedOffer,
    };
  } catch (err: any) {
    if (err.statusCode) {
      throw err;
    }
    throw createError({
      statusCode: 500,
      message: err.message || "Internal Server Error",
    });
  }
};