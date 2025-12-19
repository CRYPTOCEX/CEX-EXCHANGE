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
  summary: "Delete an ICO offering",
  description:
    "Deletes an ICO token offering. Admin-only endpoint. Cannot delete offerings with active investments.",
  operationId: "deleteIcoOffering",
  tags: ["ICO", "Admin", "Offerings"],
  parameters: [
    {
      name: "id",
      in: "path",
      description: "ID of the ICO offering to delete",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requiresAuth: true,
  permission: "delete.ico.offer",
  responses: {
    200: {
      description: "Offering deleted successfully",
    },
    400: {
      description:
        "Bad Request - Cannot delete offering with active investments",
    },
    401: unauthorizedResponse,
    403: {
      description: "Forbidden - Admin privileges required",
    },
    404: notFoundMetadataResponse("Offering"),
    500: serverErrorResponse,
  },
  logModule: "ADMIN_ICO",
  logTitle: "Delete ICO Offering",
};

export default async (data: Handler) => {
  const { user, params, ctx } = data;
  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized: Admin privileges required",
    });
  }

  const { id } = params;

  let transaction: any;

  try {
    transaction = await sequelize.transaction();
    ctx?.step("Finding ICO offering");
    // Find the offering
    const offering = await models.icoTokenOffering.findByPk(id, {
      transaction,
    });

    if (!offering) {
      throw createError({ statusCode: 404, message: "Offering not found" });
    }

    ctx?.step("Checking for active transactions");
    // Check if offering has any active (non-completed/non-rejected) transactions
    // Only block deletion for transactions that are truly in progress
    // COMPLETED and REJECTED transactions are historical records that don't block deletion
    const activeTransactions = await models.icoTransaction.count({
      where: {
        offeringId: id,
        status: {
          [Op.in]: ["PENDING", "VERIFICATION"],
          // Removed "RELEASED" - released transactions are completed and shouldn't block deletion
        },
      },
      transaction,
    });

    if (activeTransactions > 0) {
      throw createError({
        statusCode: 400,
        message: `Cannot delete offering with ${activeTransactions} active investment(s). Please wait for all investments to be released or rejected first.`,
      });
    }

    // Only allow deletion of PENDING, REJECTED, or FAILED offerings
    // Prevent deletion of ACTIVE or SUCCESS offerings that might have history
    if (offering.status === "SUCCESS") {
      throw createError({
        statusCode: 400,
        message:
          "Cannot delete successful offerings. They are kept for historical records.",
      });
    }

    ctx?.step("Deleting associated records");
    // Delete associated records in order (to handle foreign key constraints)
    // Note: Cascade delete should handle most of this, but we do it explicitly for clarity

    // Delete phases
    await models.icoTokenOfferingPhase.destroy({
      where: { offeringId: id },
      transaction,
    });

    // Delete team members
    await models.icoTeamMember.destroy({
      where: { offeringId: id },
      transaction,
    });

    // Delete roadmap items
    await models.icoRoadmapItem.destroy({
      where: { offeringId: id },
      transaction,
    });

    // Delete updates
    await models.icoTokenOfferingUpdate.destroy({
      where: { offeringId: id },
      transaction,
    });

    // Delete admin activities
    await models.icoAdminActivity.destroy({
      where: { offeringId: id },
      transaction,
    });

    // Delete token detail
    await models.icoTokenDetail.destroy({
      where: { offeringId: id },
      transaction,
    });

    // Delete all transactions (including rejected and completed ones)
    // Since we already verified there are no active PENDING/VERIFICATION transactions above
    await models.icoTransaction.destroy({
      where: { offeringId: id },
      transaction,
    });

    ctx?.step("Deleting offering");
    // Finally, delete the offering itself
    await offering.destroy({ transaction });

    await transaction.commit();

    ctx?.success("ICO offering deleted successfully");
    return {
      message: "ICO offering deleted successfully",
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
          logger.error("ADMIN_ICO_OFFER", "Transaction rollback failed", rollbackError);
        }
      }
    }

    logger.error("ADMIN_ICO_OFFER", "Error deleting ICO offering", error);

    // If it's already a createError, rethrow it
    if (error.statusCode) {
      throw error;
    }

    // Otherwise, wrap it in a generic error
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to delete ICO offering",
    });
  }
};
