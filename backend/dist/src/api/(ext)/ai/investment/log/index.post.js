"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const emails_1 = require("@b/utils/emails");
const error_1 = require("@b/utils/error");
const notifications_1 = require("@b/utils/notifications");
const passwords_1 = require("@b/utils/passwords");
const wallet_1 = require("@b/services/wallet");
const affiliate_1 = require("@b/utils/affiliate");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Creates a new investment",
    description: "Creates a new AI trading investment for the currently authenticated user based on the provided details.",
    operationId: "createInvestment",
    tags: ["AI Trading"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        currency: {
                            type: "string",
                            description: "Currency of the investment",
                        },
                        pair: { type: "string", description: "Trading pair" },
                        planId: {
                            type: "string",
                            description: "Plan ID to be used for the investment",
                        },
                        durationId: {
                            type: "string",
                            description: "Duration ID for the investment",
                        },
                        amount: { type: "number", description: "Amount to be invested" },
                        type: { type: "string", description: "Type of wallet" },
                    },
                    required: ["planId", "durationId", "amount", "currency", "pair", "type"],
                },
            },
        },
    },
    responses: (0, query_1.createRecordResponses)("AI Investment"),
    logModule: "AI_INVEST",
    logTitle: "Create AI investment",
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching user details");
    const userPk = await db_1.models.user.findByPk(user.id);
    if (!userPk) {
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    const { planId, durationId, amount, currency, pair, type } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating investment plan");
    const plan = await db_1.models.aiInvestmentPlan.findByPk(planId);
    if (!plan) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Plan not found" });
    }
    if (!plan.status) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Plan is not active" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating investment duration");
    const duration = await db_1.models.aiInvestmentDuration.findByPk(durationId);
    if (!duration) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Duration not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating plan-duration association");
    const planDuration = await db_1.models.aiInvestmentPlanDuration.findOne({
        where: { planId, durationId },
    });
    if (!planDuration) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Duration not available for this plan",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying investment amount limits");
    if (plan.minAmount > amount || plan.maxAmount < amount) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Amount must be between ${plan.minAmount} and ${plan.maxAmount}`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing investment transaction");
    const investment = await db_1.sequelize.transaction(async (t) => {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Locating user wallet");
        const wallet = await db_1.models.wallet.findOne({
            where: {
                userId: user.id,
                currency: pair,
                type,
            },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!wallet) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying wallet balance");
        if (wallet.balance < amount) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Insufficient funds",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating investment record");
        const investmentId = (0, passwords_1.makeUuid)();
        const investment = await db_1.models.aiInvestment.create({
            id: investmentId,
            userId: user.id,
            planId,
            durationId,
            symbol: `${currency}/${pair}`,
            amount,
            status: "ACTIVE",
            type: type || "SPOT",
        }, { transaction: t });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Deducting investment amount from wallet via wallet service");
        const idempotencyKey = `investment_${investmentId}`;
        await wallet_1.walletService.debit({
            idempotencyKey,
            userId: user.id,
            walletId: wallet.id,
            walletType: type,
            currency: pair,
            amount,
            operationType: "AI_INVESTMENT",
            referenceId: investmentId,
            description: `AI Investment: Plan "${plan.title}" | Duration: ${duration.duration} ${duration.timeframe}`,
            metadata: {
                investmentId,
                planId,
                durationId,
                symbol: `${currency}/${pair}`,
            },
            transaction: t,
        });
        return investment;
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending confirmation email");
    try {
        await (0, emails_1.sendAiInvestmentEmail)(userPk, plan, duration, investment, "NewAiInvestmentCreated", ctx);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating notification");
        await (0, notifications_1.createNotification)({
            userId: user.id,
            relatedId: investment.id,
            title: "AI Investment Created",
            message: `Your AI investment for ${investment.symbol} has been created successfully.`,
            type: "investment",
            link: `/ai/investment/${investment.id}`,
            actions: [
                {
                    label: "View Investment",
                    link: `/ai/investment/${investment.id}`,
                    primary: true,
                },
            ],
        });
    }
    catch (error) {
        console.error("Failed to send email or create notification", error);
    }
    try {
        await (0, affiliate_1.processRewards)(user.id, amount, "AI_INVESTMENT", pair, `AI_INVESTMENT:ai_investment_log:${investment.id}`);
    }
    catch (affiliateError) {
        console.error("Failed to process affiliate rewards:", affiliateError);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Invested ${amount} ${pair} in plan "${plan.title}" for ${duration.duration} ${duration.timeframe}`);
    return { message: "Investment created successfully" };
};
