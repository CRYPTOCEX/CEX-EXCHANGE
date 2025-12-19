import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { getWalletSafe } from "@b/api/finance/wallet/utils";
import { notifyTradeEvent } from "@b/api/(ext)/p2p/utils/notifications";
import { createP2PAuditLog, P2PAuditEventType, P2PRiskLevel } from "@b/api/(ext)/p2p/utils/audit";
import { Op } from "sequelize";
import { parseAmountConfig, parsePriceConfig } from "@b/api/(ext)/p2p/utils/json-parser";
import { getEcosystemWalletUtils, isServiceAvailable } from "@b/utils/safe-imports";
import { logger } from "@b/utils/console";

export const metadata = {
  summary: "Initiate Trade from P2P Offer",
  description:
    "Creates a new trade from an active P2P offer with proper validation and balance locking",
  operationId: "initiateP2PTrade",
  tags: ["P2P", "Trade"],
  requiresAuth: true,
  logModule: "P2P_TRADE",
  logTitle: "Initiate P2P trade",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "Offer ID",
      required: true,
      schema: { type: "string", format: "uuid" },
    },
  ],
  requestBody: {
    description: "Trade initiation details",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            amount: { 
              type: "number", 
              minimum: 0,
              description: "Amount to trade"
            },
            paymentMethodId: { 
              type: "string", 
              format: "uuid",
              description: "Selected payment method ID"
            },
            message: {
              type: "string",
              maxLength: 500,
              description: "Optional initial message"
            }
          },
          required: ["amount", "paymentMethodId"],
        },
      },
    },
  },
  responses: {
    200: { description: "Trade initiated successfully." },
    400: { description: "Bad Request - Invalid offer or amount." },
    401: { description: "Unauthorized." },
    404: { description: "Offer not found." },
    409: { description: "Conflict - Offer unavailable or insufficient balance." },
    500: { description: "Internal Server Error." },
  },
};

export default async function handler(data: {
  params?: any;
  body: any;
  user?: any;
  ctx?: any;
}) {
  const { id } = data.params || {};
  const { amount, paymentMethodId, message } = data.body;
  const { user, ctx } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Finding and locking offer");
  let transaction;

  try {
    transaction = await sequelize.transaction();

    // 1. Find and lock the offer
    const offer = await models.p2pOffer.findOne({
      where: {
        id,
        status: "ACTIVE",
        userId: { [Op.ne]: user.id } // Can't trade with yourself
      },
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
      lock: true,
      transaction,
    });

    if (!offer) {
      throw createError({
        statusCode: 404,
        message: "Offer not found or unavailable"
      });
    }

    ctx?.step("Validating trade amount against offer limits");
    // 2. Validate amount against offer limits
    // amountConfig stores limits in the pricing currency (USD/EUR)
    // We need to convert these to the offer currency (BTC/ETH) if trading crypto

    // Parse JSON with robust parser that handles all cases
    const amountConfig = parseAmountConfig(offer.amountConfig);
    const priceConfig = parsePriceConfig(offer.priceConfig);

    const { min, max, total } = amountConfig;
    const price = priceConfig.finalPrice;

    // Validate that price exists for crypto trades
    if (price <= 0) {
      throw createError({
        statusCode: 500,
        message: `Invalid offer configuration: price must be greater than 0`
      });
    }

    // Determine if offer currency is fiat by checking if it exists in the currency table
    const fiatCurrency = await models.currency.findOne({
      where: { id: offer.currency, status: true },
      transaction
    });
    const isOfferFiatCurrency = !!fiatCurrency;

    let minAmount: number, maxAmount: number;
    if (isOfferFiatCurrency) {
      // Trading fiat: limits are already in the correct currency
      minAmount = min || 0;
      maxAmount = max || total || 0;
    } else {
      // Trading crypto: convert price currency limits to crypto amounts
      // amount (BTC) = limit (USD) / price (USD per BTC)
      minAmount = (min || 0) / price;
      maxAmount = (max || total || 0) / price;
    }

    if (amount < minAmount || amount > maxAmount) {
      throw createError({
        statusCode: 400,
        message: `Amount must be between ${minAmount} and ${maxAmount} ${offer.currency}`
      });
    }

    // 2b. Validate minimum trade amount to prevent dust trades (especially for BTC UTXO issues)
    const { validateMinimumTradeAmount } = await import("../../utils/fees");
    const minimumValidation = await validateMinimumTradeAmount(amount, offer.currency);
    if (!minimumValidation.valid) {
      throw createError({
        statusCode: 400,
        message: minimumValidation.message || `Amount below minimum for ${offer.currency}`,
      });
    }

    // 2c. Validate against platform global min/max trade amounts
    const { CacheManager } = await import("@b/utils/cache");
    const cacheManager = CacheManager.getInstance();
    const platformMinTradeAmount = await cacheManager.getSetting("p2pMinimumTradeAmount");
    const platformMaxTradeAmount = await cacheManager.getSetting("p2pMaximumTradeAmount");

    // Calculate the trade value in price currency (USD/EUR) for comparison
    const tradeValueInPriceCurrency = isOfferFiatCurrency ? amount : amount * price;

    if (platformMinTradeAmount && tradeValueInPriceCurrency < platformMinTradeAmount) {
      throw createError({
        statusCode: 400,
        message: `Trade amount (${tradeValueInPriceCurrency.toFixed(2)} ${priceConfig.currency || 'USD'}) is below platform minimum of ${platformMinTradeAmount}`,
      });
    }

    if (platformMaxTradeAmount && tradeValueInPriceCurrency > platformMaxTradeAmount) {
      throw createError({
        statusCode: 400,
        message: `Trade amount (${tradeValueInPriceCurrency.toFixed(2)} ${priceConfig.currency || 'USD'}) exceeds platform maximum of ${platformMaxTradeAmount}`,
      });
    }

    // 3. Verify payment method is allowed for this offer
    const allowedPaymentMethodIds = offer.paymentMethods.map((pm: any) => pm.id);
    if (!allowedPaymentMethodIds.includes(paymentMethodId)) {
      throw createError({
        statusCode: 400,
        message: "Selected payment method not allowed for this offer"
      });
    }

    // 4. Verify payment method exists and is available
    // Note: The payment method belongs to the offer creator, not the buyer
    // The buyer selects from the seller's payment methods
    const selectedPaymentMethod = await models.p2pPaymentMethod.findOne({
      where: {
        id: paymentMethodId,
        available: true
      },
      transaction,
    });

    if (!selectedPaymentMethod) {
      throw createError({
        statusCode: 400,
        message: "Invalid or unavailable payment method"
      });
    }

    // 5. Determine buyer and seller based on offer type
    const isBuyOffer = offer.type === "BUY";
    const buyerId = isBuyOffer ? offer.userId : user.id;
    const sellerId = isBuyOffer ? user.id : offer.userId;

    ctx?.step("Verifying seller balance and locking funds");
    // 6. Handle seller's balance verification and locking
    // - For SELL offers: Balance was already locked when offer was created, no additional locking needed
    // - For BUY offers: Responder is the seller, need to check balance and lock their funds NOW
    let sellerWallet = await getWalletSafe(
      sellerId,
      offer.walletType,
      offer.currency,
      false,
      ctx
    );

    // For BUY offers, the responder is the seller and needs a wallet with funds
    if (isBuyOffer) {
      ctx?.step(`Locking ${amount} ${offer.currency} for seller (BUY offer)`);
      // Create seller wallet if it doesn't exist
      if (!sellerWallet) {
        if (offer.walletType === "ECO") {
          // For ECO wallets, use the ecosystem wallet creation function
          const ecosystemUtils = await getEcosystemWalletUtils();
          if (!isServiceAvailable(ecosystemUtils)) {
            throw createError({
              statusCode: 503,
              message: "Ecosystem wallet service is not available"
            });
          }
          const { getWalletByUserIdAndCurrency } = ecosystemUtils;
          const seller = await models.user.findByPk(sellerId, { transaction });
          sellerWallet = await getWalletByUserIdAndCurrency(seller, offer.currency);
        } else {
          // For SPOT, FIAT, and other wallet types, create a simple wallet
          const newWallet = await models.wallet.create({
            userId: sellerId,
            currency: offer.currency,
            type: offer.walletType,
            balance: 0,
            inOrder: 0,
            status: true,
          }, { transaction });
          sellerWallet = newWallet.get({ plain: true });
        }
      }

      if (!sellerWallet) {
        throw createError({
          statusCode: 500,
          message: "Failed to create or retrieve seller wallet"
        });
      }

      // For BUY offers: Check available balance and lock funds
      // The responder (seller) needs to have funds to sell
      const availableBalance = sellerWallet.balance - sellerWallet.inOrder;
      if (availableBalance < amount) {
        throw createError({
          statusCode: 409,
          message: `Insufficient balance. Available: ${availableBalance} ${offer.currency}, Required: ${amount} ${offer.currency}. Please deposit more funds to your ${offer.walletType} wallet.`
        });
      }

      // Lock the seller's funds for BUY offers
      await models.wallet.update({
        inOrder: sellerWallet.inOrder + amount,
      }, {
        where: { id: sellerWallet.id },
        transaction
      });
    } else {
      // For SELL offers: Funds were already locked at offer creation
      // Just verify the seller's wallet exists and has sufficient locked funds
      if (!sellerWallet) {
        throw createError({
          statusCode: 500,
          message: "Seller wallet not found. The offer may be invalid."
        });
      }

      // Verify the seller still has enough locked funds (inOrder) for this trade
      // The funds should have been locked when the offer was created
      if (sellerWallet.inOrder < amount) {
        throw createError({
          statusCode: 409,
          message: `This offer is currently unavailable. The seller does not have sufficient ${offer.currency} balance to complete this trade.`
        });
      }
    }

    // Audit log for trade initiation (non-blocking)
    createP2PAuditLog({
      userId: sellerId,
      eventType: P2PAuditEventType.TRADE_INITIATED,
      entityType: "TRADE",
      entityId: offer.id,
      metadata: {
        offerId: offer.id,
        amount,
        currency: offer.currency,
        walletType: offer.walletType,
        walletInOrder: sellerWallet.inOrder,
        note: offer.walletType === "FIAT"
          ? "FIAT trade - balance locked on platform, payment happens peer-to-peer"
          : "Trade initiated - funds locked in escrow at trade initiation",
        initiatedBy: user.id,
      },
      riskLevel: P2PRiskLevel.HIGH,
    }).catch(err => logger.error("P2P_TRADE", "Failed to create audit log", err));

    ctx?.step("Calculating trade fees");
    // 7. Calculate fees
    const { calculateTradeFees, calculateEscrowFee } = await import("../../utils/fees");
    // Maker = offer owner, Taker = trade initiator
    const fees = await calculateTradeFees(
      amount,
      offer.currency,
      offer.userId, // maker (offer owner)
      user.id,      // taker (trade initiator)
      buyerId,
      sellerId
    );
    const escrowFee = await calculateEscrowFee(amount, offer.currency);

    ctx?.step("Creating trade record");
    // 8. Create the trade with fees stored
    // Copy seller's payment method details to trade for display during payment
    // Parse metadata properly - it may come as string from database
    let parsedMetadata: Record<string, string> = {};
    if (selectedPaymentMethod.metadata) {
      if (typeof selectedPaymentMethod.metadata === "string") {
        try {
          parsedMetadata = JSON.parse(selectedPaymentMethod.metadata);
        } catch {
          parsedMetadata = {};
        }
      } else if (typeof selectedPaymentMethod.metadata === "object") {
        parsedMetadata = selectedPaymentMethod.metadata;
      }
    }

    const paymentDetails = {
      name: selectedPaymentMethod.name,
      icon: selectedPaymentMethod.icon,
      instructions: selectedPaymentMethod.instructions || null,
      processingTime: selectedPaymentMethod.processingTime || null,
      // Copy the flexible metadata (contains actual payment details like account numbers, emails, etc.)
      ...parsedMetadata,
    };

    const trade = await models.p2pTrade.create({
      offerId: offer.id,
      buyerId,
      sellerId,
      type: offer.type, // BUY or SELL from the offer
      amount,
      price: priceConfig.finalPrice,
      total: amount * priceConfig.finalPrice,
      currency: offer.currency,
      paymentMethod: paymentMethodId,
      paymentDetails, // Store seller's payment details at time of trade initiation
      status: "PENDING",
      escrowFee: escrowFee.toString(),
      buyerFee: fees.buyerFee,
      sellerFee: fees.sellerFee,
      timeline: [
        {
          event: "TRADE_INITIATED",
          message: "Trade initiated",
          userId: user.id,
          createdAt: new Date().toISOString(),
        },
        ...(message ? [{
          event: "MESSAGE",
          message,
          userId: user.id,
          createdAt: new Date().toISOString(),
        }] : [])
      ],
    }, { transaction });

    // 9. Update offer available amount with validation
    const newTotal = amountConfig.total - amount;

    // CRITICAL: Validate that new total doesn't go negative
    if (newTotal < 0) {
      throw createError({
        statusCode: 409,
        message: `Insufficient offer amount. Available: ${amountConfig.total} ${offer.currency}, Requested: ${amount} ${offer.currency}`
      });
    }

    // Track original total if not already set (for future restoration limits)
    const originalTotal = amountConfig.originalTotal ?? amountConfig.total + amount;

    await offer.update({
      amountConfig: {
        ...amountConfig,
        total: newTotal,
        originalTotal, // Track original amount for restoration limits
      }
    }, { transaction });

    // 10. Keep offer visible even when fully consumed (total = 0)
    // Only mark as COMPLETED when user explicitly closes it or disables it
    // This way offers remain visible showing they're temporarily unavailable
    // and become available again if trades are cancelled

    ctx?.step("Updating offer available amount");
    // Commit transaction first to release locks
    await transaction.commit();

    ctx?.success(`Initiated ${offer.type} trade: ${amount} ${offer.currency} @ ${priceConfig.finalPrice}`);

    // 11. Log comprehensive audit trail (non-blocking, after commit)
    createP2PAuditLog({
      userId: user.id,
      eventType: P2PAuditEventType.TRADE_INITIATED,
      entityType: "TRADE",
      entityId: trade.id,
      metadata: {
        offerId: offer.id,
        amount,
        currency: offer.currency,
        price: priceConfig.finalPrice,
        paymentMethodId,
        buyerId,
        sellerId,
        buyerFee: fees.buyerFee,
        sellerFee: fees.sellerFee,
        escrowFee,
        totalValue: amount * priceConfig.finalPrice,
        offerType: offer.type,
        walletType: offer.walletType,
      },
      riskLevel: amount > 1000 ? P2PRiskLevel.HIGH : P2PRiskLevel.MEDIUM,
    }).catch(err => logger.error("P2P_TRADE", "Failed to create audit log", err));

    // 12. Increment offer view count (non-blocking)
    // Views are counted when trade is initiated, not on page load
    // This ensures only serious interest is counted and prevents owner inflation
    models.p2pOffer.increment("views", { where: { id } }).catch((err: any) => {
      logger.error("P2P_OFFER", "Failed to increment views", err);
    });

    // 13. Send notifications (non-blocking)
    notifyTradeEvent(trade.id, "TRADE_INITIATED", {
      buyerId,
      sellerId,
      amount,
      currency: offer.currency,
      initiatorId: user.id, // Pass who initiated the trade
    }).catch(console.error);

    // Return trade details
    return {
      message: "Trade initiated successfully",
      trade: {
        id: trade.id,
        amount: trade.amount,
        total: trade.total,
        status: trade.status,
        buyer: isBuyOffer ? offer.user : { id: user.id },
        seller: isBuyOffer ? { id: user.id } : offer.user,
        fees: {
          buyerFee: fees.buyerFee,
          sellerFee: fees.sellerFee,
          escrowFee,
          totalFee: fees.totalFee,
        },
        netAmounts: {
          buyer: fees.netAmountBuyer,
          seller: fees.netAmountSeller,
        }
      }
    };

  } catch (error: any) {
    // Only rollback if transaction exists and hasn't been committed/rolled back
    if (transaction) {
      try {
        if (!transaction.finished) {
          await transaction.rollback();
        }
      } catch (rollbackError: any) {
        // Ignore rollback errors if transaction is already finished
        if (!rollbackError.message?.includes("already been finished")) {
          logger.error("P2P_TRADE", "Transaction rollback failed", rollbackError);
        }
      }
    }

    // If it's already a createError, rethrow it
    if (error.statusCode) {
      throw error;
    }

    // Otherwise, wrap it in a generic error
    throw createError({
      statusCode: 500,
      message: `Failed to initiate trade: ${error.message}`,
    });
  }
}