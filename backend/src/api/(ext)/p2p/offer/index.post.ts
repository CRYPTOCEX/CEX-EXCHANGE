// backend/src/api/p2p/offers/create.post.ts

import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { getWalletSafe } from "@b/api/finance/wallet/utils";
import { Op } from "sequelize";
import { CacheManager } from "@b/utils/cache";

export const metadata = {
  summary: "Create a P2P Offer",
  description:
    "Creates a new offer with structured configurations for the authenticated user, and associates payment methods.",
  operationId: "createP2POffer",
  tags: ["P2P", "Offer"],
  requiresAuth: true,
  middleware: ["p2pOfferCreateRateLimit"],
  logModule: "P2P_OFFER",
  logTitle: "Create P2P offer",
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
                kycRequired: { type: "boolean", default: false },
                visibility: {
                  type: "string",
                  enum: ["PUBLIC", "PRIVATE"],
                },
                termsOfTrade: { type: "string", minLength: 1 },
                additionalNotes: { type: "string" },
              },
              required: ["autoCancel", "visibility", "termsOfTrade"],
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

export default async function handler(data: { body: any; user?: any; ctx?: any }) {
  const { user, body, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Validating required fields");
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

  // Log the incoming data for debugging
  console.log('[P2P Offer Create] Received body:', {
    type: body.type,
    currency: body.currency,
    paymentMethodIds: body.paymentMethodIds,
  });
  
  if (!body.paymentMethodIds || !Array.isArray(body.paymentMethodIds) || body.paymentMethodIds.length === 0) {
    console.error('[P2P Offer Create] Invalid payment methods:', body.paymentMethodIds);
    throw createError({
      statusCode: 400,
      message: "At least one payment method is required for P2P offers",
    });
  }

  ctx?.step("Checking offer type and requirements");
  // For SELL offers, check balance and lock funds at creation time
  // This ensures sellers can only create offers they can fulfill
  let sellerWallet: any = null;
  let requiredAmount = 0;

  if (body.type === "SELL") {
    ctx?.step("Checking seller balance for SELL offer");
    requiredAmount = body.amountConfig?.total || 0;
    if (requiredAmount <= 0) {
      throw createError({
        statusCode: 400,
        message: "Invalid amount specified for sell offer",
      });
    }

    // Get wallet and verify balance
    sellerWallet = await getWalletSafe(user.id, body.walletType, body.currency, false, ctx);
    if (!sellerWallet) {
      throw createError({
        statusCode: 400,
        message: `You don't have a ${body.currency} ${body.walletType} wallet. Please create one first.`,
      });
    }

    // Check available balance (balance - already locked in orders)
    const availableBalance = sellerWallet.balance - sellerWallet.inOrder;
    if (availableBalance < requiredAmount) {
      throw createError({
        statusCode: 400,
        message: `Insufficient balance. Available: ${availableBalance} ${body.currency}, Required: ${requiredAmount} ${body.currency}. Please deposit more funds to your ${body.walletType} wallet.`,
      });
    }
  }

  ctx?.step("Validating offer configuration and settings");
  // Check if auto-approval is enabled
  const cacheManager = CacheManager.getInstance();
  const autoApprove = await cacheManager.getSetting("p2pAutoApproveOffers");
  const shouldAutoApprove = autoApprove === true || autoApprove === "true";

  // Validate and prepare JSON fields to prevent double-encoding
  const jsonFields = ["amountConfig", "priceConfig", "tradeSettings", "locationSettings", "userRequirements"];
  const preparedData: any = {};

  for (const field of jsonFields) {
    if (body[field] !== undefined && body[field] !== null) {
      const value = body[field];
      // Ensure JSON fields are objects, not strings (prevent double-encoding)
      if (typeof value === 'string') {
        try {
          preparedData[field] = JSON.parse(value);
        } catch (e) {
          throw createError({
            statusCode: 400,
            message: `Invalid JSON for field ${field}`,
          });
        }
      } else if (typeof value === 'object') {
        preparedData[field] = value;
      }
    } else {
      preparedData[field] = null;
    }
  }

  // Set default kycRequired to false if not provided
  if (preparedData.tradeSettings && preparedData.tradeSettings.kycRequired === undefined) {
    preparedData.tradeSettings.kycRequired = false;
  }

  // Extract priceCurrency from priceConfig for convenience
  const priceCurrency = preparedData.priceConfig?.currency || "USD";

  // Validate min/max trade amounts against global settings
  const minTradeAmount = await cacheManager.getSetting("p2pMinimumTradeAmount");
  const maxTradeAmount = await cacheManager.getSetting("p2pMaximumTradeAmount");

  const offerMin = preparedData.amountConfig?.min || 0;
  const offerMax = preparedData.amountConfig?.max || preparedData.amountConfig?.total || 0;

  if (minTradeAmount && offerMin < minTradeAmount) {
    throw createError({
      statusCode: 400,
      message: `Minimum trade amount cannot be less than platform minimum of ${minTradeAmount} ${priceCurrency}`,
    });
  }

  if (maxTradeAmount && offerMax > maxTradeAmount) {
    throw createError({
      statusCode: 400,
      message: `Maximum trade amount cannot exceed platform maximum of ${maxTradeAmount} ${priceCurrency}`,
    });
  }

  // Validate currency-specific minimum trade amounts (for crypto dust prevention)
  const { validateMinimumTradeAmount } = await import("../utils/fees");

  // For crypto currencies, validate against currency-specific minimums
  // Min amount is in price currency (USD/EUR), need to convert to crypto
  if (preparedData.amountConfig?.min && preparedData.priceConfig?.finalPrice) {
    const cryptoMinAmount = preparedData.amountConfig.min / preparedData.priceConfig.finalPrice;
    const minimumValidation = await validateMinimumTradeAmount(cryptoMinAmount, body.currency);

    if (!minimumValidation.valid && minimumValidation.minimum) {
      throw createError({
        statusCode: 400,
        message: `Minimum trade amount for ${body.currency} is ${minimumValidation.minimum} ${body.currency}. Current minimum converts to ${cryptoMinAmount.toFixed(8)} ${body.currency}.`,
      });
    }
  }

  ctx?.step("Creating offer record");
  // start a transaction so creation + associations roll back together
  const t = await sequelize.transaction();
  try {
    // 1. create the offer - model setters will handle JSON serialization
    const offer = await models.p2pOffer.create(
      {
        userId: user.id,
        type: body.type,
        currency: body.currency,
        walletType: body.walletType,
        priceCurrency: priceCurrency,
        amountConfig: preparedData.amountConfig,
        priceConfig: preparedData.priceConfig,
        tradeSettings: preparedData.tradeSettings,
        locationSettings: preparedData.locationSettings,
        userRequirements: preparedData.userRequirements,
        status: shouldAutoApprove ? "ACTIVE" : "PENDING_APPROVAL",
        views: 0,
        systemTags: [],
        adminNotes: null,
      },
      { transaction: t }
    );

    // 2. For SELL offers, lock funds at offer creation
    // This ensures the seller cannot spend these funds elsewhere while the offer is active
    if (body.type === "SELL" && sellerWallet && requiredAmount > 0) {
      ctx?.step(`Locking ${requiredAmount} ${body.currency} for SELL offer`);
      await models.wallet.update(
        { inOrder: sellerWallet.inOrder + requiredAmount },
        { where: { id: sellerWallet.id }, transaction: t }
      );
      console.log('[P2P Offer Create] SELL offer - funds locked:', {
        userId: user.id,
        walletId: sellerWallet.id,
        walletType: body.walletType,
        currency: body.currency,
        amount: requiredAmount,
        previousInOrder: sellerWallet.inOrder,
        newInOrder: sellerWallet.inOrder + requiredAmount,
      });
    }

    // 3. if any paymentMethodIds provided, validate & associate
    const ids: string[] = Array.isArray(body.paymentMethodIds)
      ? body.paymentMethodIds
      : [];

    if (ids.length) {
      ctx?.step(`Validating and associating ${ids.length} payment method(s)`);
      console.log('[P2P Offer Create] Validating payment method IDs:', ids);

      // fetch and ensure all exist - also check for user-created methods
      const methods = await models.p2pPaymentMethod.findAll({
        where: {
          id: ids,
          [Op.or]: [
            { userId: null }, // System payment methods
            { userId: user.id } // User's custom payment methods
          ]
        },
        transaction: t,
      });

      console.log('[P2P Offer Create] Found payment methods:', methods.map(m => ({ id: m.id, name: m.name, userId: m.userId })));

      if (methods.length !== ids.length) {
        const foundIds = methods.map(m => m.id);
        const missingIds = ids.filter(id => !foundIds.includes(id));
        console.error('[P2P Offer Create] Missing payment method IDs:', missingIds);

        throw createError({
          statusCode: 400,
          message: `Invalid payment method IDs: ${missingIds.join(', ')}. Please ensure all payment methods are properly created first.`,
        });
      }
      // set the M:N association
      await offer.setPaymentMethods(methods, { transaction: t });
      console.log('[P2P Offer Create] Associated payment methods successfully');
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

    const offerStatus = shouldAutoApprove ? "ACTIVE" : "PENDING_APPROVAL";
    ctx?.success(`Created ${body.type} offer for ${body.amountConfig?.total} ${body.currency} (${offerStatus})`);

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
