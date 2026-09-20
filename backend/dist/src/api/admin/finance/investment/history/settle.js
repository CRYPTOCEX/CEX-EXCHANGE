"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveGeneralSettlementTerms = void 0;
exports.applyAdminGeneralInvestmentStatus = applyAdminGeneralInvestmentStatus;
exports.refundOutstandingInvestments = refundOutstandingInvestments;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
const fees_1 = require("@b/utils/fees");
const investment_funding_1 = require("@b/utils/investment-funding");
const transition_1 = require("./transition");
Object.defineProperty(exports, "deriveGeneralSettlementTerms", { enumerable: true, get: function () { return transition_1.deriveGeneralSettlementTerms; } });
async function loadFundingWallet(id, t) {
    const resolved = await (0, investment_funding_1.resolveFundingWallet)({
        referenceId: id,
        fundingType: "INVESTMENT",
        transaction: t,
    });
    if (!resolved.ok)
        return null;
    return { funding: resolved.value.funding, wallet: resolved.value.wallet };
}
async function applyAdminGeneralInvestmentStatus(id, status, ctx) {
    var _a, _b;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Fetching investment ${id}`);
    const investment = await db_1.models.investment.findByPk(id, {
        paranoid: false,
        include: [{ model: db_1.models.investmentPlan, as: "plan" }],
    });
    if (!investment) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Investment not found" });
    }
    const plan = (0, transition_1.planAdminInvestmentStatusChange)(investment, status);
    if (!plan.ok) {
        throw (0, error_1.createError)({ statusCode: 400, message: plan.reason });
    }
    let payout = 0;
    let refund = 0;
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, `Settling investment ${id} as ${plan.status}`);
    await db_1.sequelize.transaction(async (t) => {
        var _a, _b;
        var _c, _d;
        const locked = await db_1.models.investment.findByPk(id, {
            paranoid: false,
            include: [{ model: db_1.models.investmentPlan, as: "plan" }],
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!locked) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Investment not found" });
        }
        const regraded = (0, transition_1.planAdminInvestmentStatusChange)(locked, status);
        if (!regraded.ok) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: `${regraded.reason} — it changed while this request was in flight, ` +
                    `most likely settled by the investment cron. Refresh before deciding again.`,
            });
        }
        const funding = await loadFundingWallet(id, t);
        if (!funding) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Original funding transaction or wallet not found - cannot settle this investment. " +
                    "Records created directly in the admin table never debited a wallet and have nothing to return.",
            });
        }
        const { wallet } = funding;
        if (plan.action === "PAYOUT") {
            if (plan.credit > 0) {
                await wallet_1.walletService.credit({
                    idempotencyKey: `investment_admin_payout_${id}`,
                    userId: wallet.userId,
                    walletId: wallet.id,
                    walletType: wallet.type,
                    currency: wallet.currency,
                    amount: plan.credit,
                    operationType: "INVESTMENT_ROI",
                    referenceId: `${id}_roi`,
                    description: `Investment ${plan.result}: Admin completed | Plan "${(_c = (_a = investment.plan) === null || _a === void 0 ? void 0 : _a.name) !== null && _c !== void 0 ? _c : "(deleted plan)"}"`,
                    metadata: {
                        investmentId: id,
                        planId: investment.planId,
                        result: plan.result,
                        roi: plan.roi,
                        originalAmount: investment.amount,
                        adminAction: true,
                    },
                    transaction: t,
                });
                payout = plan.credit;
            }
            await (0, fees_1.recordInvestmentOutcome)({
                result: plan.result,
                roi: plan.roi,
                currency: wallet.currency,
                walletType: wallet.type,
                type: "INVESTMENT",
                referenceId: id,
                description: `General investment ${plan.result} (admin completed): ${(_d = (_b = investment.plan) === null || _b === void 0 ? void 0 : _b.name) !== null && _d !== void 0 ? _d : "(deleted plan)"}`,
                userId: wallet.userId,
                metadata: {
                    investmentId: id,
                    planId: investment.planId,
                    result: plan.result,
                    adminAction: true,
                },
                transaction: t,
            });
            await db_1.models.investment.update({
                status: "COMPLETED",
                result: plan.result,
                roiPercentage: plan.roiPercentage,
                profit: plan.roi,
            }, { where: { id }, transaction: t });
        }
        else {
            if (plan.credit > 0) {
                await wallet_1.walletService.credit({
                    idempotencyKey: `investment_admin_${plan.status.toLowerCase()}_${id}`,
                    userId: wallet.userId,
                    walletId: wallet.id,
                    walletType: wallet.type,
                    currency: wallet.currency,
                    amount: plan.credit,
                    operationType: "REFUND",
                    referenceId: `${id}_refund`,
                    description: `Investment ${plan.status.toLowerCase()} by admin - refund ${plan.credit} ${wallet.currency}`,
                    metadata: { investmentId: id, adminAction: true },
                    transaction: t,
                });
                refund = plan.credit;
            }
            await db_1.models.investment.update({ status: plan.status }, { where: { id }, transaction: t });
        }
    });
    return { id, status: plan.status, result: plan.result, payout, refund };
}
async function refundOutstandingInvestments(ids, ctx) {
    var _a, _b, _c;
    for (const id of ids) {
        if (!id)
            continue;
        try {
            const investment = await db_1.models.investment.findByPk(id, {
                paranoid: false,
            });
            if (!investment) {
                (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Investment ${id} not found; nothing to refund`);
                continue;
            }
            if (!(0, transition_1.isPrincipalOutstanding)(investment)) {
                (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, `No refund owed for ${id}: it is ${investment.status}` +
                    (investment.deletedAt ? " and already cancelled" : ""));
                continue;
            }
            await db_1.sequelize.transaction(async (t) => {
                var _a;
                const locked = await db_1.models.investment.findByPk(id, {
                    paranoid: false,
                    transaction: t,
                    lock: t.LOCK.UPDATE,
                });
                if (!locked || !(0, transition_1.isPrincipalOutstanding)(locked)) {
                    console_1.logger.warn("ADMIN_FIN", `Investment ${id} was settled while this delete was in flight ` +
                        `(now ${(_a = locked === null || locked === void 0 ? void 0 : locked.status) !== null && _a !== void 0 ? _a : "gone"}); deleting without a refund`);
                    return;
                }
                const funding = await loadFundingWallet(id, t);
                if (!funding) {
                    console_1.logger.warn("ADMIN_FIN", `Investment ${id} has no funding transaction; deleting without a refund`);
                    return;
                }
                const { wallet } = funding;
                await wallet_1.walletService.credit({
                    idempotencyKey: `admin_investment_delete_refund_${id}`,
                    userId: wallet.userId,
                    walletId: wallet.id,
                    walletType: wallet.type,
                    currency: wallet.currency,
                    amount: locked.amount,
                    operationType: "REFUND",
                    referenceId: `${id}_admin_refund`,
                    description: `Refund for deleted investment ${id}`,
                    metadata: { investmentId: id, adminAction: true },
                    transaction: t,
                });
                await db_1.models.investment.update({ status: "CANCELLED" }, { where: { id }, transaction: t });
            });
            (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, `Refunded investment ${id} before deletion`);
        }
        catch (error) {
            console_1.logger.error("ADMIN_FIN", `Refund before delete failed for investment ${id}: ${error === null || error === void 0 ? void 0 : error.message}`, error);
            throw error;
        }
    }
}
