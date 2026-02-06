"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const emails_1 = require("@b/utils/emails");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const utils_1 = require("../../wallet/utils");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
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
    let investment, model, planModel, durationModel;
    switch (type.toLowerCase()) {
        case "general":
            model = db_1.models.investment;
            planModel = db_1.models.investmentPlan;
            durationModel = db_1.models.investmentDuration;
            break;
        case "forex":
            model = db_1.models.forexInvestment;
            planModel = db_1.models.forexPlan;
            durationModel = db_1.models.forexDuration;
            break;
    }
    const userPk = await db_1.models.user.findByPk(user.id);
    if (!userPk) {
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing investment cancellation");
    await db_1.sequelize.transaction(async (transaction) => {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding investment");
        investment = await model.findOne({
            where: { id },
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
        });
        if (!investment)
            throw (0, error_1.createError)({ statusCode: 404, message: "Investment not found" });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding wallet");
        const wallet = await (0, utils_1.getWallet)(user.id, investment.plan.walletType, investment.plan.currency);
        if (!wallet) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
        }
        const existingTransaction = await db_1.models.transaction.findOne({
            where: { referenceId: id },
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Refunding investment amount via wallet service");
        const idempotencyKey = `investment_cancel_${id}`;
        await wallet_1.walletService.credit({
            idempotencyKey,
            userId: user.id,
            walletId: wallet.id,
            walletType: investment.plan.walletType,
            currency: investment.plan.currency,
            amount: investment.amount,
            operationType: "REFUND",
            referenceId: id,
            description: `Investment cancelled - refund ${investment.amount} ${investment.plan.currency}`,
            metadata: {
                investmentId: id,
                planId: investment.plan.id,
                planName: investment.plan.name,
            },
            transaction,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting investment");
        await investment.destroy({
            force: true,
            transaction,
        });
        if (existingTransaction) {
            await existingTransaction.destroy({
                force: true,
                transaction,
            });
        }
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending cancellation email");
    try {
        await (0, emails_1.sendInvestmentEmail)(userPk, investment.plan, investment.duration, investment, "InvestmentCanceled", ctx);
    }
    catch (error) {
        console_1.logger.error("INVESTMENT", "Error sending investment email", error);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Investment ${id} cancelled successfully for user ${user.id}`);
};
