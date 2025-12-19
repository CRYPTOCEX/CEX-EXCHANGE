import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { Op } from "sequelize";
import { logger } from "@b/utils/console";

export const metadata: OperationObject = {
  summary: "Emergency Cancel & Refund ICO (SuperAdmin Only)",
  description:
    "Emergency cancellation endpoint for SuperAdmins only. Cancels an active ICO offering and refunds ALL investors. Use this for scam prevention or critical security issues.",
  operationId: "emergencyCancelIcoOffering",
  tags: ["ICO", "Admin", "Offerings", "Emergency"],
  parameters: [
    {
      name: "id",
      in: "path",
      description: "ID of the ICO offering to cancel",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            reason: {
              type: "string",
              description: "Reason for emergency cancellation (required for audit trail, minimum 10 characters)",
            },
          },
          required: ["reason"],
        },
      },
    },
  },
  requiresAuth: true,
  permission: "manage.system", // SuperAdmin only
  responses: {
    200: {
      description: "ICO cancelled and all investors refunded successfully",
    },
    401: unauthorizedResponse,
    403: {
      description: "Forbidden - SuperAdmin privileges required",
    },
    404: notFoundMetadataResponse("Offering"),
    500: serverErrorResponse,
  },
  logModule: "ADMIN_ICO",
  logTitle: "Emergency Cancel & Refund ICO",
};

export default async (data: Handler) => {
  const { user, params, body, ctx } = data;

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized: SuperAdmin privileges required",
    });
  }

  ctx?.step("Verifying SuperAdmin privileges");
  // Verify user is SuperAdmin by checking role
  const userWithRole = await models.user.findByPk(user.id, {
    include: [{
      model: models.role,
      as: "role",
      attributes: ["name"],
    }],
  });

  if (!userWithRole || userWithRole.role?.name !== "Super Admin") {
    throw createError({
      statusCode: 403,
      message: "Forbidden: This endpoint is restricted to SuperAdmins only",
    });
  }

  const { id } = params;
  const { reason } = body;

  if (!reason || reason.trim().length < 10) {
    throw createError({
      statusCode: 400,
      message: "Cancellation reason is required (minimum 10 characters)",
    });
  }

  let transaction: any;

  try {
    transaction = await sequelize.transaction();

    ctx?.step("Finding ICO offering");
    // Find the offering with details
    const offering = await models.icoTokenOffering.findByPk(id, {
      transaction,
      include: [{
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email"],
      }],
    });

    if (!offering) {
      throw createError({ statusCode: 404, message: "ICO offering not found" });
    }

    ctx?.step("Retrieving all active investments");
    // Get all transactions (investments) that need refunds
    const transactions = await models.icoTransaction.findAll({
      where: {
        offeringId: id,
        status: { [Op.in]: ["PENDING", "VERIFICATION", "RELEASED"] },
      },
      include: [{
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email"],
      }],
      transaction,
    });

    logger.info("ADMIN_ICO_CANCEL", `Found ${transactions.length} active investments to refund`);

    ctx?.step(`Processing ${transactions.length} refunds`);
    let totalRefunded = 0;
    let successfulRefunds = 0;
    let failedRefunds = 0;
    const refundDetails: any[] = [];

    // Process each investment refund
    for (const investment of transactions) {
      try {
        // Find user's wallet for the purchase currency
        const wallet = await models.wallet.findOne({
          where: {
            userId: investment.userId,
            type: investment.walletType,
            currency: investment.purchaseCurrency,
          },
          lock: true,
          transaction,
        });

        if (!wallet) {
          logger.error("ADMIN_ICO_CANCEL", `Wallet not found for user ${investment.userId}`);
          failedRefunds++;
          refundDetails.push({
            transactionId: investment.id,
            userId: investment.userId,
            amount: investment.amount,
            currency: investment.purchaseCurrency,
            status: "FAILED",
            reason: "Wallet not found",
          });
          continue;
        }

        // Refund the amount to user's wallet
        await wallet.update({
          balance: wallet.balance + investment.amount,
        }, { transaction });

        // Create refund transaction record
        await models.transaction.create({
          userId: investment.userId,
          type: "ICO_REFUND",
          status: "COMPLETED",
          amount: investment.amount,
          fee: 0,
          currency: investment.purchaseCurrency,
          description: `Emergency refund for ICO: ${offering.name}. Reason: ${reason}`,
          referenceId: investment.id,
        }, { transaction });

        // Update investment status to REJECTED with refund note
        await investment.update({
          status: "REJECTED",
          rejectReason: `EMERGENCY CANCELLATION - ${reason}`,
        }, { transaction });

        totalRefunded += investment.amount;
        successfulRefunds++;

        refundDetails.push({
          transactionId: investment.id,
          userId: investment.userId,
          userName: investment.user ? `${investment.user.firstName} ${investment.user.lastName}` : "Unknown",
          amount: investment.amount,
          currency: investment.purchaseCurrency,
          status: "SUCCESS",
        });

        logger.success("ADMIN_ICO_CANCEL", `Refunded ${investment.amount} ${investment.purchaseCurrency} to user ${investment.userId}`);
      } catch (refundError: any) {
        logger.error("ADMIN_ICO_CANCEL", `Failed to refund investment ${investment.id}`, refundError);
        failedRefunds++;
        refundDetails.push({
          transactionId: investment.id,
          userId: investment.userId,
          amount: investment.amount,
          currency: investment.purchaseCurrency,
          status: "FAILED",
          reason: refundError.message,
        });
      }
    }

    ctx?.step("Updating offering status to CANCELLED");
    // Update offering status to CANCELLED
    await offering.update({
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledBy: user.id,
      cancellationReason: reason,
    }, { transaction });

    // Log admin activity
    await models.icoAdminActivity.create({
      userId: user.id,
      offeringId: id,
      action: "EMERGENCY_CANCEL_REFUND",
      details: JSON.stringify({
        reason,
        totalInvestments: transactions.length,
        successfulRefunds,
        failedRefunds,
        totalRefunded,
        refundDetails,
        cancelledBy: userWithRole.role?.name,
        timestamp: new Date().toISOString(),
      }),
    }, { transaction });

    // If any refunds failed, rollback the entire transaction for data consistency
    if (failedRefunds > 0) {
      await transaction.rollback();
      throw createError({
        statusCode: 500,
        message: `Failed to refund ${failedRefunds} investment(s). Transaction rolled back. Please resolve wallet issues and try again.`,
      });
    }

    await transaction.commit();

    ctx?.step("Sending notifications to refunded investors");
    // Send notifications to all refunded investors (non-blocking)
    for (const detail of refundDetails) {
      if (detail.status === "SUCCESS") {
        try {
          await models.notification.create({
            userId: detail.userId,
            type: "ICO_REFUND",
            title: "ICO Investment Refunded",
            message: `Your investment of ${detail.amount} ${detail.currency} in "${offering.name}" has been refunded due to: ${reason}`,
            read: false,
          });
        } catch (notifError) {
          logger.error("ADMIN_ICO_CANCEL", "Failed to send refund notification", notifError);
        }
      }
    }

    ctx?.success("Emergency cancellation and refunds completed successfully");
    return {
      message: "ICO offering cancelled and all investments refunded successfully",
      data: {
        offeringId: id,
        offeringName: offering.name,
        totalInvestments: transactions.length,
        successfulRefunds,
        failedRefunds,
        totalRefunded,
        currency: transactions[0]?.purchaseCurrency || "N/A",
        cancelledBy: `${userWithRole.firstName} ${userWithRole.lastName}`,
        reason,
        refundDetails,
      },
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
          logger.error("ADMIN_ICO_CANCEL", "Transaction rollback failed", rollbackError);
        }
      }
    }

    logger.error("ADMIN_ICO_CANCEL", "Error cancelling ICO offering", error);

    // If it's already a createError, rethrow it
    if (error.statusCode) {
      throw error;
    }

    // Otherwise, wrap it in a generic error
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to cancel ICO offering and refund investments",
    });
  }
};
