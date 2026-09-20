"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processForexInvestments = processForexInvestments;
exports.getActiveForexInvestments = getActiveForexInvestments;
exports.processForexInvestment = processForexInvestment;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const date_fns_1 = require("date-fns");
const emails_1 = require("@b/utils/emails");
const notifications_1 = require("@b/utils/notifications");
const affiliate_1 = require("@b/utils/affiliate");
const broadcast_1 = require("@b/cron/broadcast");
const wallet_1 = require("@b/services/wallet");
const utils_1 = require("@b/api/(ext)/admin/forex/utils");
const fees_1 = require("@b/utils/fees");
const transaction_1 = require("@b/utils/transaction");
async function processForexInvestments() {
    const cronName = "processForexInvestments";
    const startTime = Date.now();
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting Forex investments processing");
        const activeInvestments = await getActiveForexInvestments();
        const total = activeInvestments.length;
        (0, broadcast_1.broadcastLog)(cronName, `Found ${total} active forex investments`);
        for (let i = 0; i < total; i++) {
            const investment = activeInvestments[i];
            (0, broadcast_1.broadcastLog)(cronName, `Processing forex investment id ${investment.id} (current status: ${investment.status})`);
            try {
                const updated = await processForexInvestment(investment);
                if (updated) {
                    (0, broadcast_1.broadcastLog)(cronName, `Successfully processed forex investment id ${investment.id}`, "success");
                }
                else {
                    (0, broadcast_1.broadcastLog)(cronName, `No update for forex investment id ${investment.id}`, "warning");
                }
            }
            catch (error) {
                console_1.logger.error("FOREX_INVESTMENT_PROCESS", `Error processing investment ${investment.id}: ${error.message}`, error);
                (0, broadcast_1.broadcastLog)(cronName, `Error processing forex investment id ${investment.id}: ${error.message}`, "error");
                continue;
            }
            const progress = Math.round(((i + 1) / total) * 100);
            (0, broadcast_1.broadcastProgress)(cronName, progress);
        }
        (0, broadcast_1.broadcastStatus)(cronName, "completed", {
            duration: Date.now() - startTime,
        });
        (0, broadcast_1.broadcastLog)(cronName, "Forex investments processing completed", "success");
    }
    catch (error) {
        console_1.logger.error("FOREX_INVESTMENT_PROCESS", `Forex investments processing failed: ${error.message}`, error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed");
        (0, broadcast_1.broadcastLog)(cronName, `Forex investments processing failed: ${error.message}`, "error");
        throw error;
    }
}
async function getActiveForexInvestments(ctx) {
    var _a, _b, _c;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Fetching active forex investments from database");
        const investments = await db_1.models.forexInvestment.findAll({
            where: {
                status: "ACTIVE",
            },
            include: [
                {
                    model: db_1.models.forexPlan,
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
                    model: db_1.models.forexDuration,
                    as: "duration",
                    attributes: ["id", "duration", "timeframe"],
                },
            ],
            order: [
                ["status", "ASC"],
                ["createdAt", "ASC"],
            ],
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Successfully fetched ${investments.length} active investments`);
        return investments;
    }
    catch (error) {
        console_1.logger.error("FOREX_INVESTMENT_PROCESS", "Failed to get active forex investments", error);
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, "Failed to get active forex investments");
        throw error;
    }
}
async function processForexInvestment(investment, retryCount = 0, ctx) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    const cronName = "processForexInvestments";
    const maxRetries = 3;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Processing forex investment ${investment.id}`);
        if (investment.status === "COMPLETED") {
            (0, broadcast_1.broadcastLog)(cronName, `Investment ${investment.id} is already COMPLETED; skipping`, "info");
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Investment already completed, skipping");
            return null;
        }
        if (!investment.plan) {
            console_1.logger.error("FOREX_INVESTMENT_PROCESS", `Investment ${investment.id} has no associated plan (soft-deleted?); leaving ACTIVE and skipping`);
            (0, broadcast_1.broadcastLog)(cronName, `Investment ${investment.id} has no associated plan; skipped (left ACTIVE for manual review)`, "error");
            (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, "Investment plan not found");
            return null;
        }
        if (!investment.duration) {
            console_1.logger.error("FOREX_INVESTMENT_PROCESS", `Investment ${investment.id} has no associated duration; leaving ACTIVE and skipping`);
            (0, broadcast_1.broadcastLog)(cronName, `Investment ${investment.id} has no associated duration; skipped (left ACTIVE for manual review)`, "error");
            (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, "Investment duration not found");
            return null;
        }
        (0, broadcast_1.broadcastLog)(cronName, `Fetching user for investment ${investment.id}`);
        (_e = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _e === void 0 ? void 0 : _e.call(ctx, "Fetching user data");
        const user = await fetchUser(investment.userId, ctx);
        if (!user) {
            (0, broadcast_1.broadcastLog)(cronName, `User not found for investment ${investment.id}`, "error");
            (_f = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _f === void 0 ? void 0 : _f.call(ctx, "User not found");
            return null;
        }
        const roi = calculateRoi(investment);
        (0, broadcast_1.broadcastLog)(cronName, `Calculated ROI (${roi}) for investment ${investment.id}`);
        (_g = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _g === void 0 ? void 0 : _g.call(ctx, `Calculated ROI: ${roi}`);
        const investmentResult = determineInvestmentResult(investment);
        (0, broadcast_1.broadcastLog)(cronName, `Determined result (${investmentResult}) for investment ${investment.id}`);
        (_h = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _h === void 0 ? void 0 : _h.call(ctx, `Determined result: ${investmentResult}`);
        if (shouldProcessInvestment(investment, roi, investmentResult)) {
            (0, broadcast_1.broadcastLog)(cronName, `Investment ${investment.id} is eligible for processing (end date passed)`);
            (_j = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _j === void 0 ? void 0 : _j.call(ctx, "Investment is eligible for processing");
            const updatedInvestment = await handleInvestmentUpdate(investment, user, roi, investmentResult, ctx);
            if (updatedInvestment) {
                await postProcessInvestment(user, investment, updatedInvestment, ctx);
            }
            (_k = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _k === void 0 ? void 0 : _k.call(ctx, "Forex investment processed successfully");
            return updatedInvestment;
        }
        else {
            (0, broadcast_1.broadcastLog)(cronName, `Investment ${investment.id} is not ready for processing (end date not reached)`, "info");
            (_l = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _l === void 0 ? void 0 : _l.call(ctx, "Investment not ready for processing (end date not reached)");
            return null;
        }
    }
    catch (error) {
        console_1.logger.error("FOREX_INVESTMENT_PROCESS", `Error processing investment ${investment.id}: ${error.message}`, error);
        (0, broadcast_1.broadcastLog)(cronName, `Error processing investment ${investment.id}: ${error.message}`, "error");
        (_m = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _m === void 0 ? void 0 : _m.call(ctx, error.message);
        if (retryCount < maxRetries) {
            (0, broadcast_1.broadcastLog)(cronName, `Retrying investment ${investment.id} (attempt ${retryCount + 1}/${maxRetries})`, "warning");
            (_o = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _o === void 0 ? void 0 : _o.call(ctx, `Retrying (attempt ${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
            return processForexInvestment(investment, retryCount + 1, ctx);
        }
        else {
            try {
                const cancelled = await cancelForexInvestmentWithRefund(investment, error, retryCount);
                if (cancelled) {
                    (0, broadcast_1.broadcastLog)(cronName, `Investment ${investment.id} CANCELLED after ${maxRetries} retries; principal refunded to the user's forex account`, "error");
                    try {
                        await (0, notifications_1.createNotification)({
                            userId: investment.userId,
                            relatedId: investment.id,
                            title: "Forex Investment Cancelled",
                            message: `Your Forex investment ${investment.id} could not be processed after ${maxRetries} attempts and was cancelled. Your principal of ${investment.amount} has been refunded to your forex account.`,
                            type: "system",
                            link: `/forex/investment/${investment.id}`,
                        });
                    }
                    catch (notifyError) {
                        console_1.logger.error("FOREX_INVESTMENT_PROCESS", `Failed to notify user about cancelled/refunded investment ${investment.id}`, notifyError);
                    }
                }
                else {
                    (0, broadcast_1.broadcastLog)(cronName, `Investment ${investment.id} left ACTIVE after ${maxRetries} retries (safe refund not possible or status changed); manual review required`, "error");
                }
            }
            catch (updateError) {
                console_1.logger.error("FOREX_INVESTMENT_PROCESS", `ALERT: failed to cancel-with-refund investment ${investment.id}; investment left ACTIVE for manual review`, updateError);
                (0, broadcast_1.broadcastLog)(cronName, `Failed to cancel-with-refund investment ${investment.id}; left ACTIVE for manual review`, "error");
            }
        }
        throw error;
    }
}
async function cancelForexInvestmentWithRefund(investment, error, retryCount) {
    var _a, _b;
    const t = await db_1.sequelize.transaction();
    let finished = false;
    try {
        const lockedInvestment = await db_1.models.forexInvestment.findByPk(investment.id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!lockedInvestment || lockedInvestment.status !== "ACTIVE") {
            await t.rollback();
            finished = true;
            return false;
        }
        const account = await db_1.models.forexAccount.findOne({
            where: { userId: lockedInvestment.userId, type: "LIVE" },
            lock: t.LOCK.UPDATE,
            transaction: t,
        });
        if (!account) {
            await t.rollback();
            finished = true;
            console_1.logger.error("FOREX_INVESTMENT_PROCESS", `ALERT: cannot refund investment ${lockedInvestment.id} (no LIVE forex account for user ${lockedInvestment.userId}); investment left ACTIVE for manual review`);
            return false;
        }
        await (0, utils_1.updateForexAccountBalance)(account, Number((_a = lockedInvestment.amount) !== null && _a !== void 0 ? _a : 0), true, t);
        const [affected] = await db_1.models.forexInvestment.update({
            status: "CANCELLED",
            metadata: JSON.stringify({
                error: error === null || error === void 0 ? void 0 : error.message,
                failedAt: new Date().toISOString(),
                retries: retryCount,
                principalRefunded: Number((_b = lockedInvestment.amount) !== null && _b !== void 0 ? _b : 0),
                refundedToForexAccountId: account.id,
            }),
        }, {
            where: { id: lockedInvestment.id, status: "ACTIVE" },
            transaction: t,
        });
        if (affected === 0) {
            throw new Error(`Investment ${lockedInvestment.id} status changed concurrently; aborting cancel/refund`);
        }
        await t.commit();
        finished = true;
        console_1.logger.error("FOREX_INVESTMENT_PROCESS", `Investment ${lockedInvestment.id} CANCELLED after ${retryCount} retries; principal ${lockedInvestment.amount} refunded to forex account ${account.id}. Last error: ${error === null || error === void 0 ? void 0 : error.message}`);
        return true;
    }
    catch (err) {
        if (!finished) {
            try {
                await t.rollback();
            }
            catch (_c) {
            }
        }
        throw err;
    }
}
async function fetchUser(userId, ctx) {
    var _a, _b, _c, _d;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Fetching user ${userId}`);
        const user = await db_1.models.user.findByPk(userId);
        if (!user) {
            console_1.logger.warn("FOREX_INVESTMENT", `User not found: ${userId}`);
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, `User not found: ${userId}`);
        }
        else {
            (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, "User fetched successfully");
        }
        return user;
    }
    catch (error) {
        console_1.logger.error("FOREX_INVESTMENT_PROCESS", "Failed to fetch user", error);
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, "Failed to fetch user");
        throw error;
    }
}
function calculateRoi(investment) {
    var _a, _b;
    const amount = (_a = investment.amount) !== null && _a !== void 0 ? _a : 0;
    if (investment.roiPercentage != null) {
        return (amount * investment.roiPercentage) / 100;
    }
    if (investment.profit != null) {
        return investment.profit;
    }
    const quoted = investment.plan.profitPercentage;
    const percentage = quoted != null && Number.isFinite(Number(quoted))
        ? Number(quoted)
        : Number((_b = investment.plan.defaultProfit) !== null && _b !== void 0 ? _b : 0);
    return (amount * percentage) / 100;
}
function determineInvestmentResult(investment) {
    const result = investment.result || investment.plan.defaultResult;
    return result;
}
function shouldProcessInvestment(investment, roi, investmentResult) {
    if (investment.endDate) {
        return (0, date_fns_1.isPast)(new Date(investment.endDate));
    }
    const endDate = calculateEndDate(investment);
    return (0, date_fns_1.isPast)(endDate);
}
function calculateEndDate(investment) {
    const createdAt = new Date(investment.createdAt);
    let endDate;
    switch (investment.duration.timeframe) {
        case "HOUR":
            endDate = (0, date_fns_1.addHours)(createdAt, investment.duration.duration);
            break;
        case "DAY":
            endDate = (0, date_fns_1.addDays)(createdAt, investment.duration.duration);
            break;
        case "WEEK":
            endDate = (0, date_fns_1.addDays)(createdAt, investment.duration.duration * 7);
            break;
        case "MONTH":
            endDate = (0, date_fns_1.addDays)(createdAt, investment.duration.duration * 30);
            break;
        default:
            endDate = (0, date_fns_1.addHours)(createdAt, investment.duration.duration);
            break;
    }
    return endDate;
}
async function handleInvestmentUpdate(investment, user, roi, investmentResult, ctx) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    var _o, _p, _q;
    const cronName = "processForexInvestments";
    let updatedInvestment;
    const t = await db_1.sequelize.transaction();
    try {
        (0, broadcast_1.broadcastLog)(cronName, `Starting update for investment ${investment.id}`);
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Starting investment update transaction");
        const lockedInvestment = await db_1.models.forexInvestment.findByPk(investment.id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!lockedInvestment || lockedInvestment.status !== "ACTIVE") {
            (0, broadcast_1.broadcastLog)(cronName, `Investment ${investment.id} is no longer ACTIVE (status: ${lockedInvestment === null || lockedInvestment === void 0 ? void 0 : lockedInvestment.status}); skipping`, "info");
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Investment no longer ACTIVE, skipping");
            await t.commit();
            return null;
        }
        const account = await db_1.models.forexAccount.findOne({
            where: { userId: user.id, type: "LIVE" },
            lock: t.LOCK.UPDATE,
            transaction: t,
        });
        if (!account) {
            (0, broadcast_1.broadcastLog)(cronName, `LIVE forex account not found for user ${user.id} (investment ${investment.id})`, "error");
            (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, "Forex account not found");
            await t.rollback();
            return null;
        }
        const amount = Number((_o = investment.amount) !== null && _o !== void 0 ? _o : 0);
        const roiMagnitude = (_p = investment.roiPercentage) !== null && _p !== void 0 ? _p : (amount > 0 ? (roi / amount) * 100 : 0);
        const roiPercentage = investmentResult === "LOSS"
            ? -Math.abs(roiMagnitude)
            : investmentResult === "DRAW"
                ? 0
                : Math.abs(roiMagnitude);
        (0, broadcast_1.broadcastLog)(cronName, `Settling into forex account ${account.id} (balance ${account.balance}), investment amount: ${amount}`);
        let payout;
        if (investmentResult === 'WIN') {
            payout = amount + roi;
        }
        else if (investmentResult === 'LOSS') {
            payout = Math.max(0, amount - Math.abs(roi));
        }
        else {
            payout = amount;
        }
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _d === void 0 ? void 0 : _d.call(ctx, `Processing ${investmentResult} case - returning ${payout} to the forex account`);
        const signedProfit = investmentResult === 'LOSS'
            ? -Math.abs(roi)
            : investmentResult === 'DRAW'
                ? 0
                : roi;
        const [affected] = await db_1.models.forexInvestment.update({
            status: 'COMPLETED',
            result: investmentResult,
            roiPercentage,
            profit: signedProfit,
        }, { where: { id: investment.id, status: 'ACTIVE' }, transaction: t });
        if (affected === 0) {
            (0, broadcast_1.broadcastLog)(cronName, `Investment ${investment.id} was settled by another run; nothing paid`, 'warning');
            (_e = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _e === void 0 ? void 0 : _e.call(ctx, 'Investment already settled, skipping payout');
            await t.rollback();
            return null;
        }
        if (payout > 0) {
            await (0, utils_1.updateForexAccountBalance)(account, payout, true, t, ctx);
        }
        await (0, fees_1.recordInvestmentOutcome)({
            result: investmentResult,
            roi,
            currency: account.currency || ((_f = investment.plan) === null || _f === void 0 ? void 0 : _f.currency) || "USD",
            walletType: "FIAT",
            type: "FOREX_INVESTMENT",
            referenceId: investment.id,
            description: `Forex investment ${investmentResult}: ${(_q = (_g = investment.plan) === null || _g === void 0 ? void 0 : _g.name) !== null && _q !== void 0 ? _q : "(deleted plan)"}`,
            userId: user.id,
            metadata: {
                investmentId: investment.id,
                accountId: account.id,
                result: investmentResult,
            },
            transaction: t,
        });
        (0, broadcast_1.broadcastLog)(cronName, `Forex investment ${investment.id} updated to COMPLETED (${investmentResult}); ` +
            `${payout} returned to the forex account`);
        console_1.logger.info('FOREX_INVESTMENT_COMPLETION', `Forex investment ${investment.id} completed for user ${user.id} with result: ${investmentResult}, ` +
            `principal ${amount}, profit ${signedProfit}, returned ${payout} to forex account ${account.id}`);
        (_h = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _h === void 0 ? void 0 : _h.call(ctx, "Fetching updated investment");
        updatedInvestment = await db_1.models.forexInvestment.findByPk(investment.id, {
            include: [
                { model: db_1.models.forexPlan, as: "plan" },
                { model: db_1.models.forexDuration, as: "duration" },
            ],
            transaction: t,
        });
        (_j = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _j === void 0 ? void 0 : _j.call(ctx, "Committing transaction");
        await t.commit();
        (0, broadcast_1.broadcastLog)(cronName, `Transaction committed for investment ${investment.id}`, "success");
        (_k = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _k === void 0 ? void 0 : _k.call(ctx, "Investment updated successfully");
    }
    catch (error) {
        await (0, transaction_1.rollbackIfActive)(t);
        if (error instanceof wallet_1.DuplicateOperationError) {
            (0, broadcast_1.broadcastLog)(cronName, `Payout for investment ${investment.id} already recorded (duplicate idempotency key); skipping`, "warning");
            console_1.logger.warn("FOREX_INVESTMENT_UPDATE", `Duplicate payout detected for investment ${investment.id}; skipped (no status change)`);
            (_l = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _l === void 0 ? void 0 : _l.call(ctx, "Payout already recorded, skipping");
            return null;
        }
        (0, broadcast_1.broadcastLog)(cronName, `Error updating investment ${investment.id}: ${error.message}`, "error");
        console_1.logger.error("FOREX_INVESTMENT_UPDATE", "Error updating investment", error);
        (_m = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _m === void 0 ? void 0 : _m.call(ctx, error.message);
        throw error;
    }
    return updatedInvestment;
}
async function postProcessInvestment(user, investment, updatedInvestment, ctx) {
    var _a, _b, _c, _d, _e;
    var _f;
    const cronName = "processForexInvestments";
    try {
        (0, broadcast_1.broadcastLog)(cronName, `Processing rewards for investment ${investment.id}`);
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Processing affiliate rewards");
        await (0, affiliate_1.processRewards)(user.id, (_f = investment.amount) !== null && _f !== void 0 ? _f : 0, "FOREX_INVESTMENT", investment.plan.currency, `FOREX_INVESTMENT:forex_investment:${investment.id}`);
        (0, broadcast_1.broadcastLog)(cronName, `Rewards processed for investment ${investment.id}`, "success");
    }
    catch (error) {
        (0, broadcast_1.broadcastLog)(cronName, `Error processing rewards for investment ${investment.id}: ${error.message}`, "error");
        console_1.logger.error("FOREX_INVESTMENT_POST_PROCESS", `Failed to process affiliate rewards for investment ${investment.id}: ${error.message}`, error);
    }
    try {
        (0, broadcast_1.broadcastLog)(cronName, `Sending investment email for investment ${investment.id}`);
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Sending investment completion email");
        await (0, emails_1.sendInvestmentEmail)(user, investment.plan, investment.duration, updatedInvestment, "ForexInvestmentCompleted");
        (0, broadcast_1.broadcastLog)(cronName, `Investment email sent for investment ${investment.id}`, "success");
        (0, broadcast_1.broadcastLog)(cronName, `Creating notification for investment ${investment.id}`);
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Creating completion notification");
        await (0, notifications_1.createNotification)({
            userId: user.id,
            relatedId: updatedInvestment.id,
            title: "Forex Investment Completed",
            message: `Your Forex investment of ${investment.amount} ${investment.plan.currency} has been completed with a status of ${updatedInvestment.result}`,
            type: "system",
            link: `/forex/investment/${updatedInvestment.id}`,
            actions: [
                {
                    label: "View Investment",
                    link: `/forex/investment/${updatedInvestment.id}`,
                    primary: true,
                },
            ],
        });
        (0, broadcast_1.broadcastLog)(cronName, `Notification created for investment ${investment.id}`, "success");
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _d === void 0 ? void 0 : _d.call(ctx, "Post-processing completed successfully");
    }
    catch (error) {
        (0, broadcast_1.broadcastLog)(cronName, `Error in postProcessInvestment for ${investment.id}: ${error.message}`, "error");
        console_1.logger.error("FOREX_INVESTMENT_POST_PROCESS", `Failed to send completion email/notification for investment ${investment.id}: ${error.message}`, error);
        (_e = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _e === void 0 ? void 0 : _e.call(ctx, error.message);
    }
}
