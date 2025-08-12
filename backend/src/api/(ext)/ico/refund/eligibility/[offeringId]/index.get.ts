import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";

export const metadata = {
  summary: "Check Refund Eligibility",
  description: "Checks if an ICO offering is eligible for refunds and returns refund details",
  operationId: "checkRefundEligibility",
  tags: ["ICO", "Refunds"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "offeringId",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "ID of the ICO offering",
    },
  ],
  responses: {
    200: {
      description: "Refund eligibility information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              eligible: { type: "boolean" },
              reason: { type: "string" },
              offering: { type: "object" },
              refundDetails: {
                type: "object",
                properties: {
                  totalInvestors: { type: "number" },
                  totalAmount: { type: "number" },
                  pendingRefunds: { type: "number" },
                  completedRefunds: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized" },
    404: { description: "Offering not found" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user, params } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { offeringId } = params;

  // Find the offering
  const offering = await models.icoTokenOffering.findByPk(offeringId, {
    attributes: [
      "id", "name", "symbol", "status", "targetAmount", 
      "userId", "purchaseWalletCurrency", "startDate", "endDate"
    ],
  });
  
  if (!offering) {
    throw createError({ statusCode: 404, message: "Offering not found" });
  }

  // Check if user has permission to view refund details
  const isOwner = offering.userId === user.id;
  // Check admin role through user model
  const fullUser = await models.user.findByPk(user.id, {
    include: [{ model: models.role, as: "role" }]
  });
  const isAdmin = fullUser?.role?.name === 'admin' || fullUser?.role?.name === 'super_admin';
  const hasInvestment = await models.icoTransaction.count({
    where: {
      offeringId: offering.id,
      userId: user.id,
    }
  }) > 0;

  if (!isOwner && !isAdmin && !hasInvestment) {
    throw createError({ 
      statusCode: 403, 
      message: "You don't have permission to view refund details" 
    });
  }

  // Determine eligibility
  let eligible = false;
  let reason = "";

  const now = new Date();
  const totalRaised = await models.icoTransaction.sum('amount', {
    where: {
      offeringId: offering.id,
      status: { [Op.in]: ['PENDING', 'VERIFICATION', 'RELEASED', 'REFUNDED'] }
    },
    raw: true,
  }) || 0;

  const softCap = offering.targetAmount * 0.3; // 30% soft cap

  if (offering.status === 'FAILED' || offering.status === 'CANCELLED') {
    eligible = true;
    reason = `Offering ${offering.status.toLowerCase()}`;
  } else if (offering.status === 'REFUNDED') {
    eligible = false;
    reason = "Refunds already processed";
  } else if (now > offering.endDate && totalRaised < softCap) {
    eligible = true;
    reason = "Soft cap not reached after offering ended";
  } else if (offering.status === 'ACTIVE' && now > offering.endDate) {
    eligible = false;
    reason = "Offering ended successfully";
  } else {
    eligible = false;
    reason = "Offering is still active or completed successfully";
  }

  // Get refund statistics
  const transactions = await models.icoTransaction.findAll({
    where: { offeringId: offering.id },
    attributes: ["status", "amount", "price"],
  });

  const refundDetails = {
    totalInvestors: 0,
    totalAmount: 0,
    pendingRefunds: 0,
    completedRefunds: 0,
  };

  const uniqueInvestors = new Set();
  
  for (const tx of transactions) {
    if (['PENDING', 'VERIFICATION', 'RELEASED', 'REFUND_PENDING', 'REFUNDED'].includes(tx.status)) {
      uniqueInvestors.add(tx.userId);
      const amount = tx.amount * tx.price;
      refundDetails.totalAmount += amount;
      
      if (tx.status === 'REFUNDED') {
        refundDetails.completedRefunds++;
      } else if (['PENDING', 'VERIFICATION', 'REFUND_PENDING'].includes(tx.status)) {
        refundDetails.pendingRefunds++;
      }
    }
  }
  
  refundDetails.totalInvestors = uniqueInvestors.size;

  return {
    eligible,
    reason,
    offering: {
      id: offering.id,
      name: offering.name,
      symbol: offering.symbol,
      status: offering.status,
      targetAmount: offering.targetAmount,
      totalRaised,
      softCap,
      currency: offering.purchaseWalletCurrency,
      startDate: offering.startDate,
      endDate: offering.endDate,
    },
    refundDetails,
  };
};