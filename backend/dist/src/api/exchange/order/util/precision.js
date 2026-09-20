"use strict";
const { createError } = require("@b/utils/error");
exports.prepareSpotOrder = function (exchange, symbol, amount, price, limits = {}) {
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(price) || price <= 0)
        throw createError(400, "Order amount and price must be finite positive numbers");
    // CCXT precision may describe ticks or significant digits, not decimal places.
    const formattedAmount = Number(exchange.amountToPrecision(symbol, amount));
    const formattedPrice = Number(exchange.priceToPrecision(symbol, price));
    const cost = formattedAmount * formattedPrice;
    if (![formattedAmount, formattedPrice, cost].every(n => Number.isFinite(n) && n > 0))
        throw createError(400, "Order is below the exchange precision or exceeds the supported range");
    for (const [name, value] of [["amount", formattedAmount], ["price", formattedPrice], ["cost", cost]]) {
        const range = limits[name] || {};
        if (Number(range.min) > 0 && value < Number(range.min))
            throw createError(400, `Order ${name} is below the minimum ${range.min}`);
        if (Number(range.max) > 0 && value > Number(range.max))
            throw createError(400, `Order ${name} exceeds the maximum ${range.max}`);
    }
    return { formattedAmount, formattedPrice, cost };
};
