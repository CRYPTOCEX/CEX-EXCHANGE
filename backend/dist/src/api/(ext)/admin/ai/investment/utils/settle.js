"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyAdminInvestmentStatus = applyAdminInvestmentStatus;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const wallet_1 = require("@b/services/wallet");
const fees_1 = require("@b/utils/fees");
const investment_funding_1 = require("@b/utils/investment-funding");
const settlement_1 = require("@b/api/(ext)/ai/investment/utils/settlement");
const status_transition_1 = require("./status-transition");
async function applyAdminInvestmentStatus(id, status, ctx) {
    var _a, _b;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Fetching investment ${id}`);
    const investment = await db_1.models.aiInvestment.findByPk(id, {
        include: [
            { model: db_1.models.aiInvestmentPlan, as: "plan" },
            { model: db_1.models.aiInvestmentDuration, as: "duration" },
        ],
    });
    if (!investment) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Investment not found" });
    }
    const refusal = (0, status_transition_1.adminStatusTransitionRefusal)(investment.status, status);
    if (refusal)
        throw (0, error_1.createError)(refusal);
    const assertStillActive = async (t) => {
        const locked = await db_1.models.aiInvestment.findByPk(id, {
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!locked) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Investment not found" });
        }
        const raced = (0, status_transition_1.adminStatusTransitionRefusal)(locked.status, status);
        if (raced)
            throw (0, error_1.createError)(raced);
    };
    let payout = 0;
    let refund = 0;
    let settledResult;
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, `Updating investment ${id} status to ${status}`);
    if (status === "COMPLETED") {
        await db_1.sequelize.transaction(async (t) => {
            var _a, _b;
            var _c, _d;
            await assertStillActive(t);
            const amount = investment.amount;
            const { roi, roiPercentage, result: investmentResult, } = (0, settlement_1.deriveSettlementTerms)(investment);
            settledResult = investmentResult;
            const payoutAmount = (0, settlement_1.computePayout)(amount, roi, investmentResult);
            const funded = await (0, investment_funding_1.resolveFundingWallet)({
                referenceId: id,
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
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Cannot complete this investment: ${(0, investment_funding_1.fundingRefusalMessage)(funded.refusal)}`,
                });
            }
            const wallet = funded.value.wallet;
            if (payoutAmount > 0) {
                await wallet_1.walletService.credit({
                    idempotencyKey: `ai_invest_admin_payout_${id}`,
                    userId: wallet.userId,
                    walletId: wallet.id,
                    walletType: wallet.type,
                    currency: wallet.currency,
                    amount: payoutAmount,
                    operationType: "AI_INVESTMENT_ROI",
                    referenceId: `${id}_roi`,
                    description: `AI Investment ${investmentResult}: Admin completed | Plan "${(_c = (_a = investment.plan) === null || _a === void 0 ? void 0 : _a.title) !== null && _c !== void 0 ? _c : "(deleted plan)"}"`,
                    metadata: {
                        investmentId: id,
                        planId: investment.planId,
                        result: investmentResult,
                        roi,
                        originalAmount: amount,
                        adminAction: true,
                    },
                    transaction: t,
                });
                payout = payoutAmount;
            }
            await (0, fees_1.recordInvestmentOutcome)({
                result: investmentResult,
                roi,
                currency: wallet.currency,
                walletType: wallet.type,
                type: "AI_INVESTMENT",
                referenceId: id,
                description: `AI investment ${investmentResult} (admin completed): ${(_d = (_b = investment.plan) === null || _b === void 0 ? void 0 : _b.title) !== null && _d !== void 0 ? _d : "(deleted plan)"}`,
                userId: wallet.userId,
                metadata: {
                    investmentId: id,
                    planId: investment.planId,
                    result: investmentResult,
                    adminAction: true,
                },
                transaction: t,
            });
            await db_1.models.aiInvestment.update({
                status: "COMPLETED",
                result: investmentResult,
                roiPercentage,
                profit: roi,
            }, { where: { id }, transaction: t });
        });
    }
    else {
        await db_1.sequelize.transaction(async (t) => {
            await assertStillActive(t);
            const funded = await (0, investment_funding_1.resolveFundingWallet)({
                referenceId: id,
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
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Cannot refund this investment: ${(0, investment_funding_1.fundingRefusalMessage)(funded.refusal)}`,
                });
            }
            const wallet = funded.value.wallet;
            const currency = wallet.currency;
            await wallet_1.walletService.credit({
                idempotencyKey: `ai_invest_admin_${status.toLowerCase()}_${id}`,
                userId: wallet.userId,
                walletId: wallet.id,
                walletType: wallet.type,
                currency,
                amount: investment.amount,
                operationType: "REFUND",
                referenceId: `${id}_refund`,
                description: `AI Investment ${status.toLowerCase()} by admin - refund ${investment.amount} ${currency}`,
                metadata: {
                    investmentId: id,
                    symbol: investment.symbol,
                    adminAction: true,
                },
                transaction: t,
            });
            refund = investment.amount;
            await db_1.models.aiInvestment.update({ status: status }, { where: { id }, transaction: t });
        });
    }
    return { id, status, result: settledResult, payout, refund };
}
