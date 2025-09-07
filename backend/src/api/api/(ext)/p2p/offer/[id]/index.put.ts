import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";

export const metadata = {
  summary: "Updates a P2P offer",
  description: "Updates specific fields of a P2P offer with security restrictions",
  tags: ["P2P", "Offers"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "The ID of the P2P offer to update",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            tradeSettings: {
              type: "object",
              properties: {
                autoCancel: { type: "number", minimum: 5, maximum: 1440 },
                kycRequired: { type: "boolean" },
                visibility: { type: "string", enum: ["PUBLIC", "PRIVATE"] },
                termsOfTrade: { type: "string", maxLength: 1000 },
                additionalNotes: { type: "string", maxLength: 500 },
              },
            },
            locationSettings: {
              type: "object",
              properties: {
                country: { type: "string", maxLength: 100 },
                region: { type: "string", maxLength: 100 },
                city: { type: "string", maxLength: 100 },
                restrictions: { type: "array", items: { type: "string" } },
              },
            },
            userRequirements: {
              type: "object",
              properties: {
                minCompletedTrades: { type: "number", minimum: 0, maximum: 1000 },
                minSuccessRate: { type: "number", minimum: 0, maximum: 100 },
                minAccountAge: { type: "number", minimum: 0, maximum: 365 },
                trustedOnly: { type: "boolean" },
              },
            },
            paymentMethodIds: {
              type: "array",
              items: { type: "string", format: "uuid" },
              description: "Array of P2P payment method IDs to update",
              minItems: 1,
            },
            status: {
              type: "string",
              enum: ["ACTIVE", "PAUSED"],
              description: "Only ACTIVE and PAUSED statuses can be set by users",
            },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Offer updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: { type: "object" },
            },
          },
        },
      },
    },
    400: { description: "Invalid input data" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden - Not the offer owner" },
    404: { description: "Offer not found" },
    422: { description: "Cannot edit offer in current state" },
  },
  requiresAuth: true,
};

interface UpdateData {
  tradeSettings?: any;
  locationSettings?: any;
  userRequirements?: any;
  paymentMethodIds?: string[];
  status?: string;
}

export default async (data: { user?: any; params: any; body: any }) => {
  const { user, params, body } = data;
  const { id } = params;

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized: User not authenticated",
    });
  }

  // Use models directly
  const { p2pOffer, p2pPaymentMethod, p2pTrade } = models;

  // Find the offer and verify ownership
  const offer = await p2pOffer.findOne({
    where: { id, userId: user.id },
    include: [
      {
        model: p2pTrade,
        as: "trades",
        where: { status: { [Op.in]: ["PENDING", "ACTIVE", "ESCROW"] } },
        required: false,
      },
    ],
  });

  if (!offer) {
    throw createError({
      statusCode: 404,
      message: "Offer not found or you don't have permission to edit it",
    });
  }

  // Check if offer can be edited
  const canEdit = ["DRAFT", "PENDING_APPROVAL", "ACTIVE", "PAUSED"].includes(offer.status);
  if (!canEdit) {
    throw createError({
      statusCode: 422,
      message: `Cannot edit offer in ${offer.status} status`,
    });
  }

  // Check if there are active trades - restrict editing if so
  const activeTrades = offer.trades || [];
  if (activeTrades.length > 0) {
    throw createError({
      statusCode: 422,
      message: "Cannot edit offer while there are active trades. Please wait for trades to complete.",
    });
  }

  // Validate and prepare update data
  const allowedFields = ["tradeSettings", "locationSettings", "userRequirements", "paymentMethodIds", "status"];
  const updateData: UpdateData = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      (updateData as any)[field] = body[field];
    }
  }

  // Validate status changes
  if (updateData.status) {
    const allowedStatuses = ["ACTIVE", "PAUSED"];
    if (!allowedStatuses.includes(updateData.status)) {
      throw createError({
        statusCode: 400,
        message: "Invalid status. Only ACTIVE and PAUSED are allowed.",
      });
    }

    // If changing to ACTIVE, ensure offer is complete
    if (updateData.status === "ACTIVE" && offer.status === "DRAFT") {
      throw createError({
        statusCode: 422,
        message: "Cannot activate a draft offer. Please complete all required fields first.",
      });
    }
  }

  // Validate trade settings
  if (updateData.tradeSettings) {
    const settings = updateData.tradeSettings;
    
    if (settings.autoCancel !== undefined) {
      if (settings.autoCancel < 5 || settings.autoCancel > 1440) {
        throw createError({
          statusCode: 400,
          message: "Auto cancel time must be between 5 and 1440 minutes",
        });
      }
    }

    if (settings.termsOfTrade && settings.termsOfTrade.length > 1000) {
      throw createError({
        statusCode: 400,
        message: "Terms of trade cannot exceed 1000 characters",
      });
    }

    if (settings.additionalNotes && settings.additionalNotes.length > 500) {
      throw createError({
        statusCode: 400,
        message: "Additional notes cannot exceed 500 characters",
      });
    }

    // Merge with existing settings
    updateData.tradeSettings = {
      ...offer.tradeSettings,
      ...settings,
    };
  }

  // Validate user requirements
  if (updateData.userRequirements) {
    const requirements = updateData.userRequirements;
    
    if (requirements.minCompletedTrades !== undefined && (requirements.minCompletedTrades < 0 || requirements.minCompletedTrades > 1000)) {
      throw createError({
        statusCode: 400,
        message: "Minimum completed trades must be between 0 and 1000",
      });
    }

    if (requirements.minSuccessRate !== undefined && (requirements.minSuccessRate < 0 || requirements.minSuccessRate > 100)) {
      throw createError({
        statusCode: 400,
        message: "Minimum success rate must be between 0 and 100",
      });
    }

    if (requirements.minAccountAge !== undefined && (requirements.minAccountAge < 0 || requirements.minAccountAge > 365)) {
      throw createError({
        statusCode: 400,
        message: "Minimum account age must be between 0 and 365 days",
      });
    }

    // Merge with existing requirements
    updateData.userRequirements = {
      ...offer.userRequirements,
      ...requirements,
    };
  }

  // Validate location settings
  if (updateData.locationSettings) {
    const location = updateData.locationSettings;
    
    if (location.country && location.country.length > 100) {
      throw createError({
        statusCode: 400,
        message: "Country name cannot exceed 100 characters",
      });
    }

    if (location.region && location.region.length > 100) {
      throw createError({
        statusCode: 400,
        message: "Region name cannot exceed 100 characters",
      });
    }

    if (location.city && location.city.length > 100) {
      throw createError({
        statusCode: 400,
        message: "City name cannot exceed 100 characters",
      });
    }

    // Merge with existing location settings
    updateData.locationSettings = {
      ...offer.locationSettings,
      ...location,
    };
  }

  // Validate payment methods if provided
  if (updateData.paymentMethodIds) {
    if (!Array.isArray(updateData.paymentMethodIds) || updateData.paymentMethodIds.length === 0) {
      throw createError({
        statusCode: 400,
        message: "At least one payment method is required",
      });
    }

    // Verify all payment method IDs exist
    const existingMethods = await p2pPaymentMethod.findAll({
      where: { id: updateData.paymentMethodIds },
    });

    if (existingMethods.length !== updateData.paymentMethodIds.length) {
      throw createError({
        statusCode: 400,
        message: "One or more payment method IDs are invalid",
      });
    }
  }

  // If no valid fields to update
  if (Object.keys(updateData).length === 0) {
    throw createError({
      statusCode: 400,
      message: "No valid fields provided for update",
    });
  }

  // Set offer to PENDING_APPROVAL after editing (except for status-only changes)
  const isStatusOnlyChange = Object.keys(updateData).length === 1 && updateData.status;
  if (!isStatusOnlyChange) {
    updateData.status = "PENDING_APPROVAL";
  }

  try {
    // Start transaction for atomic updates
    const transaction = await sequelize.transaction();

    try {
      // Remove paymentMethodIds from updateData before updating the offer
      const { paymentMethodIds, ...offerUpdateData } = updateData;

      // Update the offer
      await offer.update(offerUpdateData, { transaction });

      // Update payment methods if provided
      if (paymentMethodIds) {
        await offer.setPaymentMethods(paymentMethodIds, { transaction });
      }

      // Commit transaction
      await transaction.commit();

      // Fetch updated offer with relations
      const updatedOffer = await p2pOffer.findByPk(offer.id, {
        include: [
          {
            model: p2pPaymentMethod,
            as: "paymentMethods",
            attributes: ["id", "name", "icon"],
            through: { attributes: [] },
          },
        ],
      });

      return {
        message: "Offer updated successfully. Your offer is now pending approval.",
        data: updatedOffer,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error("Error updating P2P offer:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to update offer",
    });
  }
}; 