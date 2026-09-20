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
const fees_1 = require("@b/utils/fees");
const investment_funding_1 = require("@b/utils/investment-funding");
const settlement_guard_1 = require("./settlement-guard");
async function processGeneralInvestments() {
    const cronName = "processGeneralInvestments";
    const startTime = Date.now();
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting general investments processing");
        const activeInvestments = await getActiveGeneralInvestments();
        const total = activeInvestments.length;
        (0, broadcast_1.broadcastLog)(cronName, `Found ${total} active general investments`);
        const unsettleable = [];
        for (let i = 0; i < total; i++) {
            const investment = activeInvestments[i];
            (0, broadcast_1.broadcastLog)(cronName, `Processing general investment id ${investment.id}`);
            try {
                await processGeneralInvestment(investment, unsettleable);
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
        if (unsettleable.length > 0) {
            console_1.logger.warn("CRON", `${unsettleable.length} general investment(s) matured but have no funding transaction, ` +
                `so no principal can be returned; left ACTIVE for manual review. ` +
                `Rows created directly in the admin investment table are the usual source. ` +
                `First ids: ${unsettleable.slice(0, 10).join(", ")}` +
                (unsettleable.length > 10 ? ` (+${unsettleable.length - 10} more)` : ""));
            (0, broadcast_1.broadcastLog)(cronName, `${unsettleable.length} investment(s) could not be settled: never funded`, "warning");
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
                        "profitPercentage",
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
async function processGeneralInvestment(investment, unsettleable = []) {
    var _a, _b;
    const cronName = "processGeneralInvestments";
    const { id, duration, createdAt, amount, result, plan, userId } = investment;
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
    let roi;
    let roiPercentage;
    if (investment.roiPercentage != null) {
        roiPercentage = investment.roiPercentage;
        roi = (amount * roiPercentage) / 100;
    }
    else if (investment.profit != null) {
        roi = investment.profit;
        roiPercentage = amount > 0 ? (roi / amount) * 100 : 0;
    }
    else {
        roiPercentage = (_b = (_a = plan.profitPercentage) !== null && _a !== void 0 ? _a : plan.defaultProfit) !== null && _b !== void 0 ? _b : 0;
        roi = (amount * roiPercentage) / 100;
    }
    (0, broadcast_1.broadcastLog)(cronName, `Calculated ROI (${roi}) for investment ${id}`);
    const investmentResult = result || plan.defaultResult;
    (0, broadcast_1.broadcastLog)(cronName, `Determined result (${investmentResult}) for investment ${id}`);
    let endDate;
    if (investment.endDate) {
        endDate = new Date(investment.endDate);
    }
    else {
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
            const claimed = await db_1.models.investment.findByPk(id, {
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            const refusal = (0, settlement_guard_1.investmentClaimRefusal)(claimed);
            if (refusal) {
                (0, broadcast_1.broadcastLog)(cronName, `Investment ${id} is no longer settleable (${refusal}); skipping`, "info");
                return null;
            }
            (0, broadcast_1.broadcastLog)(cronName, `Resolving funding wallet for investment ${id}`);
            const funded = await (0, investment_funding_1.resolveFundingWallet)({
                referenceId: id,
                fundingType: "INVESTMENT",
                expectedUserId: userId,
                fallback: { currency: plan.currency, walletType: plan.walletType },
                transaction,
            });
            if (!funded.ok) {
                if ((0, investment_funding_1.shouldAlertUnsettleable)(id)) {
                    console_1.logger.error("CRON", `Investment ${id} (user ${userId}, plan ${plan.id}) cannot be settled: ` +
                        `${(0, investment_funding_1.fundingRefusalMessage)(funded.refusal)} Left ACTIVE for manual review.`);
                }
                (0, broadcast_1.broadcastLog)(cronName, `Investment ${id} cannot be settled (${funded.refusal}); left ACTIVE for manual review`, "warning");
                unsettleable.push(id);
                return null;
            }
            const wallet = funded.value.wallet;
            if (funded.value.recreated) {
                console_1.logger.warn("CRON", `Investment ${id}: the wallet its principal was debited from no longer existed; ` +
                    `a ${wallet.currency} ${wallet.type} wallet was restored to receive the payout`);
            }
            (0, broadcast_1.broadcastLog)(cronName, `Wallet found with balance ${wallet.balance} for investment ${id}`);
            let payoutAmount = 0;
            if (investmentResult === "WIN") {
                payoutAmount = amount + roi;
            }
            else if (investmentResult === "LOSS") {
                payoutAmount = Math.max(0, amount - roi);
            }
            else {
                payoutAmount = amount;
            }
            if (payoutAmount > 0) {
                const idempotencyKey = `investment_roi_${id}_${investmentResult}`;
                await wallet_1.walletService.credit({
                    idempotencyKey,
                    userId: userId,
                    walletId: wallet.id,
                    walletType: wallet.type,
                    currency: wallet.currency,
                    amount: payoutAmount,
                    operationType: "INVESTMENT_ROI",
                    referenceId: `${id}_roi`,
                    description: `Investment ROI: ${plan.name} - ${investmentResult}`,
                    metadata: {
                        investmentId: id,
                        planId: plan.id,
                        result: investmentResult,
                        roi,
                    },
                    transaction,
                });
                await (0, fees_1.recordInvestmentOutcome)({
                    result: investmentResult,
                    roi,
                    currency: wallet.currency,
                    walletType: wallet.type,
                    type: "INVESTMENT",
                    referenceId: id,
                    description: `General investment ${investmentResult}: ${plan.name}`,
                    userId,
                    metadata: { investmentId: id, planId: plan.id, result: investmentResult },
                    transaction,
                });
                const newBalance = Number(wallet.balance) + payoutAmount;
                (0, broadcast_1.broadcastLog)(cronName, `Wallet updated for investment ${id}. New balance: ${newBalance}`);
            }
            else {
                (0, broadcast_1.broadcastLog)(cronName, `Investment ${id} result: ${investmentResult}, no payout`);
            }
            await db_1.models.investment.update({
                status: "COMPLETED",
                result: investmentResult,
                roiPercentage,
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
        console_1.logger.error("CRON", `processGeneralInvestment failed for investment ${id} (user ${userId}, plan ${plan.id}): ${error.message}`, error);
        (0, broadcast_1.broadcastLog)(cronName, `Error updating investment ${id}: ${error.message}`, "error");
        throw error;
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
                link: `/investment/${updatedInvestment.id}`,
                actions: [
                    {
                        label: "View Investment",
                        link: `/investment/${updatedInvestment.id}`,
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
