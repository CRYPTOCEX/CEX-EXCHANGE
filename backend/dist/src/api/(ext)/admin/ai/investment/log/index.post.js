"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const wallet_1 = require("@b/services/wallet");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Stores a new AI Investment",
    operationId: "storeAIInvestment",
    tags: ["Admin", "AI Investments"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.aiInvestmentUpdateSchema,
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.aiInvestmentStoreSchema, "AI Investment"),
    requiresAuth: true,
    permission: "create.ai.investment",
    logModule: "ADMIN_AI",
    logTitle: "Create AI investment",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { userId, planId, durationId, symbol, type, amount, profit, result, status, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating investment data");
    if (typeof symbol !== "string" || !/^[A-Za-z0-9._-]{1,32}\/[A-Za-z0-9._-]{1,32}$/.test(symbol)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid symbol: expected a BASE/QUOTE pair of plain asset codes",
        });
    }
    const walletType = type === "ECO" ? "ECO" : "SPOT";
    if (status !== "ACTIVE") {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating historical AI investment record");
        const record = await (0, query_1.storeRecord)({
            model: "aiInvestment",
            data: {
                userId,
                planId,
                durationId,
                symbol,
                type: walletType,
                amount,
                profit,
                result,
                status,
            },
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Investment recorded successfully");
        return record;
    }
    const principal = Number(amount);
    if (!Number.isFinite(principal) || principal <= 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "An active investment needs a positive amount to debit",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating the plan");
    const plan = await db_1.models.aiInvestmentPlan.findByPk(planId);
    if (!plan) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Plan not found" });
    }
    const currency = symbol.split("/")[1];
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Locating the user's wallet");
    const wallet = await db_1.models.wallet.findOne({
        where: { userId, currency, type: walletType },
    });
    if (!wallet) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `This user has no ${currency} ${walletType} wallet, so an active investment cannot be ` +
                `funded from it. Credit the wallet first, or record the investment with a settled ` +
                `status if you are backfilling history.`,
        });
    }
    if (Number(wallet.balance) < principal) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Insufficient balance: the user holds ${wallet.balance} ${currency}, and this investment needs ${principal}`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating the investment and debiting the principal");
    await db_1.sequelize.transaction(async (transaction) => {
        var _a, _b, _c;
        const investment = await db_1.models.aiInvestment.create({
            userId,
            planId,
            durationId: durationId !== null && durationId !== void 0 ? durationId : null,
            symbol,
            type: walletType,
            amount: principal,
            status: "ACTIVE",
            roiPercentage: (_b = (_a = plan.profitPercentage) !== null && _a !== void 0 ? _a : plan.defaultProfit) !== null && _b !== void 0 ? _b : 0,
            result: ((_c = result !== null && result !== void 0 ? result : plan.defaultResult) !== null && _c !== void 0 ? _c : "DRAW"),
            ...(profit != null ? { profit } : {}),
        }, { transaction });
        await wallet_1.walletService.debit({
            idempotencyKey: `investment_${investment.id}`,
            userId,
            walletId: wallet.id,
            walletType: walletType,
            currency,
            amount: principal,
            operationType: "AI_INVESTMENT",
            referenceId: investment.id,
            description: `AI Investment: Plan "${plan.title}" (opened by an administrator)`,
            metadata: {
                investmentId: investment.id,
                planId,
                durationId,
                symbol,
                adminAction: true,
            },
            transaction,
        });
        return investment;
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Opened a ${principal} ${currency} AI investment in "${plan.title}" and debited the user's wallet`);
    return { message: "aiInvestment created successfully" };
};
