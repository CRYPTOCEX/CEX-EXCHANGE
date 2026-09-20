"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processAiInvestments = processAiInvestments;
exports.getActiveInvestments = getActiveInvestments;
exports.processAiInvestment = processAiInvestment;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const date_fns_1 = require("date-fns");
const emails_1 = require("@b/utils/emails");
const notifications_1 = require("@b/utils/notifications");
const broadcast_1 = require("@b/cron/broadcast");
const fees_1 = require("@b/utils/fees");
const wallet_1 = require("@b/services/wallet");
const investment_funding_1 = require("@b/utils/investment-funding");
const settlement_1 = require("./settlement");
const transaction_1 = require("@b/utils/transaction");
async function processAiInvestments() {
    const cronName = "processAiInvestments";
    const startTime = Date.now();
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting AI investments processing");
        const activeInvestments = await getActiveInvestments();
        const total = activeInvestments.length;
        (0, broadcast_1.broadcastLog)(cronName, `Found ${total} active AI investments`);
        const unsettleable = [];
        for (let i = 0; i < total; i++) {
            const investment = activeInvestments[i];
            (0, broadcast_1.broadcastLog)(cronName, `Processing AI investment id ${investment.id} (current status: ${investment.status})`);
            try {
                const updated = await processAiInvestment(investment, unsettleable);
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
        if (unsettleable.length > 0) {
            console_1.logger.warn("AI_INVESTMENT_PROCESS", `${unsettleable.length} AI investment(s) matured but have no funding transaction, so no ` +
                `principal can be returned; left ACTIVE for manual review. Rows created directly in ` +
                `the admin AI investment table are the usual source. ` +
                `First ids: ${unsettleable.slice(0, 10).join(", ")}` +
                (unsettleable.length > 10 ? ` (+${unsettleable.length - 10} more)` : ""));
            (0, broadcast_1.broadcastLog)(cronName, `${unsettleable.length} AI investment(s) could not be settled: never funded`, "warning");
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
async function processAiInvestment(investment, unsettleable = []) {
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
        const { roi, roiPercentage, result: investmentResult, orphaned } = (0, settlement_1.deriveSettlementTerms)(investment);
        if (orphaned) {
            console_1.logger.warn("AI_INVESTMENT_PROCESS", `AI investment ${investment.id} has no plan (deleted) and no recorded ROI; ` +
                `settling as ${investmentResult} and returning the ${amount} principal`);
        }
        (0, broadcast_1.broadcastLog)(cronName, `Calculated ROI: ${roi} for AI investment ${investment.id}`);
        (0, broadcast_1.broadcastLog)(cronName, `Determined result (${investmentResult}) for AI investment ${investment.id}`);
        if (!investment.duration) {
            (0, broadcast_1.broadcastLog)(cronName, `AI investment ${investment.id} has no duration data; skipping`, "warning");
            return null;
        }
        const endDate = calculateEndDate(investment);
        if ((0, date_fns_1.isPast)(endDate)) {
            (0, broadcast_1.broadcastLog)(cronName, `AI investment ${investment.id} is eligible for processing (end date passed)`);
            const updatedInvestment = await handleAiInvestmentUpdate(investment, user, roi, roiPercentage, investmentResult, unsettleable);
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
async function handleAiInvestmentUpdate(investment, user, roi, roiPercentage, investmentResult, unsettleable = []) {
    var _a, _b, _c;
    var _d, _e;
    const cronName = "processAiInvestments";
    let updatedInvestment;
    let duplicatePayout = false;
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
        const funded = await (0, investment_funding_1.resolveFundingWallet)({
            referenceId: investment.id,
            fundingType: "AI_INVESTMENT",
            expectedUserId: investment.userId,
            fallback: {
                currency: typeof investment.symbol === "string"
                    ? investment.symbol.split("/")[1]
                    : null,
                walletType: investment.type,
            },
            transaction: t,
        });
        if (!funded.ok) {
            (0, broadcast_1.broadcastLog)(cronName, `AI investment ${investment.id} cannot be settled (${funded.refusal}); leaving ACTIVE for manual review`, "warning");
            if ((0, investment_funding_1.shouldAlertUnsettleable)(investment.id)) {
                console_1.logger.error("AI_INVESTMENT_UPDATE", `ALERT: AI investment ${investment.id} (user ${investment.userId}, symbol ${investment.symbol}, ` +
                    `type ${investment.type}) cannot be settled: ${(0, investment_funding_1.fundingRefusalMessage)(funded.refusal)} ` +
                    `Investment left ACTIVE for manual review.`);
            }
            await t.rollback();
            unsettleable.push(investment.id);
            return null;
        }
        const wallet = funded.value.wallet;
        if (funded.value.recreated) {
            console_1.logger.warn("AI_INVESTMENT_UPDATE", `AI investment ${investment.id}: the wallet its principal was debited from no longer ` +
                `existed; a ${wallet.currency} ${wallet.type} wallet was restored to receive the payout`);
        }
        const amount = investment.amount;
        if (amount == null || amount <= 0) {
            console_1.logger.error("AI_INVESTMENT_UPDATE", `AI investment ${investment.id} has invalid amount: ${amount}`);
            await db_1.models.aiInvestment.update({ status: "REJECTED" }, { where: { id: investment.id }, transaction: t });
            await t.commit();
            return null;
        }
        const payoutAmount = (0, settlement_1.computePayout)(amount, roi, investmentResult);
        (0, broadcast_1.broadcastLog)(cronName, `Calculated payout: ${payoutAmount} for AI investment ${investment.id}`);
        if (payoutAmount > 0) {
            const idempotencyKey = `ai_invest_cron_payout_${investment.id}_${investmentResult}`;
            try {
                await wallet_1.walletService.credit({
                    idempotencyKey,
                    userId: wallet.userId,
                    walletId: wallet.id,
                    walletType: wallet.type,
                    currency: wallet.currency,
                    amount: payoutAmount,
                    operationType: "AI_INVESTMENT_ROI",
                    referenceId: `${investment.id}_roi`,
                    description: `AI Investment ${investmentResult}: Plan "${(_d = (_a = investment.plan) === null || _a === void 0 ? void 0 : _a.title) !== null && _d !== void 0 ? _d : "(deleted plan)"}" | Duration: ${investment.duration.duration} ${investment.duration.timeframe}`,
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
            catch (creditError) {
                const duplicateReference = creditError instanceof sequelize_1.UniqueConstraintError &&
                    ((_b = creditError.fields) === null || _b === void 0 ? void 0 : _b.referenceId) !== undefined;
                if (creditError instanceof wallet_1.DuplicateOperationError || duplicateReference) {
                    (0, broadcast_1.broadcastLog)(cronName, `Payout for AI investment ${investment.id} already recorded; restoring COMPLETED without re-crediting`, "warning");
                    console_1.logger.warn("AI_INVESTMENT_UPDATE", `Duplicate cron payout detected for AI investment ${investment.id} (${investmentResult}); marking COMPLETED without re-crediting`);
                    duplicatePayout = true;
                }
                else {
                    throw creditError;
                }
            }
        }
        else {
            (0, broadcast_1.broadcastLog)(cronName, `No payout for AI investment ${investment.id} (total loss)`);
        }
        await (0, fees_1.recordInvestmentOutcome)({
            result: investmentResult,
            roi,
            currency: wallet.currency,
            walletType: wallet.type,
            type: "AI_INVESTMENT",
            referenceId: investment.id,
            description: `AI investment ${investmentResult}: ${(_e = (_c = investment.plan) === null || _c === void 0 ? void 0 : _c.title) !== null && _e !== void 0 ? _e : "(deleted plan)"}`,
            userId: investment.userId,
            metadata: {
                investmentId: investment.id,
                planId: investment.planId,
                result: investmentResult,
            },
            transaction: t,
        });
        await db_1.models.aiInvestment.update({
            status: "COMPLETED",
            result: investmentResult,
            roiPercentage,
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
        await (0, transaction_1.rollbackIfActive)(t);
        (0, broadcast_1.broadcastLog)(cronName, `Error updating AI investment ${investment.id}: ${error.message}`, "error");
        console_1.logger.error("AI_INVESTMENT_UPDATE", `Error updating AI investment: ${error.message}`, error);
        return null;
    }
    return duplicatePayout ? null : updatedInvestment;
}
async function postProcessAiInvestment(user, investment, updatedInvestment) {
    const cronName = "processAiInvestments";
    try {
        (0, broadcast_1.broadcastLog)(cronName, `Sending AI investment email for investment ${investment.id}`);
        await (0, emails_1.sendAiInvestmentEmail)(user, investment.plan, investment.duration, updatedInvestment, "AiInvestmentCompleted");
        (0, broadcast_1.broadcastLog)(cronName, `AI investment email sent for investment ${investment.id}`, "success");
    }
    catch (error) {
        (0, broadcast_1.broadcastLog)(cronName, `Could not send the completion email for ${investment.id}: ${error.message}. ` +
            `The notification below is still sent.`, "error");
        console_1.logger.error("AI_INVESTMENT_POST_PROCESS", `Completion email failed for ${investment.id}: ${error.message}`, error);
    }
    try {
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
        (0, broadcast_1.broadcastLog)(cronName, `Could not notify the user of ${investment.id}: ${error.message}`, "error");
        console_1.logger.error("AI_INVESTMENT_POST_PROCESS", `Completion notification failed for ${investment.id}: ${error.message}`, error);
    }
}
