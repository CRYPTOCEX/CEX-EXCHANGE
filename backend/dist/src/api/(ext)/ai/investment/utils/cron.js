"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processAiInvestments = processAiInvestments;
exports.getActiveInvestments = getActiveInvestments;
exports.processAiInvestment = processAiInvestment;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const date_fns_1 = require("date-fns");
const emails_1 = require("@b/utils/emails");
const notifications_1 = require("@b/utils/notifications");
const broadcast_1 = require("@b/cron/broadcast");
const wallet_1 = require("@b/services/wallet");
async function processAiInvestments() {
    const cronName = "processAiInvestments";
    const startTime = Date.now();
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting AI investments processing");
        const activeInvestments = await getActiveInvestments();
        const total = activeInvestments.length;
        (0, broadcast_1.broadcastLog)(cronName, `Found ${total} active AI investments`);
        for (let i = 0; i < total; i++) {
            const investment = activeInvestments[i];
            (0, broadcast_1.broadcastLog)(cronName, `Processing AI investment id ${investment.id} (current status: ${investment.status})`);
            try {
                const updated = await processAiInvestment(investment);
                if (updated) {
                    (0, broadcast_1.broadcastLog)(cronName, `Successfully processed AI investment id ${investment.id}`, "success");
                }
                else {
                    (0, broadcast_1.broadcastLog)(cronName, `No update for AI investment id ${investment.id}`, "warning");
                }
            }
            catch (error) {
                console_1.logger.error("AI_INVESTMENT_PROCESS", `Error processing investment ${investment.id}: ${error.message}`, error);
                (0, broadcast_1.broadcastLog)(cronName, `Error processing AI investment id ${investment.id}: ${error.message}`, "error");
                continue;
            }
            const progress = Math.round(((i + 1) / total) * 100);
            (0, broadcast_1.broadcastProgress)(cronName, progress);
        }
        (0, broadcast_1.broadcastStatus)(cronName, "completed", {
            duration: Date.now() - startTime,
        });
        (0, broadcast_1.broadcastLog)(cronName, "AI investments processing completed", "success");
    }
    catch (error) {
        console_1.logger.error("AI_INVESTMENT_PROCESS", `AI investments processing failed: ${error.message}`, error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed");
        (0, broadcast_1.broadcastLog)(cronName, `AI investments processing failed: ${error.message}`, "error");
        throw error;
    }
}
async function getActiveInvestments() {
    try {
        return await db_1.models.aiInvestment.findAll({
            where: { status: "ACTIVE" },
            include: [
                {
                    model: db_1.models.aiInvestmentPlan,
                    as: "plan",
                    attributes: [
                        "id",
                        "name",
                        "title",
                        "description",
                        "profitPercentage",
                        "defaultProfit",
                        "defaultResult",
                    ],
                },
                {
                    model: db_1.models.aiInvestmentDuration,
                    as: "duration",
                    attributes: ["id", "duration", "timeframe"],
                },
            ],
            order: [
                ["status", "ASC"],
                ["createdAt", "ASC"],
            ],
        });
    }
    catch (error) {
        console_1.logger.error("AI_INVESTMENT_PROCESS", "Failed to get active investments", error);
        throw error;
    }
}
async function processAiInvestment(investment) {
    var _a, _b;
    const cronName = "processAiInvestments";
    try {
        if (investment.status === "COMPLETED") {
            (0, broadcast_1.broadcastLog)(cronName, `Investment ${investment.id} is already COMPLETED; skipping`, "info");
            return null;
        }
        (0, broadcast_1.broadcastLog)(cronName, `Fetching user for AI investment ${investment.id}`);
        const user = await db_1.models.user.findByPk(investment.userId);
        if (!user) {
            (0, broadcast_1.broadcastLog)(cronName, `User not found for AI investment ${investment.id}`, "error");
            return null;
        }
        const amount = investment.amount;
        if (amount == null || amount <= 0) {
            console_1.logger.error("AI_INVESTMENT_PROCESS", `AI investment ${investment.id} has invalid amount: ${amount}`);
            return null;
        }
        const defaultProfitPercentage = (_a = investment.plan.defaultProfit) !== null && _a !== void 0 ? _a : 0;
        const roi = (_b = investment.profit) !== null && _b !== void 0 ? _b : (amount * defaultProfitPercentage / 100);
        (0, broadcast_1.broadcastLog)(cronName, `Calculated ROI: ${roi} for AI investment ${investment.id}`);
        const investmentResult = investment.result || investment.plan.defaultResult;
        (0, broadcast_1.broadcastLog)(cronName, `Determined result (${investmentResult}) for AI investment ${investment.id}`);
        if (!investment.duration) {
            (0, broadcast_1.broadcastLog)(cronName, `AI investment ${investment.id} has no duration data; skipping`, "warning");
            return null;
        }
        const endDate = calculateEndDate(investment);
        if ((0, date_fns_1.isPast)(endDate)) {
            (0, broadcast_1.broadcastLog)(cronName, `AI investment ${investment.id} is eligible for processing (end date passed)`);
            const updatedInvestment = await handleAiInvestmentUpdate(investment, user, roi, investmentResult);
            if (updatedInvestment) {
                await postProcessAiInvestment(user, investment, updatedInvestment);
            }
            return updatedInvestment;
        }
        else {
            (0, broadcast_1.broadcastLog)(cronName, `AI investment ${investment.id} is not ready (end date not reached)`, "info");
            return null;
        }
    }
    catch (error) {
        console_1.logger.error("AI_INVESTMENT_PROCESS", `General error processing AI investment ${investment.id}: ${error.message}`, error);
        (0, broadcast_1.broadcastLog)(cronName, `General error processing AI investment ${investment.id}: ${error.message}`, "error");
        throw error;
    }
}
function calculateEndDate(investment) {
    const createdAt = new Date(investment.createdAt);
    switch (investment.duration.timeframe) {
        case "HOUR":
            return (0, date_fns_1.addHours)(createdAt, investment.duration.duration);
        case "DAY":
            return (0, date_fns_1.addDays)(createdAt, investment.duration.duration);
        case "WEEK":
            return (0, date_fns_1.addDays)(createdAt, investment.duration.duration * 7);
        case "MONTH":
            return (0, date_fns_1.addDays)(createdAt, investment.duration.duration * 30);
        default:
            return (0, date_fns_1.addHours)(createdAt, investment.duration.duration);
    }
}
async function handleAiInvestmentUpdate(investment, user, roi, investmentResult) {
    const cronName = "processAiInvestments";
    let updatedInvestment;
    const t = await db_1.sequelize.transaction();
    try {
        (0, broadcast_1.broadcastLog)(cronName, `Starting update for AI investment ${investment.id}`);
        const lockedInvestment = await db_1.models.aiInvestment.findByPk(investment.id, {
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!lockedInvestment || lockedInvestment.status !== "ACTIVE") {
            (0, broadcast_1.broadcastLog)(cronName, `AI investment ${investment.id} is no longer ACTIVE (status: ${lockedInvestment === null || lockedInvestment === void 0 ? void 0 : lockedInvestment.status}); skipping`, "info");
            await t.commit();
            return null;
        }
        const transactionRecord = await db_1.models.transaction.findOne({
            where: { referenceId: investment.id, type: "AI_INVESTMENT" },
            transaction: t,
        });
        if (!transactionRecord) {
            (0, broadcast_1.broadcastLog)(cronName, `Transaction not found for AI investment ${investment.id}, marking as REJECTED`, "error");
            await db_1.models.aiInvestment.update({ status: "REJECTED" }, { where: { id: investment.id }, transaction: t });
            await t.commit();
            return null;
        }
        const wallet = await db_1.models.wallet.findByPk(transactionRecord.walletId, {
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!wallet) {
            (0, broadcast_1.broadcastLog)(cronName, `Wallet not found for user ${user.id} (AI investment ${investment.id}), marking as REJECTED`, "error");
            await db_1.models.aiInvestment.update({ status: "REJECTED" }, { where: { id: investment.id }, transaction: t });
            await t.commit();
            return null;
        }
        const amount = investment.amount;
        if (amount == null || amount <= 0) {
            console_1.logger.error("AI_INVESTMENT_UPDATE", `AI investment ${investment.id} has invalid amount: ${amount}`);
            await db_1.models.aiInvestment.update({ status: "REJECTED" }, { where: { id: investment.id }, transaction: t });
            await t.commit();
            return null;
        }
        let payoutAmount = 0;
        if (investmentResult === "WIN") {
            payoutAmount = amount + roi;
        }
        else if (investmentResult === "LOSS") {
            payoutAmount = amount - roi;
            if (payoutAmount < 0)
                payoutAmount = 0;
        }
        else {
            payoutAmount = amount;
        }
        (0, broadcast_1.broadcastLog)(cronName, `Calculated payout: ${payoutAmount} for AI investment ${investment.id}`);
        if (payoutAmount > 0) {
            const idempotencyKey = `ai_invest_cron_payout_${investment.id}_${investmentResult}`;
            await wallet_1.walletService.credit({
                idempotencyKey,
                userId: wallet.userId,
                walletId: wallet.id,
                walletType: wallet.type,
                currency: wallet.currency,
                amount: payoutAmount,
                operationType: "AI_INVESTMENT_ROI",
                referenceId: `${investment.id}_roi`,
                description: `AI Investment ${investmentResult}: Plan "${investment.plan.title}" | Duration: ${investment.duration.duration} ${investment.duration.timeframe}`,
                metadata: {
                    investmentId: investment.id,
                    planId: investment.planId,
                    result: investmentResult,
                    roi,
                    originalAmount: amount,
                },
                transaction: t,
            });
            (0, broadcast_1.broadcastLog)(cronName, `Wallet credited ${payoutAmount} for AI investment ${investment.id}`);
        }
        else {
            (0, broadcast_1.broadcastLog)(cronName, `No payout for AI investment ${investment.id} (total loss)`);
        }
        await db_1.models.aiInvestment.update({
            status: "COMPLETED",
            result: investmentResult,
            profit: roi,
        }, { where: { id: investment.id }, transaction: t });
        (0, broadcast_1.broadcastLog)(cronName, `AI investment ${investment.id} updated to COMPLETED (${investmentResult})`);
        updatedInvestment = await db_1.models.aiInvestment.findByPk(investment.id, {
            include: [
                { model: db_1.models.aiInvestmentPlan, as: "plan" },
                { model: db_1.models.aiInvestmentDuration, as: "duration" },
            ],
            transaction: t,
        });
        await t.commit();
        (0, broadcast_1.broadcastLog)(cronName, `Transaction committed for AI investment ${investment.id}`, "success");
    }
    catch (error) {
        await t.rollback();
        (0, broadcast_1.broadcastLog)(cronName, `Error updating AI investment ${investment.id}: ${error.message}`, "error");
        console_1.logger.error("AI_INVESTMENT_UPDATE", `Error updating AI investment: ${error.message}`, error);
        return null;
    }
    return updatedInvestment;
}
async function postProcessAiInvestment(user, investment, updatedInvestment) {
    const cronName = "processAiInvestments";
    try {
        (0, broadcast_1.broadcastLog)(cronName, `Sending AI investment email for investment ${investment.id}`);
        await (0, emails_1.sendAiInvestmentEmail)(user, investment.plan, investment.duration, updatedInvestment, "AiInvestmentCompleted");
        (0, broadcast_1.broadcastLog)(cronName, `AI investment email sent for investment ${investment.id}`, "success");
        (0, broadcast_1.broadcastLog)(cronName, `Creating notification for AI investment ${investment.id}`);
        await (0, notifications_1.createNotification)({
            userId: user.id,
            relatedId: updatedInvestment.id,
            title: "AI Investment Completed",
            message: `Your AI investment of ${investment.amount} ${investment.symbol} has been completed with a status of ${updatedInvestment.result}`,
            type: "system",
            link: `/ai/investment/${updatedInvestment.id}`,
            actions: [
                {
                    label: "View Investment",
                    link: `/ai/investment/${updatedInvestment.id}`,
                    primary: true,
                },
            ],
        });
        (0, broadcast_1.broadcastLog)(cronName, `Notification created for AI investment ${investment.id}`, "success");
    }
    catch (error) {
        (0, broadcast_1.broadcastLog)(cronName, `Error in postProcessAiInvestment for ${investment.id}: ${error.message}`, "error");
        console_1.logger.error("AI_INVESTMENT_POST_PROCESS", `Error in postProcessAiInvestment: ${error.message}`, error);
    }
}
