// backend/src/api/p2p/offers/create.post.ts

import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { getWalletSafe } from "@b/api/finance/wallet/utils";

export const metadata = {
  summary: "Create a P2P Offer",
  description:
    "Creates a new offer with structured configurations for the authenticated user, and associates payment methods.",
  operationId: "createP2POffer",
  tags: ["P2P", "Offer"],
  requiresAuth: true,
  middleware: ["p2pOfferCreateRateLimit"],
  requestBody: {
    description: "Complete P2P offer payload",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["BUY", "SELL"] },
            currency: { type: "string" },
            walletType: { type: "string", enum: ["FIAT", "SPOT", "ECO"] },
            amountConfig: {
              type: "object",
              properties: {
                total: { type: "number" },
                min: { type: "number" },
                max: { type: "number" },
                availableBalance: { type: "number" },
              },
              required: ["total"],
            },
            priceConfig: {
              type: "object",
              properties: {
                model: { type: "string", enum: ["FIXED", "MARGIN"] },
                value: { type: "number" },
                marketPrice: { type: "number" },
                finalPrice: { type: "number" },
              },
              required: ["model", "value", "finalPrice"],
            },
            tradeSettings: {
              type: "object",
              properties: {
                autoCancel: { type: "number" },
                kycRequired: { type: "boolean" },
                visibility: {
                  type: "string",
                  enum: ["PUBLIC", "PRIVATE"],
                },
                termsOfTrade: { type: "string", minLength: 1 },
                additionalNotes: { type: "string" },
              },
              required: ["autoCancel", "kycRequired", "visibility", "termsOfTrade"],
            },
            locationSettings: {
              type: "object",
              properties: {
                country: { type: "string", minLength: 1 },
                region: { type: "string" },
                city: { type: "string" },
                restrictions: { type: "array", items: { type: "string" } },
              },
              required: ["country"],
            },
            userRequirements: {
              type: "object",
              properties: {
                minCompletedTrades: { type: "number" },
                minSuccessRate: { type: "number" },
                minAccountAge: { type: "number" },
                trustedOnly: { type: "boolean" },
              },
            },
            paymentMethodIds: {
              type: "array",
              items: { type: "string", format: "uuid" },
              description: "Array of P2P payment‐method IDs to attach",
              minItems: 1,
            },
          },
          required: [
            "type",
            "currency",
            "walletType",
            "amountConfig",
            "priceConfig",
            "tradeSettings",
            "locationSettings",
            "paymentMethodIds",
          ],
        },
      },
    },
  },
  responses: {
    200: { description: "Offer created successfully." },
    400: { description: "Bad Request." },
    401: { description: "Unauthorized." },
    500: { description: "Internal Server Error." },
  },
};

export default async function handler(data: { body: any; user?: any }) {
  const { user, body } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // Validate required fields
  if (!body.locationSettings?.country) {
    throw createError({
      statusCode: 400,
      message: "Location country is required for P2P offers",
    });
  }

  if (!body.tradeSettings?.termsOfTrade?.trim()) {
    throw createError({
      statusCode: 400,
      message: "Trade terms are required for P2P offers",
    });
  }

  if (!body.paymentMethodIds || body.paymentMethodIds.length === 0) {
    throw createError({
      statusCode: 400,
      message: "At least one payment method is required for P2P offers",
    });
  }

  // For SELL offers, validate user has sufficient balance
  if (body.type === "SELL") {
    const requiredAmount = body.amountConfig?.total || 0;
    if (requiredAmount <= 0) {
      throw createError({
        statusCode: 400,
        message: "Invalid amount specified for sell offer",
      });
    }

    try {
      const wallet = await getWalletSafe(user.id, body.walletType, body.currency);
      if (!wallet) {
        throw createError({
          statusCode: 400,
          message: `No ${body.walletType} wallet found for ${body.currency}`,
        });
      }

      const availableBalance = wallet.balance - wallet.inOrder;
      if (availableBalance < requiredAmount) {
        throw createError({
          statusCode: 400,
          message: `Insufficient balance. Available: ${availableBalance} ${body.currency}, Required: ${requiredAmount} ${body.currency}`,
        });
      }
    } catch (error: any) {
      // If it's already a createError, rethrow it
      if (error.statusCode) {
        throw error;
      }
      // Otherwise, wrap it in a generic error
      throw createError({
        statusCode: 400,
        message: "Unable to verify wallet balance",
      });
    }
  }

  // start a transaction so creation + associations roll back together
  const t = await sequelize.transaction();
  try {
    // 1. create the offer
    const offer = await models.p2pOffer.create(
      {
        userId: user.id,
        type: body.type,
        currency: body.currency,
        walletType: body.walletType,
        amountConfig: body.amountConfig,
        priceConfig: body.priceConfig,
        tradeSettings: body.tradeSettings,
        locationSettings: body.locationSettings ?? null,
        userRequirements: body.userRequirements ?? null,
        status: "PENDING_APPROVAL",
        views: 0,
        systemTags: [],
        adminNotes: null,
      },
      { transaction: t }
    );

    // 2. if any paymentMethodIds provided, validate & associate
    const ids: string[] = Array.isArray(body.paymentMethodIds)
      ? body.paymentMethodIds
      : [];

    if (ids.length) {
      // fetch and ensure all exist
      const methods = await models.p2pPaymentMethod.findAll({
        where: { id: ids },
        transaction: t,
      });
      if (methods.length !== ids.length) {
        throw createError({
          statusCode: 400,
          message: "One or more paymentMethodIds are invalid",
        });
      }
      // set the M:N association
      await offer.setPaymentMethods(methods, { transaction: t });
    }

    // commit everything
    await t.commit();

    // reload to include the paymentMethods in the response
    await offer.reload({ 
      include: [
        {
          model: models.p2pPaymentMethod,
          as: "paymentMethods",
          attributes: ["id", "name", "icon"],
          through: { attributes: [] },
        }
      ] 
    });

    return { message: "Offer created successfully.", offer };
  } catch (err: any) {
    await t.rollback();
    throw createError({
      statusCode: err.statusCode ?? 500,
      message: err.message
        ? `Internal Server Error: ${err.message}`
        : "Internal Server Error",
    });
  }
}
