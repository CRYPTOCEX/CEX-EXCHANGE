"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processForexInvestments = processForexInvestments;
exports.getActiveForexInvestments = getActiveForexInvestments;
exports.processForexInvestment = processForexInvestment;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const date_fns_1 = require("date-fns");
const emails_1 = require("@b/utils/emails");
const notifications_1 = require("@b/utils/notifications");
const affiliate_1 = require("@b/utils/affiliate");
const broadcast_1 = require("@b/cron/broadcast");
const wallet_1 = require("@b/services/wallet");
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    const cronName = "processForexInvestments";
    const maxRetries = 3;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Processing forex investment ${investment.id}`);
        if (investment.status === "COMPLETED") {
            (0, broadcast_1.broadcastLog)(cronName, `Investment ${investment.id} is already COMPLETED; skipping`, "info");
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Investment already completed, skipping");
            return null;
        }
        (0, broadcast_1.broadcastLog)(cronName, `Fetching user for investment ${investment.id}`);
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Fetching user data");
        const user = await fetchUser(investment.userId, ctx);
        if (!user) {
            (0, broadcast_1.broadcastLog)(cronName, `User not found for investment ${investment.id}`, "error");
            (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, "User not found");
            return null;
        }
        const roi = calculateRoi(investment);
        (0, broadcast_1.broadcastLog)(cronName, `Calculated ROI (${roi}) for investment ${investment.id}`);
        (_e = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _e === void 0 ? void 0 : _e.call(ctx, `Calculated ROI: ${roi}`);
        const investmentResult = determineInvestmentResult(investment);
        (0, broadcast_1.broadcastLog)(cronName, `Determined result (${investmentResult}) for investment ${investment.id}`);
        (_f = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _f === void 0 ? void 0 : _f.call(ctx, `Determined result: ${investmentResult}`);
        if (shouldProcessInvestment(investment, roi, investmentResult)) {
            (0, broadcast_1.broadcastLog)(cronName, `Investment ${investment.id} is eligible for processing (end date passed)`);
            (_g = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _g === void 0 ? void 0 : _g.call(ctx, "Investment is eligible for processing");
            const updatedInvestment = await handleInvestmentUpdate(investment, user, roi, investmentResult, ctx);
            if (updatedInvestment) {
                await postProcessInvestment(user, investment, updatedInvestment, ctx);
            }
            (_h = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _h === void 0 ? void 0 : _h.call(ctx, "Forex investment processed successfully");
            return updatedInvestment;
        }
        else {
            (0, broadcast_1.broadcastLog)(cronName, `Investment ${investment.id} is not ready for processing (end date not reached)`, "info");
            (_j = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _j === void 0 ? void 0 : _j.call(ctx, "Investment not ready for processing (end date not reached)");
            return null;
        }
    }
    catch (error) {
        console_1.logger.error("FOREX_INVESTMENT_PROCESS", `Error processing investment ${investment.id}: ${error.message}`, error);
        (0, broadcast_1.broadcastLog)(cronName, `Error processing investment ${investment.id}: ${error.message}`, "error");
        (_k = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _k === void 0 ? void 0 : _k.call(ctx, error.message);
        if (retryCount < maxRetries) {
            (0, broadcast_1.broadcastLog)(cronName, `Retrying investment ${investment.id} (attempt ${retryCount + 1}/${maxRetries})`, "warning");
            (_l = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _l === void 0 ? void 0 : _l.call(ctx, `Retrying (attempt ${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
            return processForexInvestment(investment, retryCount + 1, ctx);
        }
        else {
            try {
                await db_1.models.forexInvestment.update({
                    status: "CANCELLED",
                    metadata: JSON.stringify({
                        error: error.message,
                        failedAt: new Date().toISOString(),
                        retries: retryCount
                    })
                }, { where: { id: investment.id } });
                (0, broadcast_1.broadcastLog)(cronName, `Investment ${investment.id} marked as CANCELLED after ${maxRetries} retries`, "error");
                await (0, notifications_1.createNotification)({
                    userId: investment.userId,
                    relatedId: investment.id,
                    title: "Forex Investment Processing Failed",
                    message: `Investment ${investment.id} failed to process after ${maxRetries} attempts. Manual review required.`,
                    type: "system",
                    link: `/admin/forex/investment/${investment.id}`,
                });
            }
            catch (updateError) {
                console_1.logger.error("FOREX_INVESTMENT_PROCESS", "Failed to mark investment as cancelled", updateError);
            }
        }
        throw error;
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
    if (investment.profit != null) {
        return investment.profit;
    }
    const amount = (_a = investment.amount) !== null && _a !== void 0 ? _a : 0;
    const defaultProfit = (_b = investment.plan.defaultProfit) !== null && _b !== void 0 ? _b : 0;
    const roi = (amount * defaultProfit) / 100;
    return roi;
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    const cronName = "processForexInvestments";
    let updatedInvestment;
    const t = await db_1.sequelize.transaction();
    try {
        (0, broadcast_1.broadcastLog)(cronName, `Starting update for investment ${investment.id}`);
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Starting investment update transaction");
        const wallet = await fetchWallet(user.id, investment.plan.currency, investment.plan.walletType, t, ctx);
        if (!wallet) {
            (0, broadcast_1.broadcastLog)(cronName, `Wallet not found for user ${user.id} (investment ${investment.id})`, "error");
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, "Wallet not found");
            await t.rollback();
            return null;
        }
        const amount = (_c = investment.amount) !== null && _c !== void 0 ? _c : 0;
        const newBalance = wallet.balance;
        (0, broadcast_1.broadcastLog)(cronName, `Fetched wallet. Current balance: ${newBalance}, investment amount: ${amount}`);
        if (investmentResult === "WIN") {
            (_d = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _d === void 0 ? void 0 : _d.call(ctx, "Processing WIN case - updating wallet balance");
            const idempotencyKey = `forex_invest_win_${investment.id}`;
            await wallet_1.walletService.credit({
                idempotencyKey,
                userId: wallet.userId,
                walletId: wallet.id,
                walletType: investment.plan.walletType,
                currency: investment.plan.currency,
                amount: amount + roi,
                operationType: "FOREX_INVESTMENT_ROI",
                description: `Investment ROI: Plan "${investment.plan.title}" | Duration: ${investment.duration.duration} ${investment.duration.timeframe}`,
                metadata: {
                    investmentId: investment.id,
                    planId: investment.plan.id,
                    result: investmentResult,
                    roi,
                },
                transaction: t,
            });
            (0, broadcast_1.broadcastLog)(cronName, `Wallet updated for WIN case. Added: ${amount + roi}`);
            (0, broadcast_1.broadcastLog)(cronName, `Transaction record created for WIN case for investment ${investment.id}`);
            (_e = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _e === void 0 ? void 0 : _e.call(ctx, "Updating investment status to COMPLETED");
            await db_1.models.forexInvestment.update({ status: "COMPLETED", result: investmentResult, profit: roi }, { where: { id: investment.id }, transaction: t });
            (0, broadcast_1.broadcastLog)(cronName, `Forex investment ${investment.id} updated to COMPLETED (WIN)`);
            console_1.logger.info("FOREX_INVESTMENT_COMPLETION", `Forex investment ${investment.id} completed for user ${user.id} with result: ${investmentResult}, ROI: ${roi}`);
        }
        else if (investmentResult === "LOSS") {
            (_f = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _f === void 0 ? void 0 : _f.call(ctx, "Processing LOSS case - calculating remaining amount");
            const remainingAmount = Math.max(0, amount - Math.abs(roi));
            if (remainingAmount > 0) {
                const idempotencyKey = `forex_invest_loss_${investment.id}`;
                await wallet_1.walletService.credit({
                    idempotencyKey,
                    userId: wallet.userId,
                    walletId: wallet.id,
                    walletType: investment.plan.walletType,
                    currency: investment.plan.currency,
                    amount: remainingAmount,
                    operationType: "FOREX_INVESTMENT_ROI",
                    description: `Investment ROI: Plan "${investment.plan.title}" | Duration: ${investment.duration.duration} ${investment.duration.timeframe}`,
                    metadata: {
                        investmentId: investment.id,
                        planId: investment.plan.id,
                        result: investmentResult,
                        loss: -Math.abs(roi),
                    },
                    transaction: t,
                });
            }
            (0, broadcast_1.broadcastLog)(cronName, `Wallet updated for LOSS case. Added: ${remainingAmount}`);
            (0, broadcast_1.broadcastLog)(cronName, `Transaction record created for LOSS case for investment ${investment.id}`);
            (_g = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _g === void 0 ? void 0 : _g.call(ctx, "Updating investment status to COMPLETED");
            await db_1.models.forexInvestment.update({ status: "COMPLETED", result: investmentResult, profit: roi }, { where: { id: investment.id }, transaction: t });
            (0, broadcast_1.broadcastLog)(cronName, `Forex investment ${investment.id} updated to COMPLETED (LOSS)`);
            console_1.logger.info("FOREX_INVESTMENT_COMPLETION", `Forex investment ${investment.id} completed for user ${user.id} with result: ${investmentResult}, Loss: ${-Math.abs(roi)}`);
        }
        else {
            (_h = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _h === void 0 ? void 0 : _h.call(ctx, "Processing DRAW case - returning original amount");
            const idempotencyKey = `forex_invest_draw_${investment.id}`;
            await wallet_1.walletService.credit({
                idempotencyKey,
                userId: wallet.userId,
                walletId: wallet.id,
                walletType: investment.plan.walletType,
                currency: investment.plan.currency,
                amount,
                operationType: "FOREX_INVESTMENT_ROI",
                description: `Investment ROI: Plan "${investment.plan.title}" | Duration: ${investment.duration.duration} ${investment.duration.timeframe}`,
                metadata: {
                    investmentId: investment.id,
                    planId: investment.plan.id,
                    result: investmentResult,
                },
                transaction: t,
            });
            (0, broadcast_1.broadcastLog)(cronName, `Wallet updated for DRAW case. Returned: ${amount}`);
            (0, broadcast_1.broadcastLog)(cronName, `Transaction record created for DRAW case for investment ${investment.id}`);
            (_j = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _j === void 0 ? void 0 : _j.call(ctx, "Updating investment status to COMPLETED");
            await db_1.models.forexInvestment.update({ status: "COMPLETED", result: investmentResult, profit: roi }, { where: { id: investment.id }, transaction: t });
            (0, broadcast_1.broadcastLog)(cronName, `Forex investment ${investment.id} updated to COMPLETED (DRAW)`);
            console_1.logger.info("FOREX_INVESTMENT_COMPLETION", `Forex investment ${investment.id} completed for user ${user.id} with result: ${investmentResult}, No gain or loss`);
        }
        (_k = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _k === void 0 ? void 0 : _k.call(ctx, "Fetching updated investment");
        updatedInvestment = await db_1.models.forexInvestment.findByPk(investment.id, {
            include: [
                { model: db_1.models.forexPlan, as: "plan" },
                { model: db_1.models.forexDuration, as: "duration" },
            ],
            transaction: t,
        });
        (_l = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _l === void 0 ? void 0 : _l.call(ctx, "Committing transaction");
        await t.commit();
        (0, broadcast_1.broadcastLog)(cronName, `Transaction committed for investment ${investment.id}`, "success");
        (_m = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _m === void 0 ? void 0 : _m.call(ctx, "Investment updated successfully");
    }
    catch (error) {
        await t.rollback();
        (0, broadcast_1.broadcastLog)(cronName, `Error updating investment ${investment.id}: ${error.message}`, "error");
        console_1.logger.error("FOREX_INVESTMENT_UPDATE", "Error updating investment", error);
        (_o = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _o === void 0 ? void 0 : _o.call(ctx, error.message);
        throw error;
    }
    return updatedInvestment;
}
async function fetchWallet(userId, currency, walletType, transaction, ctx) {
    var _a, _b, _c, _d;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Fetching wallet for user ${userId} (${walletType} ${currency})`);
        const wallet = await db_1.models.wallet.findOne({
            where: { userId, currency, type: walletType },
            transaction,
        });
        if (!wallet) {
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, "Wallet not found");
            throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
        }
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, "Wallet fetched successfully");
        return wallet;
    }
    catch (error) {
        console_1.logger.error("FOREX_INVESTMENT_PROCESS", "Failed to fetch wallet", error);
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, "Failed to fetch wallet");
        throw error;
    }
}
async function postProcessInvestment(user, investment, updatedInvestment, ctx) {
    var _a, _b, _c, _d, _e, _f;
    const cronName = "processForexInvestments";
    try {
        (0, broadcast_1.broadcastLog)(cronName, `Sending investment email for investment ${investment.id}`);
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Sending investment completion email");
        await (0, emails_1.sendInvestmentEmail)(user, investment.plan, investment.duration, updatedInvestment, "ForexInvestmentCompleted");
        (0, broadcast_1.broadcastLog)(cronName, `Investment email sent for investment ${investment.id}`, "success");
        (0, broadcast_1.broadcastLog)(cronName, `Creating notification for investment ${investment.id}`);
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Creating completion notification");
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
        (0, broadcast_1.broadcastLog)(cronName, `Processing rewards for investment ${investment.id}`);
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Processing affiliate rewards");
        await (0, affiliate_1.processRewards)(user.id, (_d = investment.amount) !== null && _d !== void 0 ? _d : 0, "FOREX_INVESTMENT", investment.plan.currency, `FOREX_INVESTMENT:forex_investment:${investment.id}`);
        (0, broadcast_1.broadcastLog)(cronName, `Rewards processed for investment ${investment.id}`, "success");
        (_e = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _e === void 0 ? void 0 : _e.call(ctx, "Post-processing completed successfully");
    }
    catch (error) {
        (0, broadcast_1.broadcastLog)(cronName, `Error in postProcessInvestment for ${investment.id}: ${error.message}`, "error");
        console_1.logger.error("FOREX_INVESTMENT_POST_PROCESS", `Error in postProcessInvestment for ${investment.id}: ${error.message}`, error);
        (_f = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _f === void 0 ? void 0 : _f.call(ctx, error.message);
    }
}
