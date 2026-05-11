"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processGeneralInvestments = processGeneralInvestments;
exports.getActiveGeneralInvestments = getActiveGeneralInvestments;
exports.processGeneralInvestment = processGeneralInvestment;
const db_1 = require("@b/db");
const date_fns_1 = require("date-fns");
const console_1 = require("@b/utils/console");
const emails_1 = require("@b/utils/emails");
const notifications_1 = require("@b/utils/notifications");
const affiliate_1 = require("@b/utils/affiliate");
const broadcast_1 = require("@b/cron/broadcast");
const wallet_1 = require("@b/services/wallet");
const error_1 = require("@b/utils/error");
async function processGeneralInvestments() {
    const cronName = "processGeneralInvestments";
    const startTime = Date.now();
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting general investments processing");
        const activeInvestments = await getActiveGeneralInvestments();
        const total = activeInvestments.length;
        (0, broadcast_1.broadcastLog)(cronName, `Found ${total} active general investments`);
        for (let i = 0; i < total; i++) {
            const investment = activeInvestments[i];
            (0, broadcast_1.broadcastLog)(cronName, `Processing general investment id ${investment.id}`);
            try {
                await processGeneralInvestment(investment);
                (0, broadcast_1.broadcastLog)(cronName, `Processed investment id ${investment.id}`, "success");
            }
            catch (error) {
                console_1.logger.error("CRON", `Error processing investment ${investment.id}`, error);
                (0, broadcast_1.broadcastLog)(cronName, `Error processing investment id ${investment.id}: ${error.message}`, "error");
                continue;
            }
            const progress = Math.round(((i + 1) / total) * 100);
            (0, broadcast_1.broadcastProgress)(cronName, progress);
        }
        (0, broadcast_1.broadcastStatus)(cronName, "completed", {
            duration: Date.now() - startTime,
        });
        (0, broadcast_1.broadcastLog)(cronName, "General investments processing completed", "success");
    }
    catch (error) {
        console_1.logger.error("CRON", "processGeneralInvestments failed", error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed");
        (0, broadcast_1.broadcastLog)(cronName, `General investments processing failed: ${error.message}`, "error");
        throw error;
    }
}
async function getActiveGeneralInvestments() {
    try {
        return await db_1.models.investment.findAll({
            where: {
                status: "ACTIVE",
            },
            include: [
                {
                    model: db_1.models.investmentPlan,
                    as: "plan",
                    attributes: [
                        "id",
                        "name",
                        "title",
                        "description",
                        "defaultProfit",
                        "defaultResult",
                        "currency",
                        "walletType",
                    ],
                },
                {
                    model: db_1.models.investmentDuration,
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
        console_1.logger.error("CRON", "getActiveGeneralInvestments failed", error);
        throw error;
    }
}
async function processGeneralInvestment(investment) {
    const cronName = "processGeneralInvestments";
    const { id, duration, createdAt, amount, profit, result, plan, userId } = investment;
    if (investment.status === "COMPLETED") {
        (0, broadcast_1.broadcastLog)(cronName, `Investment ${id} is already COMPLETED; skipping`, "info");
        return null;
    }
    if (!plan) {
        (0, broadcast_1.broadcastLog)(cronName, `Investment ${id} has no associated plan (plan may have been deleted); skipping`, "error");
        console_1.logger.error("CRON", `Investment ${id} has no associated plan`, new Error(`Investment ${id} has no associated plan`));
        return null;
    }
    if (!duration) {
        (0, broadcast_1.broadcastLog)(cronName, `Investment ${id} has no associated duration (duration may have been deleted); skipping`, "error");
        console_1.logger.error("CRON", `Investment ${id} has no associated duration`, new Error(`Investment ${id} has no associated duration`));
        return null;
    }
    (0, broadcast_1.broadcastLog)(cronName, `Fetching user for investment ${id}`);
    const user = await db_1.models.user.findByPk(userId);
    if (!user) {
        (0, broadcast_1.broadcastLog)(cronName, `User not found for investment ${id}`, "error");
        console_1.logger.error("CRON", `User not found for investment ${id}`, new Error("User not found"));
        return null;
    }
    const roi = profit || plan.defaultProfit;
    (0, broadcast_1.broadcastLog)(cronName, `Calculated ROI (${roi}) for investment ${id}`);
    const investmentResult = result || plan.defaultResult;
    (0, broadcast_1.broadcastLog)(cronName, `Determined result (${investmentResult}) for investment ${id}`);
    let endDate;
    switch (duration.timeframe) {
        case "HOUR":
            endDate = (0, date_fns_1.addHours)(new Date(createdAt), duration.duration);
            break;
        case "DAY":
            endDate = (0, date_fns_1.addDays)(new Date(createdAt), duration.duration);
            break;
        case "WEEK":
            endDate = (0, date_fns_1.addDays)(new Date(createdAt), duration.duration * 7);
            break;
        case "MONTH":
            endDate = (0, date_fns_1.addDays)(new Date(createdAt), duration.duration * 30);
            break;
        default:
            endDate = (0, date_fns_1.addHours)(new Date(createdAt), duration.duration);
            break;
    }
    (0, broadcast_1.broadcastLog)(cronName, `Calculated end date (${endDate.toISOString()}) for investment ${id}`);
    if (!(0, date_fns_1.isPast)(endDate)) {
        (0, broadcast_1.broadcastLog)(cronName, `Investment ${id} is not ready for processing (end date not reached)`, "info");
        return null;
    }
    (0, broadcast_1.broadcastLog)(cronName, `Investment ${id} is eligible for processing (end date passed)`);
    let updatedInvestment;
    try {
        (0, broadcast_1.broadcastLog)(cronName, `Starting update for investment ${id}`);
        updatedInvestment = await db_1.sequelize.transaction(async (transaction) => {
            (0, broadcast_1.broadcastLog)(cronName, `Fetching wallet for investment ${id}`);
            const wallet = await db_1.models.wallet.findOne({
                where: {
                    userId: userId,
                    currency: plan.currency,
                    type: plan.walletType,
                },
                transaction,
            });
            if (!wallet) {
                (0, broadcast_1.broadcastLog)(cronName, `Wallet not found for user ${userId} in investment ${id}`, "error");
                throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
            }
            (0, broadcast_1.broadcastLog)(cronName, `Wallet found with balance ${wallet.balance} for investment ${id}`);
            const payoutAmount = investmentResult === "WIN" ? roi : 0;
            if (payoutAmount > 0) {
                const idempotencyKey = `investment_roi_${id}`;
                await wallet_1.walletService.credit({
                    idempotencyKey,
                    userId: userId,
                    walletId: wallet.id,
                    walletType: plan.walletType,
                    currency: plan.currency,
                    amount: payoutAmount,
                    operationType: "AI_INVESTMENT_ROI",
                    referenceId: id,
                    description: `Investment ROI: ${plan.name} - ${investmentResult}`,
                    metadata: {
                        investmentId: id,
                        planId: plan.id,
                        result: investmentResult,
                        roi,
                    },
                    transaction,
                });
                const newBalance = wallet.balance + payoutAmount;
                (0, broadcast_1.broadcastLog)(cronName, `Wallet updated for investment ${id}. New balance: ${newBalance}`);
            }
            else {
                (0, broadcast_1.broadcastLog)(cronName, `Investment ${id} result: ${investmentResult}, no payout`);
            }
            await db_1.models.investment.update({
                status: "COMPLETED",
                result: investmentResult,
                profit: roi,
            }, { where: { id }, transaction });
            (0, broadcast_1.broadcastLog)(cronName, `Investment ${id} updated to COMPLETED with result ${investmentResult}`);
            const foundInvestment = await db_1.models.investment.findByPk(id, {
                include: [
                    { model: db_1.models.investmentPlan, as: "plan" },
                    { model: db_1.models.investmentDuration, as: "duration" },
                ],
                transaction,
            });
            return foundInvestment;
        });
        (0, broadcast_1.broadcastLog)(cronName, `Transaction committed for investment ${id}`, "success");
    }
    catch (error) {
        console_1.logger.error("CRON", "processGeneralInvestment failed", error);
        (0, broadcast_1.broadcastLog)(cronName, `Error updating investment ${id}: ${error.message}`, "error");
        return null;
    }
    if (updatedInvestment) {
        try {
            (0, broadcast_1.broadcastLog)(cronName, `Sending investment email for investment ${id}`);
            await (0, emails_1.sendInvestmentEmail)(user, plan, duration, updatedInvestment, "InvestmentCompleted");
            (0, broadcast_1.broadcastLog)(cronName, `Investment email sent for investment ${id}`, "success");
            (0, broadcast_1.broadcastLog)(cronName, `Creating notification for investment ${id}`);
            await (0, notifications_1.createNotification)({
                userId: user.id,
                relatedId: updatedInvestment.id,
                title: "General Investment Completed",
                message: `Your general investment of ${amount} ${plan.currency} has been completed with a status of ${investmentResult}.`,
                type: "system",
                link: `/investments/${updatedInvestment.id}`,
                actions: [
                    {
                        label: "View Investment",
                        link: `/investments/${updatedInvestment.id}`,
                        primary: true,
                    },
                ],
            });
            (0, broadcast_1.broadcastLog)(cronName, `Notification created for investment ${id}`, "success");
        }
        catch (error) {
            console_1.logger.error("CRON", "Failed to send email/notification", error);
            (0, broadcast_1.broadcastLog)(cronName, `Error sending email/notification for investment ${id}: ${error.message}`, "error");
        }
        try {
            (0, broadcast_1.broadcastLog)(cronName, `Processing rewards for investment ${id}`);
            await (0, affiliate_1.processRewards)(user.id, amount, "GENERAL_INVESTMENT", plan.currency, `GENERAL_INVESTMENT:investment:${id}`);
            (0, broadcast_1.broadcastLog)(cronName, `Rewards processed for investment ${id}`, "success");
        }
        catch (error) {
            console_1.logger.error("CRON", "Failed to process rewards", error);
            (0, broadcast_1.broadcastLog)(cronName, `Error processing rewards for investment ${id}: ${error.message}`, "error");
        }
    }
    return updatedInvestment;
}
