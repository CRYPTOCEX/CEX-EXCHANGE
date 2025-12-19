import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";
import { CacheManager } from "@b/utils/cache";
import { safeParseJSON } from "@b/api/(ext)/p2p/utils/json-parser";
import { logger } from "@b/utils/console";

export const metadata = {
  summary: "Updates a P2P offer",
  description: "Updates specific fields of a P2P offer with security restrictions",
  tags: ["P2P", "Offers"],
  logModule: "P2P_OFFER",
  logTitle: "Update P2P offer",
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
            priceConfig: {
              type: "object",
              properties: {
                model: { type: "string", enum: ["fixed", "dynamic"] },
                fixedPrice: { type: "number", minimum: 0 },
                dynamicOffset: { type: "number", minimum: -50, maximum: 50 },
                currency: { type: "string" },
              },
            },
            amountConfig: {
              type: "object",
              properties: {
                min: { type: "number", minimum: 0 },
                max: { type: "number", minimum: 0 },
                total: { type: "number", minimum: 0 },
              },
            },
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
  priceConfig?: any;
  amountConfig?: any;
  tradeSettings?: any;
  locationSettings?: any;
  userRequirements?: any;
  paymentMethodIds?: string[];
  status?: string;
}

export default async (data: { user?: any; params: any; body: any; ctx?: any }) => {
  const { user, params, body, ctx } = data;
  const { id } = params;

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized: User not authenticated",
    });
  }

  ctx?.step("Finding and validating offer ownership");
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

  ctx?.step("Validating and preparing update data");
  // Validate and prepare update data
  const allowedFields = ["priceConfig", "amountConfig", "tradeSettings", "locationSettings", "userRequirements", "paymentMethodIds", "status"];
  const jsonFields = ["priceConfig", "amountConfig", "tradeSettings", "locationSettings", "userRequirements"];
  const updateData: UpdateData = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      // Ensure JSON fields are objects using robust parser
      if (jsonFields.includes(field)) {
        const parsed = safeParseJSON(body[field]);
        if (parsed !== null) {
          (updateData as any)[field] = parsed;
        } else {
          throw createError({
            statusCode: 400,
            message: `Invalid JSON for field ${field}`,
          });
        }
      } else {
        (updateData as any)[field] = body[field];
      }
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

  // Validate and process priceConfig
  if (updateData.priceConfig) {
    const priceConfig = updateData.priceConfig;
    const existingPriceConfig = typeof offer.priceConfig === "string"
      ? JSON.parse(offer.priceConfig)
      : offer.priceConfig || {};

    // Validate price model
    if (priceConfig.model && !["fixed", "dynamic"].includes(priceConfig.model)) {
      throw createError({
        statusCode: 400,
        message: "Invalid price model. Must be 'fixed' or 'dynamic'",
      });
    }

    // Validate fixed price
    if (priceConfig.model === "fixed") {
      // When switching to fixed, ensure fixedPrice is provided
      const fixedPrice = priceConfig.fixedPrice !== undefined
        ? priceConfig.fixedPrice
        : existingPriceConfig.fixedPrice || existingPriceConfig.finalPrice || 0;

      if (fixedPrice < 0) {
        throw createError({
          statusCode: 400,
          message: "Fixed price must be greater than or equal to 0",
        });
      }

      // Set fixedPrice in the incoming config
      priceConfig.fixedPrice = fixedPrice;
    }

    // Validate dynamic offset
    if (priceConfig.model === "dynamic") {
      // When switching to dynamic, ensure dynamicOffset is provided
      const dynamicOffset = priceConfig.dynamicOffset !== undefined
        ? Number(priceConfig.dynamicOffset)
        : Number(existingPriceConfig.dynamicOffset) || 0;

      if (dynamicOffset < -50 || dynamicOffset > 50) {
        throw createError({
          statusCode: 400,
          message: "Dynamic offset must be between -50% and +50%",
        });
      }

      // Set dynamicOffset in the incoming config with explicit number type
      priceConfig.dynamicOffset = dynamicOffset;
    }

    // Merge with existing priceConfig and ensure finalPrice is updated
    // IMPORTANT: Only keep fields relevant to the current model to prevent data inconsistencies
    const targetModel = priceConfig.model || existingPriceConfig.model || "fixed";
    const mergedPriceConfig: any = {
      model: targetModel,
      currency: priceConfig.currency || existingPriceConfig.currency,
    };

    // Add only the relevant fields based on model to minimize JSON size and prevent conflicts
    if (mergedPriceConfig.model === "fixed") {
      // For fixed price model, ONLY keep fixedPrice - remove any dynamic fields
      mergedPriceConfig.fixedPrice = priceConfig.fixedPrice !== undefined
        ? priceConfig.fixedPrice
        : (existingPriceConfig.fixedPrice || existingPriceConfig.finalPrice || 0);

      // Explicitly DO NOT include dynamicOffset or marketPrice when in fixed mode
    } else {
      // For dynamic model, ONLY keep dynamicOffset and marketPrice - remove fixedPrice
      mergedPriceConfig.dynamicOffset = priceConfig.dynamicOffset !== undefined
        ? priceConfig.dynamicOffset
        : (existingPriceConfig.dynamicOffset || 0);
      mergedPriceConfig.marketPrice = priceConfig.marketPrice || existingPriceConfig.marketPrice;

      // Explicitly DO NOT include fixedPrice when in dynamic mode
    }

    // Calculate finalPrice based on model
    if (mergedPriceConfig.model === "fixed") {
      // Use the fixedPrice we validated above
      mergedPriceConfig.finalPrice = mergedPriceConfig.fixedPrice;
      mergedPriceConfig.value = mergedPriceConfig.finalPrice;
    } else if (mergedPriceConfig.model === "dynamic") {
      // For dynamic pricing, keep existing finalPrice or marketPrice logic
      // The actual market price calculation should happen elsewhere
      if (!mergedPriceConfig.finalPrice) {
        mergedPriceConfig.finalPrice = mergedPriceConfig.marketPrice || existingPriceConfig.finalPrice || 0;
      }
    }

    updateData.priceConfig = mergedPriceConfig;

    // Also update priceCurrency at the top level
    if (priceConfig.currency) {
      (updateData as any).priceCurrency = priceConfig.currency;
    }
  }

  // Validate and process amountConfig
  if (updateData.amountConfig) {
    const amountConfig = updateData.amountConfig;
    const existingAmountConfig = typeof offer.amountConfig === "string"
      ? JSON.parse(offer.amountConfig)
      : offer.amountConfig || {};

    // Validate amounts
    if (amountConfig.min !== undefined && amountConfig.min < 0) {
      throw createError({
        statusCode: 400,
        message: "Minimum amount must be greater than or equal to 0",
      });
    }

    if (amountConfig.max !== undefined && amountConfig.max < 0) {
      throw createError({
        statusCode: 400,
        message: "Maximum amount must be greater than or equal to 0",
      });
    }

    if (amountConfig.total !== undefined && amountConfig.total < 0) {
      throw createError({
        statusCode: 400,
        message: "Total amount must be greater than or equal to 0",
      });
    }

    // Validate min <= max
    const finalMin = amountConfig.min !== undefined ? amountConfig.min : existingAmountConfig.min;
    const finalMax = amountConfig.max !== undefined ? amountConfig.max : existingAmountConfig.max;

    if (finalMin > finalMax) {
      throw createError({
        statusCode: 400,
        message: "Minimum amount cannot be greater than maximum amount",
      });
    }

    // Merge with existing amountConfig
    updateData.amountConfig = {
      ...existingAmountConfig,
      ...amountConfig,
    };

    // Also update top-level min/max limits for compatibility
    if (amountConfig.min !== undefined) {
      (updateData as any).minLimit = amountConfig.min;
    }
    if (amountConfig.max !== undefined) {
      (updateData as any).maxLimit = amountConfig.max;
    }
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

  // Check if auto-approval is enabled
  const cacheManager = CacheManager.getInstance();
  const autoApprove = await cacheManager.getSetting("p2pAutoApproveOffers");
  const shouldAutoApprove = autoApprove === true || autoApprove === "true";

  // Set offer to PENDING_APPROVAL or ACTIVE after editing, BUT preserve user's status choice if explicitly provided
  const isStatusOnlyChange = Object.keys(updateData).length === 1 && updateData.status;
  const userExplicitlySetStatus = updateData.status !== undefined;

  if (!isStatusOnlyChange && !userExplicitlySetStatus) {
    // Only auto-set status if user didn't explicitly set it
    updateData.status = shouldAutoApprove ? "ACTIVE" : "PENDING_APPROVAL";
  }
  // If user explicitly set status (ACTIVE or PAUSED), preserve it even with other changes

  ctx?.step("Updating offer with new configuration");
  let transaction: any;

  try {
    // Start transaction for atomic updates
    transaction = await sequelize.transaction();

    // Remove paymentMethodIds from updateData before updating the offer
    const { paymentMethodIds, ...offerUpdateData } = updateData;

    // Update the offer - model setters will handle JSON serialization
    await offer.update(offerUpdateData, { transaction });

    // Update payment methods if provided
    if (paymentMethodIds) {
      ctx?.step(`Updating payment methods (${paymentMethodIds.length} methods)`);
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

    const message = shouldAutoApprove
      ? "Offer updated successfully. Your offer is now active."
      : "Offer updated successfully. Your offer is now pending approval.";

    ctx?.success(`Updated offer ${id} (status: ${updatedOffer?.status})`);

    return {
      message,
      data: updatedOffer,
    };
  } catch (error: any) {
    // Only rollback if transaction exists and hasn't been committed/rolled back
    if (transaction) {
      try {
        // Check if transaction is still active before attempting rollback
        if (!transaction.finished) {
          await transaction.rollback();
        }
      } catch (rollbackError: any) {
        // Silently ignore common rollback errors that occur after connection issues
        const errorMessage = rollbackError.message || "";
        const isIgnorableError =
          errorMessage.includes("already been finished") ||
          errorMessage.includes("closed state") ||
          errorMessage.includes("ECONNRESET");

        if (!isIgnorableError) {
          logger.error("P2P_OFFER", "Transaction rollback failed", rollbackError);
        }
      }
    }

    // Provide more specific error messages
    if (error.name === 'SequelizeValidationError') {
      throw createError({
        statusCode: 400,
        message: `Validation error: ${error.message}`,
      });
    }

    if (error.name === 'SequelizeDatabaseError') {
      throw createError({
        statusCode: 500,
        message: `Database error: ${error.message}`,
      });
    }

    // Handle connection errors specifically
    if (error.code === 'ECONNRESET' || error.message?.includes('ECONNRESET')) {
      throw createError({
        statusCode: 500,
        message: "Database connection error. Please try again.",
      });
    }

    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Failed to update offer",
    });
  }
}; 