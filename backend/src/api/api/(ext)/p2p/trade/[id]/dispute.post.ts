import { models, sequelize } from "@b/db";
import { Op } from "sequelize";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Dispute Trade",
  description:
    "Creates a dispute for a trade by providing a reason and description.",
  operationId: "disputeP2PTrade",
  tags: ["P2P", "Trade"],
  requiresAuth: true,
  middleware: ["p2pDisputeCreateRateLimit"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "Trade ID",
      required: true,
      schema: { type: "string", format: "uuid" },
    },
  ],
  requestBody: {
    description: "Dispute details",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            reason: { 
              type: "string",
              enum: [
                "PAYMENT_NOT_RECEIVED",
                "PAYMENT_INCORRECT_AMOUNT", 
                "SELLER_UNRESPONSIVE",
                "BUYER_UNRESPONSIVE",
                "FRAUDULENT_ACTIVITY",
                "TERMS_VIOLATION",
                "OTHER"
              ]
            },
            description: { 
              type: "string",
              minLength: 20,
              maxLength: 1000
            },
            evidence: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["screenshot", "document", "text"] },
                  content: { type: "string" },
                  description: { type: "string" }
                }
              },
              maxItems: 5
            }
          },
          required: ["reason", "description"],
        },
      },
    },
  },
  responses: {
    200: { description: "Dispute created successfully." },
    400: { description: "Bad Request - Invalid dispute data." },
    401: { description: "Unauthorized." },
    404: { description: "Trade not found." },
    409: { description: "Conflict - Trade already disputed." },
    500: { description: "Internal Server Error." },
  },
};

export default async (data: { params?: any; body: any; user?: any }) => {
  const { id } = data.params || {};
  const { reason, description, evidence } = data.body;
  const { user } = data;
  
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // Import validation utilities
  const { validateDisputeReason, sanitizeInput, validateTradeStatusTransition } = await import("../../utils/validation");
  const { notifyTradeEvent } = await import("../../utils/notifications");

  // Validate reason
  const validatedReason = validateDisputeReason(reason);
  
  // Sanitize description
  const sanitizedDescription = sanitizeInput(description);
  if (!sanitizedDescription || sanitizedDescription.length < 20) {
    throw createError({ 
      statusCode: 400, 
      message: "Dispute description must be at least 20 characters" 
    });
  }

  const transaction = await sequelize.transaction();

  try {
    // Find and lock trade
    const trade = await models.p2pTrade.findOne({
      where: {
        id,
        [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
      },
      include: [{
        model: models.p2pOffer,
        as: "offer",
        attributes: ["currency", "type"],
      }],
      lock: true,
      transaction,
    });

    if (!trade) {
      await transaction.rollback();
      throw createError({ statusCode: 404, message: "Trade not found" });
    }

    // Check if trade can be disputed
    if (!validateTradeStatusTransition(trade.status, "DISPUTED")) {
      await transaction.rollback();
      throw createError({ 
        statusCode: 400, 
        message: `Cannot dispute trade with status: ${trade.status}` 
      });
    }

    // Check if trade is within dispute time limit (7 days after completion)
    if (trade.status === "COMPLETED" && trade.completedAt) {
      const disputeTimeLimit = 7 * 24 * 60 * 60 * 1000; // 7 days
      if (Date.now() - new Date(trade.completedAt).getTime() > disputeTimeLimit) {
        await transaction.rollback();
        throw createError({ 
          statusCode: 400, 
          message: "Dispute time limit exceeded (7 days after completion)" 
        });
      }
    }

    // Check if already disputed
    const existingDispute = await models.p2pDispute.findOne({
      where: { 
        tradeId: trade.id,
        status: { [Op.ne]: "RESOLVED" }
      },
      transaction,
    });

    if (existingDispute) {
      await transaction.rollback();
      throw createError({ 
        statusCode: 409, 
        message: "Trade is already under dispute" 
      });
    }

    // Determine the other party
    const againstId = trade.buyerId === user.id ? trade.sellerId : trade.buyerId;

    // Create dispute
    const dispute = await models.p2pDispute.create({
      tradeId: id,
      amount: trade.totalAmount.toString(),
      reportedById: user.id,
      againstId,
      reason: validatedReason,
      details: sanitizedDescription,
      filedOn: new Date(),
      status: "PENDING",
      priority: determinePriority(validatedReason, trade.amount),
      evidence: evidence || [],
      metadata: {
        tradeAmount: trade.amount,
        tradeCurrency: trade.offer.currency,
        tradeType: trade.offer.type,
        originalTradeStatus: trade.status,
      }
    }, { transaction });

    // Update trade status and timeline
    const timeline = trade.timeline || [];
    timeline.push({
      event: "DISPUTE_OPENED",
      message: `Dispute opened: ${validatedReason}`,
      userId: user.id,
      disputeId: dispute.id,
      createdAt: new Date().toISOString(),
    });

    await trade.update({ 
      status: "DISPUTED",
      timeline,
      disputedAt: new Date(),
    }, { transaction });

    // Log activity
    await models.p2pActivityLog.create({
      userId: user.id,
      type: "DISPUTE_CREATED",
      entityId: dispute.id,
      entityType: "DISPUTE",
      metadata: {
        tradeId: trade.id,
        reason: validatedReason,
        againstId,
      },
    }, { transaction });

    await transaction.commit();

    // Send notifications
    notifyTradeEvent(trade.id, "TRADE_DISPUTED", {
      buyerId: trade.buyerId,
      sellerId: trade.sellerId,
      amount: trade.amount,
      currency: trade.offer.currency,
      reason: validatedReason,
      disputeId: dispute.id,
    }).catch(console.error);

    return { 
      message: "Dispute created successfully.",
      disputeId: dispute.id,
      dispute: {
        id: dispute.id,
        tradeId: dispute.tradeId,
        reason: dispute.reason,
        status: dispute.status,
        priority: dispute.priority,
        createdAt: dispute.filedOn,
      }
    };
  } catch (err: any) {
    await transaction.rollback();
    
    if (err.statusCode) {
      throw err;
    }
    
    throw createError({
      statusCode: 500,
      message: "Failed to create dispute: " + err.message,
    });
  }
};

/**
 * Determine dispute priority based on reason and amount
 */
function determinePriority(reason: string, amount: number): string {
  // High priority reasons
  const highPriorityReasons = ["FRAUDULENT_ACTIVITY", "PAYMENT_NOT_RECEIVED"];
  if (highPriorityReasons.includes(reason)) {
    return "HIGH";
  }

  // High amount trades get higher priority
  if (amount > 1000) {
    return "HIGH";
  } else if (amount > 100) {
    return "MEDIUM";
  }

  return "LOW";
}
