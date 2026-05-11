"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const wallet_1 = require("@b/services/wallet");
exports.metadata = {
    summary: "Updates the status of an AI Investment",
    operationId: "updateAIInvestmentStatus",
    tags: ["Admin", "AI Investments"],
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "ID of the AI Investment to update",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        status: {
                            type: "string",
                            enum: ["COMPLETED", "CANCELLED", "REJECTED"],
                            description: "New status to apply",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("AI Investment"),
    requiresAuth: true,
    permission: "edit.ai.investment",
    logModule: "ADMIN_AI",
    logTitle: "Update AI investment status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching investment ${id}`);
    const investment = await db_1.models.aiInvestment.findByPk(id, {
        include: [
            { model: db_1.models.aiInvestmentPlan, as: "plan" },
            { model: db_1.models.aiInvestmentDuration, as: "duration" },
        ],
    });
    if (!investment) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Investment not found" });
    }
    if (investment.status === status) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Investment is already ${status}`,
        });
    }
    if (investment.status !== "ACTIVE") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Cannot change status of a ${investment.status.toLowerCase()} investment`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating investment ${id} status to ${status}`);
    if (status === "COMPLETED") {
        await db_1.sequelize.transaction(async (t) => {
            var _a, _b, _c, _d, _e;
            const amount = investment.amount;
            const roi = (_a = investment.profit) !== null && _a !== void 0 ? _a : (amount * ((_c = (_b = investment.plan) === null || _b === void 0 ? void 0 : _b.defaultProfit) !== null && _c !== void 0 ? _c : 0)) / 100;
            const investmentResult = investment.result || ((_d = investment.plan) === null || _d === void 0 ? void 0 : _d.defaultResult) || "WIN";
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
            const transactionRecord = await db_1.models.transaction.findOne({
                where: { referenceId: id, type: "AI_INVESTMENT" },
                transaction: t,
            });
            if (!transactionRecord) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Original transaction record not found - cannot process payout",
                });
            }
            const wallet = await db_1.models.wallet.findByPk(transactionRecord.walletId, { transaction: t, lock: t.LOCK.UPDATE });
            if (!wallet) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Wallet not found - cannot process payout",
                });
            }
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
                    description: `AI Investment ${investmentResult}: Admin completed | Plan "${(_e = investment.plan) === null || _e === void 0 ? void 0 : _e.title}"`,
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
            }
            await db_1.models.aiInvestment.update({
                status: "COMPLETED",
                result: investmentResult,
                profit: roi,
            }, { where: { id }, transaction: t });
        });
    }
    else if (status === "CANCELLED" || status === "REJECTED") {
        await db_1.sequelize.transaction(async (t) => {
            const transactionRecord = await db_1.models.transaction.findOne({
                where: { referenceId: id, type: "AI_INVESTMENT" },
                transaction: t,
            });
            if (!transactionRecord) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Original transaction record not found - cannot process refund",
                });
            }
            const wallet = await db_1.models.wallet.findByPk(transactionRecord.walletId, { transaction: t, lock: t.LOCK.UPDATE });
            if (!wallet) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Wallet not found - cannot process refund",
                });
            }
            const currency = wallet.currency;
            await wallet_1.walletService.credit({
                idempotencyKey: `ai_invest_admin_${status.toLowerCase()}_${id}`,
                userId: wallet.userId,
                walletId: wallet.id,
                walletType: wallet.type,
                currency,
                amount: investment.amount,
                operationType: "REFUND",
                referenceId: id,
                description: `AI Investment ${status.toLowerCase()} by admin - refund ${investment.amount} ${currency}`,
                metadata: {
                    investmentId: id,
                    symbol: investment.symbol,
                    adminAction: true,
                },
                transaction: t,
            });
            await db_1.models.aiInvestment.update({ status: status }, { where: { id }, transaction: t });
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Investment status updated");
    return { message: `Investment status updated to ${status}` };
};
