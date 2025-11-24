import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { Op } from "sequelize";

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
};

export default async (data: Handler) => {
  const { user, params } = data;
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
    // Find the offering
    const offering = await models.icoTokenOffering.findByPk(id, {
      transaction,
    });

    if (!offering) {
      throw createError({ statusCode: 404, message: "Offering not found" });
    }

    // Check if offering has any non-rejected transactions
    const activeTransactions = await models.icoTransaction.count({
      where: {
        offeringId: id,
        status: { [Op.in]: ["PENDING", "VERIFICATION", "RELEASED"] },
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

    // Delete any rejected transactions
    await models.icoTransaction.destroy({
      where: { offeringId: id },
      transaction,
    });

    // Finally, delete the offering itself
    await offering.destroy({ transaction });

    await transaction.commit();

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
          console.error("Transaction rollback failed:", rollbackError.message);
        }
      }
    }

    console.error("Error deleting ICO offering:", error);

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
