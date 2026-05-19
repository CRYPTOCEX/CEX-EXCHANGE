"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Delete an ICO offering",
    description: "Deletes an ICO token offering. Admin-only endpoint. Cannot delete offerings with active investments.",
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
            description: "Bad Request - Cannot delete offering with active investments",
        },
        401: query_1.unauthorizedResponse,
        403: {
            description: "Forbidden - Admin privileges required",
        },
        404: (0, query_1.notFoundMetadataResponse)("Offering"),
        500: query_1.serverErrorResponse,
    },
    logModule: "ADMIN_ICO",
    logTitle: "Delete ICO Offering",
};
exports.default = async (data) => {
    var _a;
    const { user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Unauthorized: Admin privileges required",
        });
    }
    const { id } = params;
    let transaction;
    try {
        transaction = await db_1.sequelize.transaction();
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding ICO offering");
        const offering = await db_1.models.icoTokenOffering.findByPk(id, {
            transaction,
        });
        if (!offering) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Offering not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for active transactions");
        const activeTransactions = await db_1.models.icoTransaction.count({
            where: {
                offeringId: id,
                status: {
                    [sequelize_1.Op.in]: ["PENDING", "VERIFICATION", "RELEASED"],
                },
            },
            transaction,
        });
        if (activeTransactions > 0) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Cannot delete offering with ${activeTransactions} active investment(s). Please wait for all investments to be released or rejected first.`,
            });
        }
        if (offering.status === "SUCCESS") {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Cannot delete successful offerings. They are kept for historical records.",
            });
        }
        if (offering.status === "ACTIVE") {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Cannot delete active offerings. Cancel the offering first.",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting associated records");
        await db_1.models.icoTokenOfferingPhase.destroy({
            where: { offeringId: id },
            transaction,
        });
        await db_1.models.icoTeamMember.destroy({
            where: { offeringId: id },
            transaction,
        });
        await db_1.models.icoRoadmapItem.destroy({
            where: { offeringId: id },
            transaction,
        });
        await db_1.models.icoTokenOfferingUpdate.destroy({
            where: { offeringId: id },
            transaction,
        });
        await db_1.models.icoTokenDetail.destroy({
            where: { offeringId: id },
            transaction,
        });
        await db_1.models.icoTransaction.destroy({
            where: { offeringId: id },
            transaction,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting offering");
        await offering.destroy({ transaction });
        await transaction.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.success("ICO offering deleted successfully");
        return {
            message: "ICO offering deleted successfully",
        };
    }
    catch (error) {
        if (transaction) {
            try {
                if (!transaction.finished) {
                    await transaction.rollback();
                }
            }
            catch (rollbackError) {
                if (!((_a = rollbackError.message) === null || _a === void 0 ? void 0 : _a.includes("already been finished"))) {
                    console_1.logger.error("ADMIN_ICO_OFFER", "Transaction rollback failed", rollbackError);
                }
            }
        }
        console_1.logger.error("ADMIN_ICO_OFFER", "Error deleting ICO offering", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message || "Failed to delete ICO offering",
        });
    }
};
