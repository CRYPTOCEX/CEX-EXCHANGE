"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const emails_1 = require("@b/utils/emails");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const utils_1 = require("../wallet/utils");
const date_1 = require("@b/utils/date");
const wallet_1 = require("@b/services/wallet");
const cache_1 = require("@b/utils/cache");
const affiliate_1 = require("@b/utils/affiliate");
exports.metadata = {
    summary: "Creates a new investment",
    description: "Initiates a new investment based on the specified plan and amount. This process involves updating the user's wallet balance and creating transaction records.",
    operationId: "createInvestment",
    tags: ["Finance", "Investment"],
    logModule: "FINANCE",
    logTitle: "Create investment",
    parameters: [],
    requestBody: {
        description: "Data required to create a new investment",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        type: {
                            type: "string",
                            description: "The type of investment plan",
                            example: "general",
                        },
                        planId: {
                            type: "string",
                            description: "The unique identifier of the investment plan",
                            example: "1",
                        },
                        amount: {
                            type: "number",
                            description: "Investment amount",
                            example: 1000.0,
                        },
                        durationId: {
                            type: "string",
                            description: "The unique identifier of the investment duration",
                            example: "1",
                        },
                    },
                    required: ["type", "planId", "durationId", "amount"],
                },
            },
        },
    },
    responses: (0, query_1.createRecordResponses)("Investment"),
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const cacheManager = cache_1.CacheManager.getInstance();
    const investmentStatus = (await cacheManager.getSetting("investment")) === "true";
    if (!investmentStatus) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Investment feature is currently disabled",
        });
    }
    const { type, planId, amount, durationId } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching user account");
    const userPk = await db_1.models.user.findByPk(user.id);
    if (!userPk) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User account not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating investment type");
    if (!type || typeof type !== "string") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Invalid investment type: ${type}`);
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid investment type" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Initializing ${type} investment models`);
    let model, planModel, durationModel, trxType, mailType;
    switch (type.toLowerCase()) {
        case "general":
            model = db_1.models.investment;
            planModel = db_1.models.investmentPlan;
            durationModel = db_1.models.investmentDuration;
            trxType = "INVESTMENT";
            mailType = "NewInvestmentCreated";
            break;
        case "forex":
            model = db_1.models.forexInvestment;
            planModel = db_1.models.forexPlan;
            durationModel = db_1.models.forexDuration;
            trxType = "FOREX_INVESTMENT";
            mailType = "NewForexInvestmentCreated";
            break;
    }
    if (!model) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Invalid investment type: ${type}`);
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid investment type" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching investment plan");
    const plan = await planModel.findByPk(planId);
    if (!plan) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Investment plan not found: ${planId}`);
        throw (0, error_1.createError)({ statusCode: 404, message: "Investment plan not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching investment duration");
    const duration = await durationModel.findByPk(durationId);
    if (!duration) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Investment duration not found: ${durationId}`);
        throw (0, error_1.createError)({ statusCode: 404, message: "Investment duration not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching ${plan.currency} ${plan.walletType} wallet`);
    const wallet = await (0, utils_1.getWallet)(user.id, plan.walletType, plan.currency);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying wallet balance");
    if (wallet.balance < amount) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Insufficient balance: ${wallet.balance} < ${amount}`);
        throw (0, error_1.createError)({ statusCode: 400, message: "Insufficient balance" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating ROI");
    const roi = (plan.profitPercentage / 100) * amount;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating investment record and transaction");
    const newInvestment = await db_1.sequelize.transaction(async (transaction) => {
        const idempotencyKey = `investment_${user.id}_${planId}_${amount}`;
        const walletResult = await wallet_1.walletService.debit({
            idempotencyKey,
            userId: user.id,
            walletId: wallet.id,
            walletType: plan.walletType,
            currency: plan.currency,
            amount,
            operationType: "AI_INVESTMENT",
            description: `Investment in ${plan.name} plan for ${duration.duration} ${duration.timeframe}`,
            metadata: {
                planId,
                durationId,
                investmentType: type,
                roi,
            },
            transaction,
        });
        let newInvestment;
        try {
            newInvestment = await model.create({
                userId: user.id,
                planId,
                durationId: duration.id,
                walletId: wallet.id,
                amount,
                profit: roi,
                status: "ACTIVE",
                endDate: (0, date_1.getEndDate)(duration.duration, duration.timeframe),
            }, { transaction });
        }
        catch (error) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Already invested in this plan");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Already invested in this plan",
            });
        }
        return newInvestment;
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching investment details for email notification");
    const investmentForEmail = await model.findByPk(newInvestment.id, {
        include: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
            {
                model: planModel,
                as: "plan",
            },
            {
                model: durationModel,
                as: "duration",
            },
        ],
    });
    if (investmentForEmail) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending investment confirmation email");
        await (0, emails_1.sendInvestmentEmail)(userPk, plan, duration, investmentForEmail, mailType, ctx);
    }
    else {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to fetch investment for email");
        throw (0, error_1.createError)({ statusCode: 500, message: "Failed to fetch the newly created investment for email." });
    }
    try {
        await (0, affiliate_1.processRewards)(user.id, amount, "INVESTMENT", plan.currency, `INVESTMENT:investment:${newInvestment.id}`);
    }
    catch (affiliateError) {
        console.error("Failed to process affiliate rewards:", affiliateError);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${type} investment created: ${amount} ${plan.currency} for ${duration.duration} ${duration.timeframe}`);
    return {
        message: "Investment created successfully",
    };
};
