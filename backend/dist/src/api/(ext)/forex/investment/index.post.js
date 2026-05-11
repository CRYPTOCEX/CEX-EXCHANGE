"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const emails_1 = require("@b/utils/emails");
const error_1 = require("@b/utils/error");
const notifications_1 = require("@b/utils/notifications");
const console_1 = require("@b/utils/console");
const forex_fraud_detector_1 = require("@b/api/(ext)/forex/utils/forex-fraud-detector");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Creates a new Forex investment",
    description: "Allows a user to initiate a new Forex investment.",
    operationId: "createForexInvestment",
    tags: ["Forex", "Investments"],
    requiresAuth: true,
    rateLimit: {
        windowMs: 3600000,
        max: 10
    },
    logModule: "FOREX",
    logTitle: "Create forex investment",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        planId: { type: "string", description: "Forex plan ID" },
                        durationId: {
                            type: "string",
                            description: "Investment duration ID",
                        },
                        amount: { type: "number", description: "Amount to invest" },
                        acceptTerms: {
                            type: "boolean",
                            description: "User must accept investment terms"
                        },
                    },
                    required: ["planId", "durationId", "amount", "acceptTerms"],
                },
            },
        },
    },
    responses: {
        201: {
            description: "Forex investment created successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            id: { type: "string", description: "Forex investment ID" },
                            userId: { type: "string", description: "User ID" },
                            planId: { type: "string", description: "Forex plan ID" },
                            durationId: {
                                type: "string",
                                description: "Investment duration ID",
                            },
                            amount: { type: "number", description: "Investment amount" },
                            profit: { type: "number", description: "Investment profit" },
                            result: {
                                type: "string",
                                description: "Investment result (WIN, LOSS, or DRAW)",
                            },
                            status: {
                                type: "string",
                                description: "Investment status (ACTIVE, COMPLETED, CANCELLED, or REJECTED)",
                            },
                            endDate: { type: "string", description: "Investment end date" },
                            createdAt: {
                                type: "string",
                                description: "Investment creation timestamp",
                            },
                            updatedAt: {
                                type: "string",
                                description: "Investment update timestamp",
                            },
                        },
                        required: [
                            "id",
                            "userId",
                            "planId",
                            "durationId",
                            "amount",
                            "status",
                            "endDate",
                        ],
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Forex Investment"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, body, req, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { planId, durationId, amount, acceptTerms } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating investment parameters");
        if (!acceptTerms) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "You must accept the investment terms and conditions to proceed",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying user account");
        const userPk = await db_1.models.user.findByPk(user.id);
        if (!userPk) {
            throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching investment plan details");
        const plan = await db_1.models.forexPlan.findByPk(planId);
        if (!plan) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Plan not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating investment amount");
        if ((plan.minAmount && amount < plan.minAmount) ||
            (plan.maxAmount && amount > plan.maxAmount)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Amount must be between ${plan.minAmount || 0} and ${plan.maxAmount || 'unlimited'}`
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching investment duration");
        const duration = await db_1.models.forexDuration.findByPk(durationId);
        if (!duration) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Duration not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Running fraud detection checks");
        const fraudCheck = await forex_fraud_detector_1.ForexFraudDetector.checkInvestment(user.id, amount, planId, ctx);
        if (!fraudCheck.isValid) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: fraudCheck.reason || "Investment flagged for security review"
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating investment end date");
        const endDate = new Date();
        switch (duration.timeframe) {
            case "HOUR":
                endDate.setHours(endDate.getHours() + duration.duration);
                break;
            case "DAY":
                endDate.setDate(endDate.getDate() + duration.duration);
                break;
            case "WEEK":
                endDate.setDate(endDate.getDate() + 7 * duration.duration);
                break;
            case "MONTH":
                endDate.setDate(endDate.getDate() + 30 * duration.duration);
                break;
            default:
                throw (0, error_1.createError)({ statusCode: 400, message: "Invalid timeframe" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating investment record and deducting from account");
        const investment = await db_1.sequelize.transaction(async (t) => {
            var _a;
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking forex account balance (with row lock)");
            const account = await db_1.models.forexAccount.findOne({
                where: { userId: user.id, type: "LIVE" },
                lock: t.LOCK.UPDATE,
                transaction: t,
            });
            if (!account) {
                throw (0, error_1.createError)({ statusCode: 404, message: "Live account not found" });
            }
            const currentBalance = (_a = account.balance) !== null && _a !== void 0 ? _a : 0;
            if (currentBalance < amount) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Insufficient balance in your account. Available: ${currentBalance}, Required: ${amount}`
                });
            }
            const newBalance = currentBalance - amount;
            const investment = await db_1.models.forexInvestment.create({
                userId: user.id,
                planId: planId,
                durationId: durationId,
                amount: amount,
                status: "ACTIVE",
                endDate: endDate,
                termsAcceptedAt: new Date(),
                termsVersion: "1.0",
            }, { transaction: t });
            await db_1.models.forexAccount.update({
                balance: newBalance,
            }, {
                where: { id: account.id },
                transaction: t,
            });
            console_1.logger.info("FOREX_INVESTMENT", `User ${user.id} created forex investment ${investment.id} with plan ${planId}. Amount: ${amount} ${plan.currency}, Duration: ${duration.duration} ${duration.timeframe}, ROI: ${plan.profitPercentage}`);
            return investment;
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending email and notification");
        try {
            await (0, emails_1.sendInvestmentEmail)(userPk, plan, duration, investment, "NewForexInvestmentCreated", ctx);
            await (0, notifications_1.createNotification)({
                userId: user.id,
                relatedId: investment.id,
                title: "New Forex Investment",
                message: "You have successfully created a new Forex investment.",
                type: "investment",
                link: `/forex/investment/${investment.id}`,
                actions: [
                    {
                        label: "View Investment",
                        link: `/forex/investment/${investment.id}`,
                        primary: true,
                    },
                ],
            });
        }
        catch (emailError) {
            console.error("Error sending investment email:", emailError);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Created forex investment in ${plan.name} for ${amount} ${plan.currency} (${duration.duration} ${duration.timeframe})`);
        return investment;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Failed to create forex investment");
        console_1.logger.error("FOREX_INVESTMENT_ERROR", `Forex investment creation failed for user ${user.id}, plan ${planId}: ${error.message}. Details: planId=${planId}, durationId=${durationId}, amount=${amount}`, error);
        if (error.statusCode) {
            throw error;
        }
        console.error("Error creating forex investment:", error);
        throw (0, error_1.createError)({ statusCode: 500, message: "Internal Server Error" });
    }
};
