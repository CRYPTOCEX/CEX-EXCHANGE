"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTVL = calculateTVL;
exports.calculateTVLWithBreakdown = calculateTVLWithBreakdown;
exports.calculatePnLFromTVL = calculatePnLFromTVL;
const console_1 = require("@b/utils/console");
function calculateTVL(input) {
    const base = parseFloat(String(input.baseBalance)) || 0;
    const quote = parseFloat(String(input.quoteBalance)) || 0;
    const price = parseFloat(String(input.currentPrice)) || 0;
    if (base < 0 || quote < 0) {
        console_1.logger.warn("AI_MM", "Negative balance detected, using absolute values");
    }
    const absBase = Math.abs(base);
    const absQuote = Math.abs(quote);
    if (price <= 0) {
        console_1.logger.warn("AI_MM", "Invalid or zero price, returning sum of balances");
        return absBase + absQuote;
    }
    return absBase * price + absQuote;
}
function calculateTVLWithBreakdown(input) {
    const base = parseFloat(String(input.baseBalance)) || 0;
    const quote = parseFloat(String(input.quoteBalance)) || 0;
    const price = parseFloat(String(input.currentPrice)) || 0;
    const absBase = Math.abs(base);
    const absQuote = Math.abs(quote);
    const baseValue = price > 0 ? absBase * price : absBase;
    const quoteValue = absQuote;
    return {
        tvl: baseValue + quoteValue,
        baseValue,
        quoteValue,
        baseBalance: absBase,
        quoteBalance: absQuote,
    };
}
function calculatePnLFromTVL(initialBase, initialQuote, currentBase, currentQuote, initialPrice, currentPrice) {
    const initialTVL = calculateTVL({
        baseBalance: initialBase,
        quoteBalance: initialQuote,
        currentPrice: initialPrice,
    });
    const currentTVL = calculateTVL({
        baseBalance: currentBase,
        quoteBalance: currentQuote,
        currentPrice: currentPrice,
    });
    const absolutePnL = currentTVL - initialTVL;
    const percentageReturn = initialTVL > 0 ? (absolutePnL / initialTVL) * 100 : 0;
    return {
        initialTVL,
        currentTVL,
        absolutePnL,
        percentageReturn,
    };
}
exports.default = {
    calculateTVL,
    calculateTVLWithBreakdown,
    calculatePnLFromTVL,
};
