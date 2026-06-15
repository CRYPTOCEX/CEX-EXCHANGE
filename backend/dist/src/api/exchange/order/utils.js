"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseOrderSchema = void 0;
exports.updateOrderData = updateOrderData;
exports.adjustOrderData = adjustOrderData;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const precision_1 = require("@b/services/wallet/utils/precision");
async function updateOrderData(id, orderData) {
    var _a;
    const updateData = {
        status: orderData.status.toUpperCase(),
        filled: orderData.filled,
        remaining: orderData.remaining,
        cost: orderData.cost,
        fee: (_a = orderData.fee) === null || _a === void 0 ? void 0 : _a.cost,
        trades: orderData.trades,
        average: orderData.average,
    };
    const filteredUpdateData = Object.fromEntries(Object.entries(updateData).filter(([_, value]) => value !== undefined));
    await db_1.models.exchangeOrder.update(filteredUpdateData, {
        where: {
            id,
        },
    });
    const updatedOrder = await db_1.models.exchangeOrder.findOne({
        where: {
            id,
        },
    });
    if (!updatedOrder) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Order not found" });
    }
    return updatedOrder.get({ plain: true });
}
const schema_1 = require("@b/utils/schema");
exports.baseOrderSchema = {
    id: (0, schema_1.baseStringSchema)("Unique identifier for the order"),
    referenceId: (0, schema_1.baseStringSchema)("External reference ID for the order"),
    userId: (0, schema_1.baseStringSchema)("User ID associated with the order"),
    status: (0, schema_1.baseStringSchema)("Status of the order (e.g., pending, completed)"),
    symbol: (0, schema_1.baseStringSchema)("Trading symbol for the order"),
    type: (0, schema_1.baseStringSchema)("Type of order (e.g., market, limit)"),
    timeInForce: (0, schema_1.baseStringSchema)("Time in force policy for the order"),
    side: (0, schema_1.baseStringSchema)("Order side (buy or sell)"),
    price: (0, schema_1.baseNumberSchema)("Price per unit"),
    average: (0, schema_1.baseNumberSchema)("Average price per unit"),
    amount: (0, schema_1.baseNumberSchema)("Total amount ordered"),
    filled: (0, schema_1.baseNumberSchema)("Amount filled"),
    remaining: (0, schema_1.baseNumberSchema)("Amount remaining"),
    cost: (0, schema_1.baseNumberSchema)("Total cost"),
    trades: {
        type: "object",
        description: "Details of trades executed for this order",
        additionalProperties: true,
    },
    fee: (0, schema_1.baseNumberSchema)("Transaction fee"),
    feeCurrency: (0, schema_1.baseStringSchema)("Currency of the transaction fee"),
    createdAt: (0, schema_1.baseStringSchema)("Creation date of the order"),
    updatedAt: (0, schema_1.baseStringSchema)("Last update date of the order"),
};
function adjustOrderData(order, provider, feeRate) {
    var _a, _b;
    const side = order.side ? order.side.toUpperCase() : null;
    let amount = parseFloat(order.amount);
    let cost = parseFloat(order.cost);
    // Determine the fee currency for precision-aware rounding.
    // Prefer the exchange-reported fee currency, otherwise fall back to the
    // quote ("pair") currency derived from the order symbol (e.g. "BTC/USDT" -> "USDT").
    const pair = order.symbol && order.symbol.includes("/")
        ? order.symbol.split("/")[1]
        : order.symbol;
    const feeCurrency = ((_b = order.fee) === null || _b === void 0 ? void 0 : _b.currency) || pair;
    // BUG-014 fix: round fees with currency-aware precision instead of a hardcoded
    // toFixed(8). This is a PRECISION-ONLY change — the fee SOURCE control flow below
    // (XT recalc; else recalc from the platform's configured feeRate) is intentionally
    // preserved so the platform maker/taker fee continues to drive wallet accounting.
    const FEE_DECIMAL_PRECISION = 8;
    const roundFee = (value) => {
        if (typeof precision_1.roundToPrecision === "function" && feeCurrency) {
            return precision_1.roundToPrecision(value, feeCurrency);
        }
        return parseFloat(value.toFixed(FEE_DECIMAL_PRECISION));
    };
    let fee = parseFloat(((_a = order.fee) === null || _a === void 0 ? void 0 : _a.cost) || "0");
    if (provider === "xt") {
        const info = order.info;
        const avgPrice = parseFloat(info.avgPrice);
        const executedQty = parseFloat(info.executedQty);
        if (side === "BUY") {
            amount = executedQty / avgPrice;
        }
        else if (side === "SELL") {
            amount = executedQty;
        }
        cost = amount * avgPrice;
        // XT requires the fee recalculated from feeRate; round with currency-aware precision.
        const calculatedFee = amount * (feeRate / 100);
        fee = roundFee(calculatedFee);
    }
    else if (amount && feeRate) {
        fee = roundFee(amount * (feeRate / 100));
    }
    return {
        ...order,
        amount,
        cost,
        fee,
    };
}
