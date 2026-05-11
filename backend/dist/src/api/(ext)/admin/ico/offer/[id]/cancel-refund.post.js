"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const notification_1 = require("@b/services/notification");
const wallet_1 = require("@b/services/wallet");
const fees_1 = require("@b/utils/fees");
exports.metadata = {
    summary: "Emergency Cancel & Refund ICO (SuperAdmin Only)",
    description: "Emergency cancellation endpoint for SuperAdmins only. Cancels an active ICO offering and refunds ALL investors. Use this for scam prevention or critical security issues.",
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
    permission: "manage.system",
    responses: {
        200: {
            description: "ICO cancelled and all investors refunded successfully",
        },
        401: query_1.unauthorizedResponse,
        403: {
            description: "Forbidden - SuperAdmin privileges required",
        },
        404: (0, query_1.notFoundMetadataResponse)("Offering"),
        500: query_1.serverErrorResponse,
    },
    logModule: "ADMIN_ICO",
    logTitle: "Emergency Cancel & Refund ICO",
};
exports.default = async (data) => {
    var _a, _b, _c;
    const { user, params, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Unauthorized: SuperAdmin privileges required",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying SuperAdmin privileges");
    const userWithRole = await db_1.models.user.findByPk(user.id, {
        include: [{
                model: db_1.models.role,
                as: "role",
                attributes: ["name"],
            }],
    });
    if (!userWithRole || ((_a = userWithRole.role) === null || _a === void 0 ? void 0 : _a.name) !== "Super Admin") {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Forbidden: This endpoint is restricted to SuperAdmins only",
        });
    }
    const { id } = params;
    const { reason } = body;
    if (!reason || reason.trim().length < 10) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Cancellation reason is required (minimum 10 characters)",
        });
    }
    let transaction;
    try {
        transaction = await db_1.sequelize.transaction();
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding ICO offering");
        const offering = await db_1.models.icoTokenOffering.findByPk(id, {
            transaction,
            include: [{
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "email"],
                }],
        });
        if (!offering) {
            throw (0, error_1.createError)({ statusCode: 404, message: "ICO offering not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Retrieving all active investments");
        const transactions = await db_1.models.icoTransaction.findAll({
            where: {
                offeringId: id,
                status: { [sequelize_1.Op.in]: ["PENDING", "VERIFICATION"] },
            },
            include: [{
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "email"],
                }],
            transaction,
        });
        console_1.logger.info("ADMIN_ICO_CANCEL", `Found ${transactions.length} active investments to refund`);
        const walletType = offering.purchaseWalletType;
        const currency = offering.purchaseWalletCurrency;
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Processing ${transactions.length} refunds`);
        let totalRefunded = 0;
        let successfulRefunds = 0;
        let failedRefunds = 0;
        const refundDetails = [];
        const escrowAdmin = await (0, fees_1.getSuperAdmin)();
        if (!escrowAdmin) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "ICO escrow Super Admin wallet not configured.",
            });
        }
        for (const investment of transactions) {
            try {
                const refundAmount = investment.amount * investment.price;
                try {
                    await wallet_1.walletService.debit({
                        idempotencyKey: `ico_escrow_refund_${investment.id}`,
                        userId: escrowAdmin.id,
                        walletType: walletType,
                        currency: currency,
                        amount: refundAmount,
                        operationType: "REFUND",
                        referenceId: investment.id,
                        description: `ICO escrow refund to buyer for ${offering.name} (tx ${investment.id}) - emergency cancel`,
                        metadata: {
                            escrow: true,
                            direction: "refund",
                            transactionId: investment.id,
                            offeringId: id,
                            emergencyCancellation: true,
                        },
                        transaction,
                    });
                }
                catch (escrowErr) {
                    if ((escrowErr === null || escrowErr === void 0 ? void 0 : escrowErr.name) !== "DuplicateOperationError")
                        throw escrowErr;
                    console_1.logger.warn("ADMIN_ICO_CANCEL", `Escrow already refunded for investment ${investment.id}; continuing.`);
                }
                const refundResult = await wallet_1.walletService.credit({
                    idempotencyKey: `ico_emergency_refund_${investment.id}`,
                    userId: investment.userId,
                    walletType: walletType,
                    currency: currency,
                    amount: refundAmount,
                    operationType: "REFUND",
                    description: `Emergency ICO refund for: ${offering.name}. Reason: ${reason}`,
                    referenceId: `ico_refund_${investment.id}`,
                    transaction,
                    metadata: {
                        offeringId: id,
                        offeringName: offering.name,
                        investmentId: investment.id,
                        cancelledBy: user.id,
                        emergencyCancellation: true,
                    },
                });
                await investment.update({
                    status: "REFUNDED",
                    notes: `EMERGENCY CANCELLATION - ${reason}`,
                }, { transaction });
                totalRefunded += refundAmount;
                successfulRefunds++;
                refundDetails.push({
                    transactionId: investment.id,
                    userId: investment.userId,
                    userName: investment.user ? `${investment.user.firstName} ${investment.user.lastName}` : "Unknown",
                    amount: refundAmount,
                    currency: currency,
                    status: "SUCCESS",
                    walletTransactionId: refundResult.transactionId,
                });
                console_1.logger.success("ADMIN_ICO_CANCEL", `Refunded ${refundAmount} ${currency} to user ${investment.userId}`);
            }
            catch (refundError) {
                if (refundError.name === "DuplicateOperationError") {
                    console_1.logger.warn("ADMIN_ICO_CANCEL", `Investment ${investment.id} already refunded, skipping`);
                    successfulRefunds++;
                    refundDetails.push({
                        transactionId: investment.id,
                        userId: investment.userId,
                        amount: investment.amount * investment.price,
                        currency: currency,
                        status: "ALREADY_REFUNDED",
                    });
                    continue;
                }
                console_1.logger.error("ADMIN_ICO_CANCEL", `Failed to refund investment ${investment.id}`, refundError);
                failedRefunds++;
                refundDetails.push({
                    transactionId: investment.id,
                    userId: investment.userId,
                    amount: investment.amount * investment.price,
                    currency: currency,
                    status: "FAILED",
                    reason: refundError.message,
                });
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating offering status to CANCELLED");
        await offering.update({
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancelledBy: user.id,
            cancellationReason: reason,
        }, { transaction });
        await db_1.models.icoAdminActivity.create({
            type: "EMERGENCY_CANCEL_REFUND",
            offeringId: id,
            offeringName: offering.name,
            adminId: user.id,
            details: JSON.stringify({
                reason,
                totalInvestments: transactions.length,
                successfulRefunds,
                failedRefunds,
                totalRefunded,
                refundDetails,
                cancelledBy: (_b = userWithRole.role) === null || _b === void 0 ? void 0 : _b.name,
                timestamp: new Date().toISOString(),
            }),
        }, { transaction });
        if (failedRefunds > 0 && successfulRefunds === 0) {
            await transaction.rollback();
            throw (0, error_1.createError)({
                statusCode: 500,
                message: `All ${failedRefunds} refund(s) failed. Transaction rolled back. Please resolve wallet issues and try again.`,
            });
        }
        await transaction.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notifications to refunded investors");
        for (const detail of refundDetails) {
            if (detail.status === "SUCCESS") {
                try {
                    await notification_1.notificationService.send({
                        userId: detail.userId,
                        type: "ICO",
                        channels: ["IN_APP"],
                        idempotencyKey: `ico_refund_${id}_${detail.userId}_${detail.transactionId}`,
                        data: {
                            title: "ICO Investment Refunded",
                            message: `Your investment of ${detail.amount} ${detail.currency} in "${offering.name}" has been refunded due to: ${reason}`,
                        },
                        priority: "HIGH"
                    });
                }
                catch (notifError) {
                    console_1.logger.error("ADMIN_ICO_CANCEL", "Failed to send refund notification", notifError);
                }
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Emergency cancellation and refunds completed successfully");
        return {
            message: "ICO offering cancelled and all investments refunded successfully",
            data: {
                offeringId: id,
                offeringName: offering.name,
                totalInvestments: transactions.length,
                successfulRefunds,
                failedRefunds,
                totalRefunded,
                currency: currency || "N/A",
                cancelledBy: `${userWithRole.firstName} ${userWithRole.lastName}`,
                reason,
                refundDetails,
            },
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
                if (!((_c = rollbackError.message) === null || _c === void 0 ? void 0 : _c.includes("already been finished"))) {
                    console_1.logger.error("ADMIN_ICO_CANCEL", "Transaction rollback failed", rollbackError);
                }
            }
        }
        console_1.logger.error("ADMIN_ICO_CANCEL", "Error cancelling ICO offering", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message || "Failed to cancel ICO offering and refund investments",
        });
    }
};
