"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentPhase = getCurrentPhase;
exports.getNextPhase = getNextPhase;
exports.checkAndUpdateOfferingStatus = checkAndUpdateOfferingStatus;
exports.transitionToNextPhase = transitionToNextPhase;
exports.checkSoftCap = checkSoftCap;
exports.checkHardCap = checkHardCap;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const notifications_1 = require("@b/utils/notifications");
const console_1 = require("@b/utils/console");
async function getCurrentPhase(offeringId, transaction) {
    const offering = await db_1.models.icoTokenOffering.findByPk(offeringId, { transaction });
    if (!offering)
        return null;
    const phases = await db_1.models.icoTokenOfferingPhase.findAll({
        where: { offeringId },
        order: [['sequence', 'ASC']],
        transaction,
    });
    if (phases.length === 0)
        return null;
    const now = new Date();
    let currentDate = new Date(offering.startDate);
    for (let i = 0; i < phases.length; i++) {
        const phase = phases[i];
        const phaseEndDate = new Date(currentDate);
        phaseEndDate.setTime(phaseEndDate.getTime() + phase.duration * 86400000);
        if (now >= currentDate && now < phaseEndDate) {
            return {
                id: phase.id,
                name: phase.name,
                tokenPrice: phase.tokenPrice,
                allocation: phase.allocation,
                remaining: phase.remaining,
                duration: phase.duration,
                startDate: currentDate,
                endDate: phaseEndDate,
                isActive: true,
                index: i,
            };
        }
        currentDate = phaseEndDate;
    }
    return null;
}
async function getNextPhase(offeringId, currentPhaseIndex, transaction) {
    const offering = await db_1.models.icoTokenOffering.findByPk(offeringId, { transaction });
    if (!offering)
        return null;
    const phases = await db_1.models.icoTokenOfferingPhase.findAll({
        where: { offeringId },
        order: [['sequence', 'ASC']],
        transaction,
    });
    if (currentPhaseIndex + 1 >= phases.length)
        return null;
    const currentDate = new Date(offering.startDate);
    for (let i = 0; i <= currentPhaseIndex + 1; i++) {
        const phase = phases[i];
        if (i === currentPhaseIndex + 1) {
            const phaseEndDate = new Date(currentDate);
            phaseEndDate.setTime(phaseEndDate.getTime() + phase.duration * 86400000);
            return {
                id: phase.id,
                name: phase.name,
                tokenPrice: phase.tokenPrice,
                allocation: phase.allocation,
                remaining: phase.remaining,
                duration: phase.duration,
                startDate: currentDate,
                endDate: phaseEndDate,
                isActive: false,
                index: i,
            };
        }
        currentDate.setTime(currentDate.getTime() + phase.duration * 86400000);
    }
    return null;
}
async function checkAndUpdateOfferingStatus() {
    const transaction = await db_1.sequelize.transaction();
    try {
        const activeOfferings = await db_1.models.icoTokenOffering.findAll({
            where: {
                status: 'ACTIVE',
                endDate: { [sequelize_1.Op.lte]: new Date() }
            },
            transaction,
        });
        for (const offering of activeOfferings) {
            const totalRaisedResult = await db_1.models.icoTransaction.findOne({
                where: {
                    offeringId: offering.id,
                    status: { [sequelize_1.Op.in]: ['VERIFICATION', 'RELEASED'] }
                },
                attributes: [
                    [db_1.sequelize.fn('SUM', db_1.sequelize.literal('amount * price')), 'totalRaised']
                ],
                raw: true,
                transaction,
            });
            const totalRaised = parseFloat(totalRaisedResult === null || totalRaisedResult === void 0 ? void 0 : totalRaisedResult.totalRaised) || 0;
            const status = totalRaised >= offering.targetAmount * 0.75 ? 'SUCCESS' : 'FAILED';
            await offering.update({ status }, { transaction });
            await (0, notifications_1.createNotification)({
                userId: offering.userId,
                relatedId: offering.id,
                type: "system",
                title: "ICO Offering Ended",
                message: `Your ICO offering "${offering.name}" has ended with status: ${status}`,
                details: `Total raised: ${totalRaised} ${offering.purchaseWalletCurrency} (Target: ${offering.targetAmount})`,
                link: `/ico/creator/token/${offering.id}`,
            });
            if (status === 'FAILED') {
                await db_1.models.icoTransaction.update({ status: 'REJECTED' }, {
                    where: {
                        offeringId: offering.id,
                        status: { [sequelize_1.Op.in]: ['PENDING', 'VERIFICATION'] }
                    },
                    transaction,
                });
            }
        }
        const upcomingOfferings = await db_1.models.icoTokenOffering.findAll({
            where: {
                status: 'UPCOMING',
                startDate: { [sequelize_1.Op.lte]: new Date() }
            },
            transaction,
        });
        for (const offering of upcomingOfferings) {
            await offering.update({ status: 'ACTIVE' }, { transaction });
            await (0, notifications_1.createNotification)({
                userId: offering.userId,
                relatedId: offering.id,
                type: "system",
                title: "ICO Offering Started",
                message: `Your ICO offering "${offering.name}" is now active!`,
                link: `/ico/creator/token/${offering.id}`,
            });
        }
        await transaction.commit();
    }
    catch (error) {
        await transaction.rollback();
        console_1.logger.error("ICO", "Error updating offering statuses", error);
        throw error;
    }
}
async function transitionToNextPhase(offeringId) {
    const transaction = await db_1.sequelize.transaction();
    try {
        const currentPhase = await getCurrentPhase(offeringId, transaction);
        if (!currentPhase)
            return false;
        const nextPhase = await getNextPhase(offeringId, currentPhase.index, transaction);
        if (!nextPhase)
            return false;
        const offering = await db_1.models.icoTokenOffering.findByPk(offeringId, { transaction });
        if (!offering)
            return false;
        await offering.update({ tokenPrice: nextPhase.tokenPrice }, { transaction });
        await db_1.models.icoAdminActivity.create({
            type: "PHASE_TRANSITION",
            offeringId: offering.id,
            offeringName: offering.name,
            adminId: null,
            details: JSON.stringify({
                fromPhase: currentPhase.name,
                toPhase: nextPhase.name,
                oldPrice: currentPhase.tokenPrice,
                newPrice: nextPhase.tokenPrice,
            }),
        }, { transaction });
        await (0, notifications_1.createNotification)({
            userId: offering.userId,
            relatedId: offering.id,
            type: "system",
            title: "ICO Phase Transition",
            message: `${offering.name} has moved to phase: ${nextPhase.name}`,
            details: `New token price: ${nextPhase.tokenPrice} ${offering.purchaseWalletCurrency}`,
            link: `/ico/creator/token/${offering.id}`,
        });
        await transaction.commit();
        return true;
    }
    catch (error) {
        await transaction.rollback();
        console_1.logger.error("ICO", "Error transitioning phase", error);
        return false;
    }
}
async function checkSoftCap(offeringId) {
    const offering = await db_1.models.icoTokenOffering.findByPk(offeringId);
    if (!offering)
        return false;
    const totalRaisedResult = await db_1.models.icoTransaction.findOne({
        where: {
            offeringId: offering.id,
            status: { [sequelize_1.Op.in]: ['VERIFICATION', 'RELEASED'] }
        },
        attributes: [
            [db_1.sequelize.fn('SUM', db_1.sequelize.literal('amount * price')), 'totalRaised']
        ],
        raw: true,
    });
    const totalRaised = parseFloat(totalRaisedResult === null || totalRaisedResult === void 0 ? void 0 : totalRaisedResult.totalRaised) || 0;
    const softCap = offering.targetAmount * 0.3;
    return totalRaised >= softCap;
}
async function checkHardCap(offeringId) {
    const offering = await db_1.models.icoTokenOffering.findByPk(offeringId);
    if (!offering)
        return false;
    const totalRaisedResult = await db_1.models.icoTransaction.findOne({
        where: {
            offeringId: offering.id,
            status: { [sequelize_1.Op.in]: ['VERIFICATION', 'RELEASED'] }
        },
        attributes: [
            [db_1.sequelize.fn('SUM', db_1.sequelize.literal('amount * price')), 'totalRaised']
        ],
        raw: true,
    });
    const totalRaised = parseFloat(totalRaisedResult === null || totalRaisedResult === void 0 ? void 0 : totalRaisedResult.totalRaised) || 0;
    return totalRaised >= offering.targetAmount;
}
