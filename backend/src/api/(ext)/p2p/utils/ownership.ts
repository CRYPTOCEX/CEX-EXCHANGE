import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { logger } from "@b/utils/console";

/**
 * LogContext interface for operation logging
 */
export interface LogContext {
  step?: (message: string) => void;
  success?: (message: string) => void;
  fail?: (message: string) => void;
}

/**
 * Check if user owns a P2P offer
 */
export async function isOfferOwner(userId: string, offerId: string, ctx?: LogContext): Promise<boolean> {
  try {
    ctx?.step?.(`Checking if user ${userId} owns offer ${offerId}`);

    const offer = await models.p2pOffer.findByPk(offerId, {
      attributes: ["userId"],
    });

    const isOwner = offer?.userId === userId;
    ctx?.success?.(`Offer ownership check: ${isOwner}`);
    return isOwner;
  } catch (error) {
    ctx?.fail?.((error as Error).message || "Failed to check offer ownership");
    throw error;
  }
}

/**
 * Check if user is part of a P2P trade (buyer or seller)
 */
export async function isTradeParticipant(userId: string, tradeId: string, ctx?: LogContext): Promise<boolean> {
  try {
    ctx?.step?.(`Checking if user ${userId} is participant in trade ${tradeId}`);

    const trade = await models.p2pTrade.findByPk(tradeId, {
      attributes: ["buyerId", "sellerId"],
    });

    const isParticipant = trade?.buyerId === userId || trade?.sellerId === userId;
    ctx?.success?.(`Trade participation check: ${isParticipant}`);
    return isParticipant;
  } catch (error) {
    ctx?.fail?.((error as Error).message || "Failed to check trade participation");
    throw error;
  }
}

/**
 * Check if user owns a payment method
 */
export async function isPaymentMethodOwner(userId: string, paymentMethodId: string, ctx?: LogContext): Promise<boolean> {
  try {
    ctx?.step?.(`Checking if user ${userId} owns payment method ${paymentMethodId}`);

    const paymentMethod = await models.p2pPaymentMethod.findByPk(paymentMethodId, {
      attributes: ["userId"],
    });

    const isOwner = paymentMethod?.userId === userId;
    ctx?.success?.(`Payment method ownership check: ${isOwner}`);
    return isOwner;
  } catch (error) {
    ctx?.fail?.((error as Error).message || "Failed to check payment method ownership");
    throw error;
  }
}

/**
 * Require offer ownership or throw error
 */
export async function requireOfferOwnership(userId: string, offerId: string, ctx?: LogContext): Promise<void> {
  try {
    ctx?.step?.("Verifying offer ownership");

    const isOwner = await isOfferOwner(userId, offerId, ctx);
    if (!isOwner) {
      ctx?.fail?.("User does not own this offer");
      throw createError({
        statusCode: 403,
        message: "You don't have permission to modify this offer",
      });
    }

    ctx?.success?.("Offer ownership verified");
  } catch (error) {
    ctx?.fail?.((error as Error).message || "Failed to verify offer ownership");
    throw error;
  }
}

/**
 * Require trade participation or throw error
 */
export async function requireTradeParticipation(userId: string, tradeId: string, ctx?: LogContext): Promise<void> {
  try {
    ctx?.step?.("Verifying trade participation");

    const isParticipant = await isTradeParticipant(userId, tradeId, ctx);
    if (!isParticipant) {
      ctx?.fail?.("User is not part of this trade");
      throw createError({
        statusCode: 403,
        message: "You are not part of this trade",
      });
    }

    ctx?.success?.("Trade participation verified");
  } catch (error) {
    ctx?.fail?.((error as Error).message || "Failed to verify trade participation");
    throw error;
  }
}

/**
 * Log P2P admin action for audit trail
 */
export async function logP2PAdminAction(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: any,
  ctx?: LogContext
) {
  try {
    ctx?.step?.(`Logging admin action: ${action} for ${entityType} ${entityId}`);

    await models.p2pActivityLog.create({
      userId,
      type: `ADMIN_${action}`,
      action: action,
      relatedEntity: entityType,
      relatedEntityId: entityId,
      details: JSON.stringify({
        ...metadata,
        timestamp: new Date().toISOString(),
        isAdminAction: true,
      }),
    });

    ctx?.success?.("Admin action logged successfully");
  } catch (error) {
    ctx?.fail?.((error as Error).message || "Failed to log admin action");
    logger.error("P2P_ADMIN", "Failed to log P2P admin action", error);
  }
}