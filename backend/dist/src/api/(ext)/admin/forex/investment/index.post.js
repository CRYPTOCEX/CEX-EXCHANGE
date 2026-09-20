"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const denomination_1 = require("@b/api/(ext)/forex/account/denomination");
exports.metadata = {
    summary: "Creates a new Forex investment",
    description: "Creates a new Forex investment for a user with specified plan, duration, amount, and expected profit. The investment status can be ACTIVE, COMPLETED, CANCELLED, or REJECTED.",
    operationId: "createForexInvestment",
    tags: ["Admin", "Forex", "Investment"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.forexInvestmentUpdateSchema,
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.forexInvestmentStoreSchema, "Forex Investment"),
    requiresAuth: true,
    permission: "create.forex.investment",
    logModule: "ADMIN_FOREX",
    logTitle: "Create forex investment",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { userId, planId, durationId, amount, profit, result, status, endDate, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating forex investment data");
    const investAmount = Number(amount);
    if (!Number.isFinite(investAmount) || investAmount <= 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Amount must be a positive number",
        });
    }
    const plan = await db_1.models.forexPlan.findByPk(planId);
    if (!plan)
        throw (0, error_1.createError)({ statusCode: 404, message: "Plan not found" });
    const duration = await db_1.models.forexDuration.findByPk(durationId);
    if (!duration)
        throw (0, error_1.createError)({ statusCode: 404, message: "Duration not found" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Collecting the principal from the user's forex account");
    const investmentResult = await db_1.sequelize.transaction(async (t) => {
        var _a;
        const account = await db_1.models.forexAccount.findOne({
            where: { userId, type: "LIVE" },
            order: [["createdAt", "ASC"]],
            lock: t.LOCK.UPDATE,
            transaction: t,
        });
        if (!account) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "That user has no LIVE forex account to fund the investment from",
            });
        }
        const bound = (0, denomination_1.accountDenomination)(account);
        if (bound && (bound.currency !== plan.currency || bound.walletType !== plan.walletType)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `The plan settles in ${plan.walletType} ${plan.currency} but that user's forex account holds ` +
                    `${bound.walletType} ${bound.currency}.`,
            });
        }
        const balance = Number((_a = account.balance) !== null && _a !== void 0 ? _a : 0);
        if (balance < investAmount) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `That user's forex account holds ${balance}, which is less than the ${investAmount} principal.`,
            });
        }
        await db_1.models.forexAccount.update({ balance: balance - investAmount }, { where: { id: account.id }, transaction: t });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating forex investment");
        return await db_1.models.forexInvestment.create({
            userId,
            planId,
            durationId,
            amount: investAmount,
            profit,
            result,
            status: status !== null && status !== void 0 ? status : "ACTIVE",
            endDate,
        }, { transaction: t });
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Forex investment created successfully");
    return {
        ...investmentResult.get({ plain: true }),
        message: `Forex Investment created successfully; ${investAmount} taken from the user's forex account.`,
    };
};
