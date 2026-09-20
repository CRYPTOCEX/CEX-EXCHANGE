"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const emails_1 = require("@b/utils/emails");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
const investment_funding_1 = require("@b/utils/investment-funding");
const settlement_guard_1 = require("../settlement-guard");
exports.metadata = {
    summary: "Cancels an investment",
    description: "Allows a user to cancel an existing investment by its UUID. The operation reverses any financial transactions associated with the investment and updates the user's wallet balance accordingly.",
    operationId: "cancelInvestment",
    tags: ["Finance", "Investment"],
    logModule: "FINANCE",
    logTitle: "Cancel investment",
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "The ID of the investment to cancel",
            required: true,
            schema: {
                type: "string",
            },
        },
        {
            name: "type",
            in: "query",
            description: "The type of investment to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Investment canceled successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Investment"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, params, query, ctx } = data;
    if (!user)
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const { id } = params;
    const { type } = query;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating investment type");
    if (!type || typeof type !== "string") {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid investment type" });
    }
    let investment, model, planModel, durationModel, fundingType;
    switch (type.toLowerCase()) {
        case "general":
            model = db_1.models.investment;
            planModel = db_1.models.investmentPlan;
            durationModel = db_1.models.investmentDuration;
            fundingType = "INVESTMENT";
            break;
        case "forex":
            model = db_1.models.forexInvestment;
            planModel = db_1.models.forexPlan;
            durationModel = db_1.models.forexDuration;
            fundingType = "FOREX_INVESTMENT";
            break;
        default:
            throw (0, error_1.createError)({ statusCode: 400, message: "Invalid investment type" });
    }
    const userPk = await db_1.models.user.findByPk(user.id);
    if (!userPk) {
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing investment cancellation");
    await db_1.sequelize.transaction(async (transaction) => {
        var _a, _b;
        var _c;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Claiming investment");
        const claimed = await model.findOne({
            where: { id, userId: user.id },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        const refusal = (0, settlement_guard_1.investmentClaimRefusal)(claimed);
        if (refusal === "GONE" || refusal === "DELETED") {
            throw (0, error_1.createError)({ statusCode: 404, message: "Investment not found" });
        }
        if (refusal) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Only active investments can be cancelled",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding investment");
        investment = await model.findOne({
            where: { id, userId: user.id },
            include: [
                {
                    model: planModel,
                    as: "plan",
                },
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "email", "avatar"],
                },
                {
                    model: durationModel,
                    as: "duration",
                },
            ],
            transaction,
        });
        if (!investment)
            throw (0, error_1.createError)({ statusCode: 404, message: "Investment not found" });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding wallet");
        const funded = await (0, investment_funding_1.resolveFundingWallet)({
            referenceId: id,
            fundingType,
            expectedUserId: user.id,
            fallback: {
                currency: (_a = investment.plan) === null || _a === void 0 ? void 0 : _a.currency,
                walletType: (_b = investment.plan) === null || _b === void 0 ? void 0 : _b.walletType,
            },
            transaction,
        });
        if (!funded.ok) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `This investment cannot be cancelled: ${(0, investment_funding_1.fundingRefusalMessage)(funded.refusal)}`,
            });
        }
        const wallet = funded.value.wallet;
        const existingTransaction = funded.value.funding;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Refunding investment amount via wallet service");
        const idempotencyKey = `investment_refund_${id}`;
        const refundResult = await wallet_1.walletService.credit({
            idempotencyKey,
            userId: user.id,
            walletId: wallet.id,
            walletType: wallet.type,
            currency: wallet.currency,
            amount: investment.amount,
            operationType: "REFUND",
            referenceId: `${id}_refund`,
            description: `Investment cancelled - refund ${investment.amount} ${wallet.currency}`,
            metadata: {
                investmentId: id,
                planId: investment.plan.id,
                planName: investment.plan.name,
            },
            transaction,
        });
        if (existingTransaction) {
            let existingMeta = {};
            try {
                const raw = existingTransaction.metadata;
                if (raw) {
                    existingMeta = typeof raw === "string" ? JSON.parse(raw) : raw;
                }
            }
            catch (_d) {
                existingMeta = {};
            }
            const mergedMeta = {
                ...existingMeta,
                cancelled: true,
                cancelledAt: new Date().toISOString(),
                refundTransactionId: (_c = refundResult === null || refundResult === void 0 ? void 0 : refundResult.transactionId) !== null && _c !== void 0 ? _c : null,
            };
            await existingTransaction.update({ metadata: JSON.stringify(mergedMeta) }, { transaction });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting investment");
        await investment.update({ status: "CANCELLED" }, { transaction });
        await investment.destroy({
            transaction,
        });
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending cancellation email");
    try {
        await (0, emails_1.sendInvestmentEmail)(userPk, investment.plan, investment.duration, investment, "InvestmentCanceled", ctx);
    }
    catch (error) {
        console_1.logger.error("INVESTMENT", "Error sending investment email", error);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Investment ${id} cancelled successfully for user ${user.id}`);
    return {
        message: "Investment cancelled and the principal returned to your wallet",
    };
};
