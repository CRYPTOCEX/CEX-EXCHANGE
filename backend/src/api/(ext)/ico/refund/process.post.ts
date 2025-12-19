import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { createNotification } from "@b/utils/notifications";
import { Op } from "sequelize";
import { logger } from "@b/utils/console";

export const metadata = {
  summary: "Process Refunds for Failed ICO",
  description: "Processes refunds for all investors of a failed ICO offering. Only the offering owner or admin can initiate refunds.",
  operationId: "processIcoRefunds",
  tags: ["ICO", "Refunds"],
  requiresAuth: true,
  logModule: "ICO_REFUND",
  logTitle: "Process ICO refunds",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            offeringId: { 
              type: "string", 
              description: "ID of the failed ICO offering" 
            },
            reason: {
              type: "string",
              description: "Reason for the refund"
            },
          },
          required: ["offeringId", "reason"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Refunds processed successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              refundedCount: { type: "number" },
              totalRefunded: { type: "number" },
              failedRefunds: { type: "array", items: { type: "object" } },
            },
          },
        },
      },
    },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
    404: { description: "Offering not found" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user, body, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Validating refund request");
  const { offeringId, reason } = body;
  if (!offeringId || !reason) {
    throw createError({ statusCode: 400, message: "Missing required fields" });
  }

  const transaction = await sequelize.transaction();

  try {
    ctx?.step("Retrieving offering details");
    // Find the offering
    const offering = await models.icoTokenOffering.findByPk(offeringId, {
      include: [{
        model: models.icoTokenDetail,
        as: "tokenDetail",
      }],
      transaction,
    });
    
    if (!offering) {
      throw createError({ statusCode: 404, message: "Offering not found" });
    }

    ctx?.step("Verifying user permissions");
    // Check if user is owner or admin
    const isOwner = offering.userId === user.id;
    // Check admin role through user model
    const fullUser = await models.user.findByPk(user.id, {
      include: [{ model: models.role, as: "role" }]
    });
    const isAdmin = fullUser?.role?.name === 'admin' || fullUser?.role?.name === 'super_admin';
    
    if (!isOwner && !isAdmin) {
      throw createError({ 
        statusCode: 403, 
        message: "Only the offering owner or admin can process refunds" 
      });
    }

    // Validate offering status
    if (offering.status !== 'FAILED' && offering.status !== 'CANCELLED') {
      throw createError({ 
        statusCode: 400, 
        message: `Cannot process refunds for offering with status: ${offering.status}` 
      });
    }

    ctx?.step("Retrieving pending transactions for refund");
    // Find all pending refund transactions
    const pendingTransactions = await models.icoTransaction.findAll({
      where: {
        offeringId: offering.id,
        status: { [Op.in]: ['PENDING', 'VERIFICATION', 'REJECTED'] }
      },
      include: [{
        model: models.user,
        as: "user",
        attributes: ["id", "email", "firstName", "lastName"],
      }],
      transaction,
    });

    if (pendingTransactions.length === 0) {
      throw createError({ 
        statusCode: 400, 
        message: "No transactions found for refund" 
      });
    }

    let refundedCount = 0;
    let totalRefunded = 0;
    const failedRefunds: Array<{
      transactionId: string;
      userId: string;
      reason: string;
    }> = [];

    ctx?.step(`Processing ${pendingTransactions.length} refund transactions`);
    // Process each transaction
    for (const icoTransaction of pendingTransactions) {
      try {
        // Calculate refund amount
        const refundAmount = icoTransaction.amount * icoTransaction.price;
        
        // Find user's wallet
        const wallet = await models.wallet.findOne({
          where: {
            userId: icoTransaction.userId,
            type: offering.purchaseWalletType,
            currency: offering.purchaseWalletCurrency,
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!wallet) {
          failedRefunds.push({
            transactionId: icoTransaction.id,
            userId: icoTransaction.userId,
            reason: "Wallet not found",
          });
          continue;
        }

        // Refund the amount
        await wallet.update(
          { balance: wallet.balance + refundAmount },
          { transaction }
        );

        // Update transaction to REJECTED status with refund info
        await icoTransaction.update(
          {
            status: 'REJECTED',
            notes: JSON.stringify({
              ...JSON.parse(icoTransaction.notes || '{}'),
              refund: {
                amount: refundAmount,
                reason,
                processedAt: new Date().toISOString(),
                processedBy: user.id,
              }
            })
          },
          { transaction }
        );

        // Create wallet transaction record
        await models.transaction.create({
          userId: icoTransaction.userId,
          walletId: wallet.id,
          type: "REFUND",
          status: "COMPLETED",
          amount: refundAmount,
          fee: 0,
          description: `ICO Refund: ${offering.name} - ${reason}`,
          referenceId: icoTransaction.id,
        }, { transaction });

        // Send notification to investor
        await createNotification({
          userId: icoTransaction.userId,
          relatedId: offering.id,
          type: "investment",
          title: "ICO Investment Refunded",
          message: `Your investment in ${offering.name} has been refunded.`,
          details: `Amount refunded: ${refundAmount} ${offering.purchaseWalletCurrency}\nReason: ${reason}`,
          link: `/ico/dashboard?tab=transactions`,
        });

        refundedCount++;
        totalRefunded += refundAmount;
      } catch (error) {
        logger.error("ICO_REFUND", `Failed to refund transaction ${icoTransaction.id}`, error);
        failedRefunds.push({
          transactionId: icoTransaction.id,
          userId: icoTransaction.userId,
          reason: error.message,
        });
      }
    }

    ctx?.step("Updating offering records and creating audit log");
    // Update offering notes if all refunds processed
    if (failedRefunds.length === 0) {
      await offering.update(
        {
          notes: JSON.stringify({
            ...JSON.parse(offering.notes || '{}'),
            refund: {
              refundReason: reason,
              refundedAt: new Date().toISOString(),
              refundedBy: user.id,
              refundedCount,
              totalRefunded,
              allRefundsProcessed: true,
            }
          })
        },
        { transaction }
      );
    }

    // Create audit log
    await models.icoAdminActivity.create({
      type: "REFUNDS_PROCESSED",
      offeringId: offering.id,
      offeringName: offering.name,
      adminId: user.id,
      details: JSON.stringify({
        reason,
        refundedCount,
        totalRefunded,
        failedCount: failedRefunds.length,
        currency: offering.purchaseWalletCurrency,
      }),
    }, { transaction });

    await transaction.commit();

    ctx?.step("Sending notifications to offering owner");
    // Send notification to offering owner
    if (!isOwner) {
      await createNotification({
        userId: offering.userId,
        relatedId: offering.id,
        type: "system",
        title: "ICO Refunds Processed",
        message: `Refunds have been processed for ${offering.name}`,
        details: `Refunded: ${refundedCount} investors\nTotal: ${totalRefunded} ${offering.purchaseWalletCurrency}\nReason: ${reason}`,
        link: `/ico/creator/token/${offering.id}`,
      });
    }

    ctx?.success(`Processed ${refundedCount} refunds totaling ${totalRefunded} ${offering.purchaseWalletCurrency}`);

    return {
      message: "Refunds processed successfully",
      refundedCount,
      totalRefunded,
      failedRefunds,
    };
  } catch (err: any) {
    await transaction.rollback();
    ctx?.fail(err.message || "Failed to process refunds");
    throw err;
  }
};