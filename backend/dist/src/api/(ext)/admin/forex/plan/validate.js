"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePlanNumbers = validatePlanNumbers;
const error_1 = require("@b/utils/error");
function asNumber(value) {
    if (value === null || value === undefined || value === "")
        return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}
function validatePlanNumbers(plan) {
    const minAmount = asNumber(plan.minAmount);
    const maxAmount = asNumber(plan.maxAmount);
    const minProfit = asNumber(plan.minProfit);
    const maxProfit = asNumber(plan.maxProfit);
    const profitPercentage = asNumber(plan.profitPercentage);
    const defaultProfit = asNumber(plan.defaultProfit);
    const negative = Object.entries({
        minAmount,
        maxAmount,
        minProfit,
        maxProfit,
        profitPercentage,
        defaultProfit,
    }).find(([, v]) => v !== null && v < 0);
    if (negative) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `${negative[0]} cannot be negative.`,
        });
    }
    if (minAmount !== null && maxAmount !== null && maxAmount < minAmount) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `The maximum amount (${maxAmount}) is below the minimum (${minAmount}), ` +
                `so no investment could ever satisfy both.`,
        });
    }
    if (minProfit !== null && maxProfit !== null && maxProfit < minProfit) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `The maximum profit (${maxProfit}) is below the minimum (${minProfit}).`,
        });
    }
    if (profitPercentage !== null &&
        minProfit !== null &&
        maxProfit !== null &&
        (profitPercentage < minProfit || profitPercentage > maxProfit)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `The profit percentage (${profitPercentage}%) sits outside the plan's own ` +
                `advertised range of ${minProfit}–${maxProfit}%. Investors are paid the ` +
                `profit percentage, so the two must agree.`,
        });
    }
}
