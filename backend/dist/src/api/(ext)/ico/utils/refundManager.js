"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAndProcessFailedOfferings = checkAndProcessFailedOfferings;
exports.processAutomaticRefunds = processAutomaticRefunds;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const notifications_1 = require("@b/utils/notifications");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
async function checkAndProcessFailedOfferings() {
    const transaction = await db_1.sequelize.transaction();
    try {
        const now = new Date();
        const failedOfferings = await db_1.models.icoTokenOffering.findAll({
            where: {
                status: 'ACTIVE',
                endDate: { [sequelize_1.Op.lt]: now },
            },
            include: [{
                    model: db_1.models.icoTokenDetail,
                    as: "tokenDetail",
                }],
            transaction,
        });
        for (const offering of failedOfferings) {
            const totalRaised = await db_1.models.icoTransaction.sum('amount', {
                where: {
                    offeringId: offering.id,
                    status: { [sequelize_1.Op.in]: ['PENDING', 'VERIFICATION', 'RELEASED'] }
                },
                transaction,
            }) || 0;
            const softCap = offering.targetAmount * 0.3;
            if (totalRaised < softCap) {
                await offering.update({
                    status: 'FAILED',
                    reviewNotes: JSON.stringify({
                        failureReason: 'Soft cap not reached',
                        totalRaised,
                        softCap,
                        failedAt: now.toISOString(),
                    })
                }, { transaction });
                await db_1.models.icoTransaction.update({
                    status: 'REJECTED',
                    notes: JSON.stringify({
                        rejectionReason: 'Soft cap not reached - pending refund',
                        rejectedAt: now.toISOString(),
                    })
                }, {
                    where: {
                        offeringId: offering.id,
                        status: { [sequelize_1.Op.in]: ['PENDING', 'VERIFICATION'] }
                    },
                    transaction,
                });
                await (0, notifications_1.createNotification)({
                    userId: offering.userId,
                    relatedId: offering.id,
                    type: "system",
                    title: "ICO Offering Failed",
                    message: `${offering.name} failed to reach soft cap`,
                    details: `Total raised: ${totalRaised} ${offering.purchaseWalletCurrency}\nSoft cap: ${softCap} ${offering.purchaseWalletCurrency}\nRefunds will be processed for all investors.`,
                    link: `/ico/creator/token/${offering.id}`,
                    actions: [
                        {
                            label: "Process Refunds",
                            link: `/ico/creator/token/${offering.id}/refunds`,
                            primary: true,
                        },
                    ],
                });
                const investors = await db_1.models.icoTransaction.findAll({
                    where: {
                        offeringId: offering.id,
                        status: 'REJECTED',
                    },
                    attributes: ['userId'],
                    group: ['userId'],
                    transaction,
                });
                for (const investor of investors) {
                    await (0, notifications_1.createNotification)({
                        userId: investor.userId,
                        relatedId: offering.id,
                        type: "investment",
                        title: "ICO Investment Refund Available",
                        message: `${offering.name} did not reach its funding goal`,
                        details: `Your investment will be refunded. The ICO failed to reach its soft cap of ${softCap} ${offering.purchaseWalletCurrency}.`,
                        link: `/ico/dashboard?tab=transactions`,
                    });
                }
                await db_1.models.icoAdminActivity.create({
                    type: "OFFERING_FAILED",
                    offeringId: offering.id,
                    offeringName: offering.name,
                    adminId: null,
                    details: JSON.stringify({
                        reason: 'Soft cap not reached',
                        totalRaised,
                        softCap,
                        currency: offering.purchaseWalletCurrency,
                        investorCount: investors.length,
                    }),
                }, { transaction });
            }
        }
        await transaction.commit();
    }
    catch (error) {
        await transaction.rollback();
        console_1.logger.error("ICO_REFUND", "Error checking failed offerings", error);
        throw error;
    }
}
async function processAutomaticRefunds() {
    const transaction = await db_1.sequelize.transaction();
    try {
        const refundableOfferings = await db_1.models.icoTokenOffering.findAll({
            where: {
                status: { [sequelize_1.Op.in]: ['FAILED', 'CANCELLED'] },
            },
            transaction,
        });
        for (const offering of refundableOfferings) {
            const pendingRefunds = await db_1.models.icoTransaction.count({
                where: {
                    offeringId: offering.id,
                    status: 'REJECTED',
                },
                transaction,
            });
            if (pendingRefunds === 0)
                continue;
            const pendingTransactions = await db_1.models.icoTransaction.findAll({
                where: {
                    offeringId: offering.id,
                    status: 'REJECTED',
                },
                transaction,
            });
            let refundedCount = 0;
            let totalRefunded = 0;
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
                    if (!wallet)
                        continue;
                    const idempotencyKey = `ico_auto_refund_${icoTransaction.id}`;
                    await wallet_1.walletService.credit({
                        idempotencyKey,
                        userId: icoTransaction.userId,
                        walletId: wallet.id,
                        walletType: offering.purchaseWalletType,
                        currency: offering.purchaseWalletCurrency,
                        amount: refundAmount,
                        operationType: "REFUND",
                        referenceId: icoTransaction.id,
                        description: `Automatic ICO Refund: ${offering.name}`,
                        metadata: {
                            offeringId: offering.id,
                            offeringName: offering.name,
                            originalTransactionId: icoTransaction.id,
                            reason: 'Automatic refund - offering failed',
                            processedBy: 'SYSTEM',
                        },
                        transaction,
                    });
                    await icoTransaction.update({
                        notes: JSON.stringify({
                            ...JSON.parse(icoTransaction.notes || '{}'),
                            refund: {
                                amount: refundAmount,
                                reason: 'Automatic refund - offering failed',
                                processedAt: new Date().toISOString(),
                                processedBy: 'SYSTEM',
                            }
                        })
                    }, { transaction });
                    refundedCount++;
                    totalRefunded += refundAmount;
                }
                catch (error) {
                    console_1.logger.error("ICO_REFUND", `Failed to refund transaction ${icoTransaction.id}`, error);
                }
            }
            if (refundedCount === pendingTransactions.length) {
                await offering.update({
                    reviewNotes: JSON.stringify({
                        ...JSON.parse(offering.reviewNotes || '{}'),
                        automaticRefund: {
                            refundedAt: new Date().toISOString(),
                            refundedCount,
                            totalRefunded,
                            allRefundsProcessed: true,
                        }
                    })
                }, { transaction });
            }
        }
        await transaction.commit();
    }
    catch (error) {
        await transaction.rollback();
        console_1.logger.error("ICO_REFUND", "Error processing automatic refunds", error);
        throw error;
    }
}
