import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { getWalletSafe } from "@b/api/finance/wallet/utils";
import { notifyTradeEvent } from "@b/api/(ext)/p2p/utils/notifications";
import { validateTradeAmount } from "@b/api/(ext)/p2p/utils/validation";
import { createP2PAuditLog, P2PAuditEventType, P2PRiskLevel } from "@b/api/(ext)/p2p/utils/audit";
import { Op } from "sequelize";

export const metadata = {
  summary: "Initiate Trade from P2P Offer",
  description:
    "Creates a new trade from an active P2P offer with proper validation and balance locking",
  operationId: "initiateP2PTrade",
  tags: ["P2P", "Trade"],
  requiresAuth: true,
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
  user?: any 
}) {
  const { id } = data.params || {};
  const { amount, paymentMethodId, message } = data.body;
  const { user } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // Validate amount
  if (!validateTradeAmount(amount)) {
    throw createError({ 
      statusCode: 400, 
      message: "Invalid trade amount" 
    });
  }

  const transaction = await sequelize.transaction();

  try {
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
      await transaction.rollback();
      throw createError({ 
        statusCode: 404, 
        message: "Offer not found or unavailable" 
      });
    }

    // 2. Validate amount against offer limits
    const { min, max, total } = offer.amountConfig;
    if (amount < (min || 0) || amount > (max || total) || amount > total) {
      await transaction.rollback();
      throw createError({ 
        statusCode: 400, 
        message: `Amount must be between ${min || 0} and ${Math.min(max || total, total)}` 
      });
    }

    // 3. Verify payment method is allowed
    const allowedPaymentMethodIds = offer.paymentMethods.map((pm: any) => pm.id);
    if (!allowedPaymentMethodIds.includes(paymentMethodId)) {
      await transaction.rollback();
      throw createError({ 
        statusCode: 400, 
        message: "Selected payment method not allowed for this offer" 
      });
    }

    // 4. Verify user's payment method exists
    const userPaymentMethod = await models.p2pPaymentMethod.findOne({
      where: { 
        id: paymentMethodId,
        userId: user.id,
        available: true
      },
      transaction,
    });

    if (!userPaymentMethod) {
      await transaction.rollback();
      throw createError({ 
        statusCode: 400, 
        message: "Invalid or unavailable payment method" 
      });
    }

    // 5. Determine buyer and seller based on offer type
    const isBuyOffer = offer.type === "BUY";
    const buyerId = isBuyOffer ? offer.userId : user.id;
    const sellerId = isBuyOffer ? user.id : offer.userId;

    // 6. Lock seller's balance
    const sellerWallet = await getWalletSafe(
      sellerId, 
      offer.walletType, 
      offer.currency
    );

    if (!sellerWallet) {
      await transaction.rollback();
      throw createError({ 
        statusCode: 400, 
        message: "Seller wallet not found" 
      });
    }

    const availableBalance = sellerWallet.balance - sellerWallet.inOrder;
    if (availableBalance < amount) {
      await transaction.rollback();
      throw createError({ 
        statusCode: 409, 
        message: "Insufficient seller balance" 
      });
    }

    // Update wallet to lock the amount
    await sellerWallet.update({
      inOrder: sellerWallet.inOrder + amount
    }, { transaction });
    
    // Audit log for balance locking
    await createP2PAuditLog({
      userId: sellerId,
      eventType: P2PAuditEventType.FUNDS_LOCKED,
      entityType: "WALLET",
      entityId: sellerWallet.id,
      metadata: {
        offerId: offer.id,
        amount,
        currency: offer.currency,
        previousInOrder: sellerWallet.inOrder - amount,
        newInOrder: sellerWallet.inOrder,
        availableBalance: availableBalance - amount,
        initiatedBy: user.id,
      },
      riskLevel: P2PRiskLevel.HIGH,
    });

    // 7. Calculate fees
    const { calculateTradeFees, calculateEscrowFee } = await import("../../utils/fees");
    const isMakerBuyer = offer.type === "BUY";
    const fees = await calculateTradeFees(amount, offer.currency, isMakerBuyer);
    const escrowFee = await calculateEscrowFee(amount, offer.currency);

    // 8. Create the trade
    const trade = await models.p2pTrade.create({
      offerId: offer.id,
      buyerId,
      sellerId,
      amount,
      price: offer.priceConfig.finalPrice,
      totalAmount: amount * offer.priceConfig.finalPrice,
      currency: offer.currency,
      paymentMethodId,
      status: "PENDING",
      escrowFee,
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
      expiresAt: new Date(Date.now() + (offer.tradeSettings.autoCancel * 60 * 1000)),
    }, { transaction });

    // 9. Update offer available amount
    await offer.update({
      amountConfig: {
        ...offer.amountConfig,
        total: offer.amountConfig.total - amount,
      }
    }, { transaction });

    // 10. If offer is fully consumed, mark as completed
    if (offer.amountConfig.total - amount <= 0) {
      await offer.update({ status: "COMPLETED" }, { transaction });
    }

    // 11. Log comprehensive audit trail
    await createP2PAuditLog({
      userId: user.id,
      eventType: P2PAuditEventType.TRADE_INITIATED,
      entityType: "TRADE",
      entityId: trade.id,
      metadata: {
        offerId: offer.id,
        amount,
        currency: offer.currency,
        price: offer.priceConfig.finalPrice,
        paymentMethodId,
        buyerId,
        sellerId,
        buyerFee: fees.buyerFee,
        sellerFee: fees.sellerFee,
        escrowFee,
        totalValue: amount * offer.priceConfig.finalPrice,
        offerType: offer.type,
        walletType: offer.walletType,
      },
      riskLevel: amount > 1000 ? P2PRiskLevel.HIGH : P2PRiskLevel.MEDIUM,
    });

    // Commit transaction
    await transaction.commit();

    // 12. Send notifications (non-blocking)
    notifyTradeEvent(trade.id, "TRADE_INITIATED", {
      buyerId,
      sellerId,
      amount,
      currency: offer.currency,
    }).catch(console.error);

    // Return trade details
    return {
      message: "Trade initiated successfully",
      trade: {
        id: trade.id,
        amount: trade.amount,
        totalAmount: trade.totalAmount,
        status: trade.status,
        expiresAt: trade.expiresAt,
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
    await transaction.rollback();
    
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