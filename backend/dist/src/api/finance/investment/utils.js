"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseUserSchema = exports.baseInvestmentPlanSchema = exports.baseInvestmentSchema = void 0;
exports.findInvestmentById = findInvestmentById;
exports.deleteInvestments = deleteInvestments;
exports.checkInvestments = checkInvestments;
const db_1 = require("@b/db");
const schema_1 = require("@b/utils/schema");
const wallet_1 = require("@b/services/wallet");
const error_1 = require("@b/utils/error");
exports.baseInvestmentSchema = {
    id: (0, schema_1.baseStringSchema)("ID of the investment"),
    amount: (0, schema_1.baseNumberSchema)("Amount of the investment"),
    roi: (0, schema_1.baseNumberSchema)("Return on investment (ROI) of the investment"),
    duration: (0, schema_1.baseIntegerSchema)("Duration of the investment in days"),
    status: (0, schema_1.baseStringSchema)("Status of the investment"),
};
exports.baseInvestmentPlanSchema = {
    id: (0, schema_1.baseStringSchema)("ID of the investment plan"),
    name: (0, schema_1.baseStringSchema)("Name of the investment plan"),
    title: (0, schema_1.baseStringSchema)("Title of the investment plan"),
    image: (0, schema_1.baseStringSchema)("Image of the investment plan"),
    description: (0, schema_1.baseStringSchema)("Description of the investment plan"),
    currency: (0, schema_1.baseStringSchema)("Currency of the investment plan"),
    minAmount: (0, schema_1.baseNumberSchema)("Minimum amount required for the investment plan"),
    maxAmount: (0, schema_1.baseNumberSchema)("Maximum amount allowed for the investment plan"),
    roi: (0, schema_1.baseNumberSchema)("Return on investment (ROI) of the investment plan"),
    duration: (0, schema_1.baseIntegerSchema)("Duration of the investment plan in days"),
    status: (0, schema_1.baseBooleanSchema)("Status of the investment plan"),
};
exports.baseUserSchema = {
    id: (0, schema_1.baseStringSchema)("ID of the user"),
    firstName: (0, schema_1.baseStringSchema)("First name of the user"),
    lastName: (0, schema_1.baseStringSchema)("Last name of the user"),
    avatar: (0, schema_1.baseStringSchema)("Avatar of the user"),
};
const INVESTMENT_NOT_FOUND = "Investment not found";
async function findInvestmentById(id) {
    const investment = await db_1.models.investment.findOne({
        where: { id },
        include: [
            {
                model: db_1.models.investmentPlan,
                as: "plan",
            },
            {
                model: db_1.models.wallet,
                as: "wallet",
            },
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
        ],
    });
    if (!investment)
        throw (0, error_1.createError)({ statusCode: 404, message: INVESTMENT_NOT_FOUND });
    return investment.get({ plain: true });
}
async function deleteInvestments(ids) {
    await db_1.models.investment.destroy({
        where: {
            id: ids,
        },
    });
}
async function checkInvestments() {
    const investments = await db_1.models.investment.findAll({
        where: { status: "ACTIVE" },
        include: [
            {
                model: db_1.models.investmentPlan,
                as: "plan",
            },
            {
                model: db_1.models.investmentDuration,
                as: "duration",
            },
        ],
    });
    for (const investment of investments) {
        if (!investment.createdAt)
            continue;
        if (!investment.duration || !investment.plan)
            continue;
        let duration = 0;
        switch (investment.duration.timeframe) {
            case "HOUR":
                duration = investment.duration.duration * 60 * 60 * 1000;
                break;
            case "DAY":
                duration = investment.duration.duration * 24 * 60 * 60 * 1000;
                break;
            case "WEEK":
                duration = investment.duration.duration * 7 * 24 * 60 * 60 * 1000;
                break;
            case "MONTH":
                duration = investment.duration.duration * 30 * 24 * 60 * 60 * 1000;
                break;
        }
        const endDate = new Date(investment.createdAt.getTime() + duration);
        const currentDate = new Date();
        if (currentDate.getTime() < endDate.getTime())
            continue;
        try {
            const wallet = await db_1.models.wallet.findOne({
                where: {
                    userId: investment.userId,
                    currency: investment.plan.currency,
                    type: investment.plan.walletType,
                },
            });
            if (!wallet) {
                console.error(`Wallet not found for investment ${investment.id}`);
                continue;
            }
            if (investment.profit) {
                const profit = investment.amount * (investment.profit / 100);
                const roi = investment.amount + profit;
                const idempotencyKey = `investment_roi_${investment.id}`;
                await wallet_1.walletService.credit({
                    idempotencyKey,
                    userId: investment.userId,
                    walletId: wallet.id,
                    walletType: investment.plan.walletType,
                    currency: investment.plan.currency,
                    amount: roi,
                    operationType: "AI_INVESTMENT_ROI",
                    description: `Investment ROI: Plan "${investment.plan.title}" | Duration: ${investment.duration.duration} ${investment.duration.timeframe}`,
                    metadata: {
                        investmentId: investment.id,
                        planId: investment.plan.id,
                        originalAmount: investment.amount,
                        profitPercentage: investment.profit,
                        profitAmount: profit,
                    },
                });
                await investment.update({ status: "COMPLETED" });
            }
        }
        catch (error) {
            console.error(`Failed to process investment ${investment.id}: ${error.message}`);
        }
    }
}
