"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVestingSchedule = createVestingSchedule;
exports.calculateVestedAmount = calculateVestedAmount;
exports.processVestingReleases = processVestingReleases;
exports.claimVestedTokens = claimVestedTokens;
exports.assertTransactionAmountMutable = assertTransactionAmountMutable;
exports.getVestingScheduleForUser = getVestingScheduleForUser;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const notifications_1 = require("@b/utils/notifications");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const wallet_1 = require("@b/services/wallet");
async function createVestingSchedule(transactionId, schedule) {
    const transaction = await db_1.sequelize.transaction();
    try {
        const icoTransaction = await db_1.models.icoTransaction.findByPk(transactionId, {
            include: [{
                    model: db_1.models.icoTokenOffering,
                    as: "offering",
                }],
            transaction,
        });
        if (!icoTransaction) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
        }
        let releaseSchedule = null;
        if (schedule.type === "MILESTONE" && schedule.milestones) {
            const totalPercentage = schedule.milestones.reduce((sum, m) => sum + m.percentage, 0);
            if (Math.abs(totalPercentage - 100) > 0.01) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Milestone percentages must sum to 100%. Current total: ${totalPercentage}%`
                });
            }
        }
        if (schedule.type === "MILESTONE" && schedule.milestones) {
            releaseSchedule = schedule.milestones.map(m => ({
                date: m.date,
                percentage: m.percentage,
                amount: icoTransaction.amount * (m.percentage / 100),
            }));
        }
        const vesting = await db_1.models.icoTokenVesting.create({
            transactionId: icoTransaction.id,
            userId: icoTransaction.userId,
            offeringId: icoTransaction.offeringId,
            totalAmount: icoTransaction.amount,
            releasedAmount: 0,
            vestingType: schedule.type,
            startDate: schedule.startDate,
            endDate: schedule.endDate,
            cliffDuration: schedule.cliffDuration,
            releaseSchedule,
            status: "ACTIVE",
        }, { transaction });
        if (schedule.type === "MILESTONE" && releaseSchedule) {
            for (const milestone of releaseSchedule) {
                await db_1.models.icoTokenVestingRelease.create({
                    vestingId: vesting.id,
                    releaseAmount: milestone.amount,
                    percentage: milestone.percentage,
                    releaseDate: milestone.date,
                }, { transaction });
            }
        }
        await transaction.commit();
        return vesting;
    }
    catch (error) {
        await transaction.rollback();
        throw error;
    }
}
async function calculateVestedAmount(vestingId) {
    const vesting = await db_1.models.icoTokenVesting.findByPk(vestingId);
    if (!vesting)
        return 0;
    const now = new Date();
    if (now < vesting.startDate)
        return 0;
    if (now >= vesting.endDate)
        return vesting.totalAmount;
    switch (vesting.vestingType) {
        case "LINEAR":
            if (vesting.cliffDuration) {
                const cliffEndDate = new Date(vesting.startDate);
                cliffEndDate.setDate(cliffEndDate.getDate() + vesting.cliffDuration);
                if (now < cliffEndDate)
                    return 0;
            }
            const totalDuration = vesting.endDate.getTime() - vesting.startDate.getTime();
            const elapsed = now.getTime() - vesting.startDate.getTime();
            const percentage = elapsed / totalDuration;
            return vesting.totalAmount * percentage;
        case "CLIFF":
            const cliffDate = new Date(vesting.startDate);
            cliffDate.setDate(cliffDate.getDate() + (vesting.cliffDuration || 365));
            return now >= cliffDate ? vesting.totalAmount : 0;
        case "MILESTONE":
            if (!vesting.releaseSchedule)
                return 0;
            let vestedAmount = 0;
            for (const milestone of vesting.releaseSchedule) {
                if (new Date(milestone.date) <= now) {
                    vestedAmount += milestone.amount;
                }
            }
            return parseFloat(Number(vestedAmount).toFixed(8));
        default:
            return 0;
    }
}
async function processVestingReleases() {
    var _a, _b, _c, _d;
    const transaction = await db_1.sequelize.transaction();
    try {
        const now = new Date();
        const pendingReleases = await db_1.models.icoTokenVestingRelease.findAll({
            where: {
                status: "PENDING",
                releaseDate: { [sequelize_1.Op.lte]: now },
            },
            include: [{
                    model: db_1.models.icoTokenVesting,
                    as: "vesting",
                    where: { status: "ACTIVE" },
                    include: [{
                            model: db_1.models.icoTransaction,
                            as: "transaction",
                            include: [{
                                    model: db_1.models.icoTokenOffering,
                                    as: "offering",
                                }],
                        }],
                }],
            transaction,
        });
        for (const release of pendingReleases) {
            try {
                const vesting = release.vesting;
                if (!vesting) {
                    console_1.logger.warn("ICO_VESTING", `Vesting not found for release ${release.id}`);
                    continue;
                }
                const vestingTransaction = vesting.transaction;
                const offering = vestingTransaction === null || vestingTransaction === void 0 ? void 0 : vestingTransaction.offering;
                await release.update({ status: "RELEASED" }, { transaction });
                await vesting.update({ releasedAmount: vesting.releasedAmount + release.releaseAmount }, { transaction });
                if (offering) {
                    try {
                        const walletResult = await wallet_1.walletCreationService.getOrCreateWallet(vesting.userId, offering.purchaseWalletType, offering.symbol, transaction);
                        const recipientWallet = walletResult === null || walletResult === void 0 ? void 0 : walletResult.wallet;
                        if (!recipientWallet) {
                            throw (0, error_1.createError)({
                                statusCode: 500,
                                message: `Failed to get or create ${offering.purchaseWalletType} wallet for ${offering.symbol} vesting`,
                            });
                        }
                        await wallet_1.walletService.credit({
                            idempotencyKey: `ico_vesting_release_${release.id}`,
                            userId: vesting.userId,
                            walletId: recipientWallet.id,
                            walletType: offering.purchaseWalletType,
                            currency: offering.symbol,
                            amount: release.releaseAmount,
                            operationType: "RELEASE",
                            referenceId: release.id,
                            description: `Vesting release: ${offering.name} - ${release.releaseAmount} tokens`,
                            metadata: {
                                vestingId: vesting.id,
                                releaseId: release.id,
                                offeringId: vesting.offeringId,
                            },
                            transaction,
                        });
                    }
                    catch (walletError) {
                        console_1.logger.error("ICO_VESTING", `Failed to credit wallet for release ${release.id}`, walletError);
                        throw walletError;
                    }
                }
                await (0, notifications_1.createNotification)({
                    userId: vesting.userId,
                    relatedId: vesting.offeringId,
                    type: "investment",
                    title: "Vested Tokens Available",
                    message: `${release.releaseAmount} ${(_a = offering === null || offering === void 0 ? void 0 : offering.symbol) !== null && _a !== void 0 ? _a : "tokens"} tokens are now available for release`,
                    details: `Your vested tokens from ${(_b = offering === null || offering === void 0 ? void 0 : offering.name) !== null && _b !== void 0 ? _b : "ICO"} are ready to be claimed.`,
                    link: `/ico/dashboard?tab=vesting`,
                    actions: [
                        {
                            label: "Claim Tokens",
                            link: `/ico/vesting/${release.vestingId}/claim`,
                            primary: true,
                        },
                    ],
                });
                const systemAdmin = await db_1.models.user.findOne({
                    include: [{
                            model: db_1.models.role,
                            as: "role",
                            where: { name: "Super Admin" },
                        }],
                    order: [["createdAt", "ASC"]],
                    transaction,
                });
                if (systemAdmin) {
                    await db_1.models.icoAdminActivity.create({
                        type: "VESTING_RELEASE",
                        offeringId: vesting.offeringId,
                        offeringName: (_c = offering === null || offering === void 0 ? void 0 : offering.name) !== null && _c !== void 0 ? _c : "Unknown Offering",
                        adminId: systemAdmin.id,
                        details: JSON.stringify({
                            vestingId: release.vestingId,
                            releaseId: release.id,
                            amount: release.releaseAmount,
                            userId: vesting.userId,
                            systemAction: true,
                        }),
                    }, { transaction });
                }
            }
            catch (error) {
                console_1.logger.error("ICO_VESTING", `Failed to process vesting release ${release.id}`, error);
                await release.update({
                    status: "FAILED",
                    failureReason: (_d = error.message) !== null && _d !== void 0 ? _d : "Unknown error"
                }, { transaction });
            }
        }
        const activeVestings = await db_1.models.icoTokenVesting.findAll({
            where: {
                status: "ACTIVE",
                endDate: { [sequelize_1.Op.lte]: now },
            },
            transaction,
        });
        for (const vesting of activeVestings) {
            if (vesting.releasedAmount >= vesting.totalAmount) {
                await vesting.update({ status: "COMPLETED" }, { transaction });
            }
        }
        await transaction.commit();
    }
    catch (error) {
        await transaction.rollback();
        console_1.logger.error("ICO_VESTING", "Error processing vesting releases", error);
        throw error;
    }
}
async function claimVestedTokens(vestingId, userId, walletAddress, transactionHash) {
    var _a;
    const transaction = await db_1.sequelize.transaction();
    try {
        const vesting = await db_1.models.icoTokenVesting.findOne({
            where: {
                id: vestingId,
                userId,
                status: "ACTIVE",
            },
            include: [{
                    model: db_1.models.icoTokenVestingRelease,
                    as: "releases",
                    where: { status: "RELEASED" },
                }],
            transaction,
        });
        if (!vesting) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Vesting not found or access denied" });
        }
        const releases = (_a = vesting.releases) !== null && _a !== void 0 ? _a : [];
        for (const release of releases) {
            await release.update({
                status: "RELEASED",
                transactionHash,
            }, { transaction });
        }
        await transaction.commit();
        await (0, notifications_1.createNotification)({
            userId,
            relatedId: vesting.offeringId,
            type: "investment",
            title: "Vested Tokens Claimed",
            message: "Your vested tokens have been successfully claimed",
            details: `Transaction hash: ${transactionHash}`,
            link: `/ico/dashboard?tab=vesting`,
        });
    }
    catch (error) {
        await transaction.rollback();
        throw error;
    }
}
async function assertTransactionAmountMutable(transactionId) {
    if (!transactionId)
        return;
    const vestingCount = await db_1.models.icoTokenVesting.count({
        where: { transactionId },
    });
    if (vestingCount > 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "cannot modify amount after vesting scheduled",
        });
    }
}
async function getVestingScheduleForUser(userId) {
    const vestings = await db_1.models.icoTokenVesting.findAll({
        where: {
            userId,
            status: { [sequelize_1.Op.in]: ["ACTIVE", "COMPLETED"] },
        },
        include: [
            {
                model: db_1.models.icoTokenVestingRelease,
                as: "releases",
            },
            {
                model: db_1.models.icoTransaction,
                as: "transaction",
                include: [{
                        model: db_1.models.icoTokenOffering,
                        as: "offering",
                        attributes: ["name", "symbol"],
                    }],
            },
        ],
        order: [["startDate", "ASC"]],
    });
    return await Promise.all(vestings.map(async (v) => {
        const vestedAmount = await calculateVestedAmount(v.id);
        return {
            ...v.get({ plain: true }),
            vestedAmount,
            availableToClaim: vestedAmount - v.releasedAmount,
        };
    }));
}
