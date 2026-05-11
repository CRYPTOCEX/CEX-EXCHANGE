"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const notifications_1 = require("@b/utils/notifications");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
exports.metadata = {
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
exports.default = async (data) => {
    var _a, _b;
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating refund request");
    const { offeringId, reason } = body;
    if (!offeringId || !reason) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Missing required fields" });
    }
    const transaction = await db_1.sequelize.transaction();
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Retrieving offering details");
        const offering = await db_1.models.icoTokenOffering.findByPk(offeringId, {
            include: [{
                    model: db_1.models.icoTokenDetail,
                    as: "tokenDetail",
                }],
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (!offering) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Offering not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying user permissions");
        const isOwner = offering.userId === user.id;
        const fullUser = await db_1.models.user.findByPk(user.id, {
            include: [{ model: db_1.models.role, as: "role" }]
        });
        const isAdmin = ((_a = fullUser === null || fullUser === void 0 ? void 0 : fullUser.role) === null || _a === void 0 ? void 0 : _a.name) === 'admin' || ((_b = fullUser === null || fullUser === void 0 ? void 0 : fullUser.role) === null || _b === void 0 ? void 0 : _b.name) === 'super_admin';
        if (!isOwner && !isAdmin) {
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "Only the offering owner or admin can process refunds"
            });
        }
        if (offering.status !== 'FAILED' && offering.status !== 'CANCELLED') {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Cannot process refunds for offering with status: ${offering.status}`
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Retrieving pending transactions for refund");
        const pendingTransactions = await db_1.models.icoTransaction.findAll({
            where: {
                offeringId: offering.id,
                status: { [sequelize_1.Op.in]: ['PENDING', 'VERIFICATION'] }
            },
            include: [{
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "email", "firstName", "lastName"],
                }],
            transaction,
        });
        if (pendingTransactions.length === 0) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "No transactions found for refund"
            });
        }
        let refundedCount = 0;
        let totalRefunded = 0;
        const failedRefunds = [];
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Processing ${pendingTransactions.length} refund transactions`);
        for (const icoTransaction of pendingTransactions) {
            try {
                const refundAmount = icoTransaction.amount * icoTransaction.price;
                const wallet = await db_1.models.wallet.findOne({
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
                const idempotencyKey = `ico_refund_${icoTransaction.id}`;
                await wallet_1.walletService.credit({
                    idempotencyKey,
                    userId: icoTransaction.userId,
                    walletId: wallet.id,
                    walletType: offering.purchaseWalletType,
                    currency: offering.purchaseWalletCurrency,
                    amount: refundAmount,
                    operationType: "REFUND",
                    referenceId: icoTransaction.id,
                    description: `ICO Refund: ${offering.name} - ${reason}`,
                    metadata: {
                        offeringId: offering.id,
                        offeringName: offering.name,
                        originalTransactionId: icoTransaction.id,
                        reason,
                        processedBy: user.id,
                    },
                    transaction,
                });
                const phase = await db_1.models.icoTokenOfferingPhase.findOne({
                    where: { offeringId: offering.id },
                    order: [['sequence', 'ASC']],
                    transaction,
                });
                if (phase) {
                    await phase.update({ remaining: db_1.sequelize.literal(`remaining + ${parseFloat(String(icoTransaction.amount))}`) }, { transaction });
                }
                await icoTransaction.update({
                    status: 'REFUNDED',
                    notes: JSON.stringify({
                        ...JSON.parse(icoTransaction.notes || '{}'),
                        refund: {
                            amount: refundAmount,
                            reason,
                            processedAt: new Date().toISOString(),
                            processedBy: user.id,
                        }
                    })
                }, { transaction });
                await (0, notifications_1.createNotification)({
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
            }
            catch (error) {
                console_1.logger.error("ICO_REFUND", `Failed to refund transaction ${icoTransaction.id}`, error);
                failedRefunds.push({
                    transactionId: icoTransaction.id,
                    userId: icoTransaction.userId,
                    reason: error.message,
                });
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating offering records and creating audit log");
        if (failedRefunds.length === 0) {
            await offering.update({
                reviewNotes: JSON.stringify({
                    ...JSON.parse(offering.reviewNotes || '{}'),
                    refund: {
                        refundReason: reason,
                        refundedAt: new Date().toISOString(),
                        refundedBy: user.id,
                        refundedCount,
                        totalRefunded,
                        allRefundsProcessed: true,
                    }
                })
            }, { transaction });
        }
        await db_1.models.icoAdminActivity.create({
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
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notifications to offering owner");
        if (!isOwner) {
            await (0, notifications_1.createNotification)({
                userId: offering.userId,
                relatedId: offering.id,
                type: "system",
                title: "ICO Refunds Processed",
                message: `Refunds have been processed for ${offering.name}`,
                details: `Refunded: ${refundedCount} investors\nTotal: ${totalRefunded} ${offering.purchaseWalletCurrency}\nReason: ${reason}`,
                link: `/ico/creator/token/${offering.id}`,
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Processed ${refundedCount} refunds totaling ${totalRefunded} ${offering.purchaseWalletCurrency}`);
        return {
            message: "Refunds processed successfully",
            refundedCount,
            totalRefunded,
            failedRefunds,
        };
    }
    catch (err) {
        await transaction.rollback();
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(err.message || "Failed to process refunds");
        throw err;
    }
};
