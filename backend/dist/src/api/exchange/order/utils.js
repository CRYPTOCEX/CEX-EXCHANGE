"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseOrderSchema = void 0;
exports.readVenueFee = readVenueFee;
exports.metadataObject = metadataObject;
exports.updateOrderData = updateOrderData;
exports.adjustOrderData = adjustOrderData;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
function readVenueFee(orderData) {
    var _a, _b;
    const cost = Number((_a = orderData === null || orderData === void 0 ? void 0 : orderData.fee) === null || _a === void 0 ? void 0 : _a.cost);
    if (!(Number.isFinite(cost) && cost > 0))
        return undefined;
    const currency = (_b = orderData.fee) === null || _b === void 0 ? void 0 : _b.currency;
    return { cost, currency: typeof currency === "string" && currency ? currency : null };
}
function metadataObject(raw) {
    if (raw && typeof raw === "object")
        return raw;
    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? parsed : {};
        }
        catch (_a) {
            return {};
        }
    }
    return {};
}
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
function resolveUnitPrice(order, amount, cost) {
    for (const candidate of [order.average, order.price]) {
        const value = Number(candidate);
        if (Number.isFinite(value) && value > 0)
            return value;
    }
    if (Number.isFinite(cost) && cost > 0 && amount > 0)
        return cost / amount;
    return 0;
}
function adjustOrderData(order, provider, feeRate) {
    var _a;
    const side = order.side ? order.side.toUpperCase() : null;
    let amount = parseFloat(order.amount);
    let cost = parseFloat(order.cost);
    // Venue fees may use another currency; never use them as the platform fee.
    let fee = 0;
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
    }
    if (amount && feeRate) {
        const feeBase = side === "SELL"
            ? amount * resolveUnitPrice(order, amount, cost)
            : amount;
        fee = parseFloat((feeBase * (feeRate / 100)).toFixed(8));
    }
    return {
        ...order,
        amount,
        cost,
        fee,
    };
}
