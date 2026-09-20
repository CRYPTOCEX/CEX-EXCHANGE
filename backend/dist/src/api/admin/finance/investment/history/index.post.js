"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const wallet_1 = require("@b/services/wallet");
const date_1 = require("@b/utils/date");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Stores a new Investment",
    operationId: "storeInvestment",
    tags: ["Admin", "Investments"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.investmentUpdateSchema,
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.investmentStoreSchema, "Investment"),
    requiresAuth: true,
    permission: "create.investment",
    logModule: "ADMIN_FIN",
    logTitle: "Create Investment History",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { userId, planId, durationId, amount, profit, result, status, endDate, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating investment data");
    if (status !== "ACTIVE") {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating historical investment record");
        const record = await (0, query_1.storeRecord)({
            model: "investment",
            data: { userId, planId, durationId, amount, profit, result, status, endDate },
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success();
        return record;
    }
    const principal = Number(amount);
    if (!Number.isFinite(principal) || principal <= 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "An active investment needs a positive amount to debit",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching the plan and duration");
    const plan = await db_1.models.investmentPlan.findByPk(planId);
    if (!plan) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Investment plan not found" });
    }
    const duration = durationId
        ? await db_1.models.investmentDuration.findByPk(durationId)
        : null;
    if (durationId && !duration) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Investment duration not found",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Locating the user's wallet");
    const wallet = await db_1.models.wallet.findOne({
        where: { userId, currency: plan.currency, type: plan.walletType },
    });
    if (!wallet) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `This user has no ${plan.currency} ${plan.walletType} wallet, so an active investment ` +
                `cannot be funded from it. Credit the wallet first, or record the investment with a ` +
                `settled status if you are backfilling history.`,
        });
    }
    if (Number(wallet.balance) < principal) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Insufficient balance: the user holds ${wallet.balance} ${plan.currency}, and this investment needs ${principal}`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating the investment and debiting the principal");
    await db_1.sequelize.transaction(async (transaction) => {
        const investment = await db_1.models.investment.create({
            userId,
            planId,
            durationId,
            amount: principal,
            profit: profit !== null && profit !== void 0 ? profit : (plan.profitPercentage / 100) * principal,
            result: result !== null && result !== void 0 ? result : null,
            status: "ACTIVE",
            endDate: endDate !== null && endDate !== void 0 ? endDate : (duration
                ? (0, date_1.getEndDate)(duration.duration, duration.timeframe)
                : undefined),
        }, { transaction });
        await wallet_1.walletService.debit({
            idempotencyKey: `investment_${investment.id}`,
            userId,
            walletId: wallet.id,
            walletType: plan.walletType,
            currency: plan.currency,
            amount: principal,
            operationType: "INVESTMENT",
            referenceId: investment.id,
            description: `Investment in ${plan.name} plan (opened by an administrator)`,
            metadata: {
                investmentId: investment.id,
                planId,
                durationId,
                investmentType: "general",
                adminAction: true,
            },
            transaction,
        });
        return investment;
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Opened a ${principal} ${plan.currency} investment in "${plan.name}" and debited the user's wallet`);
    return { message: "investment created successfully" };
};
