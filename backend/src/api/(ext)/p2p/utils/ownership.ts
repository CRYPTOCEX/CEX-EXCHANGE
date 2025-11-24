import { models } from "@b/db";
import { createError } from "@b/utils/error";

/**
 * Check if user owns a P2P offer
 */
export async function isOfferOwner(userId: string, offerId: string): Promise<boolean> {
  const offer = await models.p2pOffer.findByPk(offerId, {
    attributes: ["userId"],
  });
  return offer?.userId === userId;
}

/**
 * Check if user is part of a P2P trade (buyer or seller)
 */
export async function isTradeParticipant(userId: string, tradeId: string): Promise<boolean> {
  const trade = await models.p2pTrade.findByPk(tradeId, {
    attributes: ["buyerId", "sellerId"],
  });
  return trade?.buyerId === userId || trade?.sellerId === userId;
}

/**
 * Check if user owns a payment method
 */
export async function isPaymentMethodOwner(userId: string, paymentMethodId: string): Promise<boolean> {
  const paymentMethod = await models.p2pPaymentMethod.findByPk(paymentMethodId, {
    attributes: ["userId"],
  });
  return paymentMethod?.userId === userId;
}

/**
 * Require offer ownership or throw error
 */
export async function requireOfferOwnership(userId: string, offerId: string): Promise<void> {
  const isOwner = await isOfferOwner(userId, offerId);
  if (!isOwner) {
    throw createError({
      statusCode: 403,
      message: "You don't have permission to modify this offer",
    });
  }
}

/**
 * Require trade participation or throw error
 */
export async function requireTradeParticipation(userId: string, tradeId: string): Promise<void> {
  const isParticipant = await isTradeParticipant(userId, tradeId);
  if (!isParticipant) {
    throw createError({
      statusCode: 403,
      message: "You are not part of this trade",
    });
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
  metadata?: any
) {
  try {
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
  } catch (error) {
    console.error("Failed to log P2P admin action:", error);
  }
}