"use strict";
exports.calculateTerminalSettlement = ({ order, remote, feeRate, settledAtCreate }) => {
    const amount = Number(order.amount), filled = Number(remote.filled);
    const meta = typeof order.metadata === "string" ? JSON.parse(order.metadata) : (order.metadata || {});
    const buy = order.side === "BUY";
    if (!Number.isFinite(feeRate) || feeRate < 0 || feeRate >= 100) throw new Error("Invalid platform trading fee");
    let cost = remote.cost == null ? NaN : Number(remote.cost);
    if (filled === 0) cost = 0;
    if (filled > 0 && !(Number.isFinite(cost) && cost > 0)) {
        const average = Number(remote.average);
        if (!(Number.isFinite(average) && average > 0)) throw new Error("Filled order requires executed cost or average");
        cost = filled * average;
    }
    if (settledAtCreate > 0 && (!Number.isFinite(meta.costAtCreate) || !Number.isFinite(meta.feeAtCreate)))
        throw new Error("Historical partial fill lacks settled cost/fee evidence; reconciliation required");
    const priorCost = settledAtCreate > 0 ? meta.costAtCreate : 0;
    const priorFee = settledAtCreate > 0 ? meta.feeAtCreate : 0;
    const newFill = filled - settledAtCreate;
    const newCost = cost - priorCost;
    const chargedFee = Number(((buy ? filled : cost) * feeRate / 100).toFixed(8));
    const fee = chargedFee - priorFee;
    const reserved = meta.reservedInputAtCreate == null
        ? (buy ? (amount - settledAtCreate) * Number(order.price) : amount - settledAtCreate)
        : Number(meta.reservedInputAtCreate);
    const input = buy ? newCost : newFill;
    const output = buy ? newFill : newCost;
    if (![cost, newFill, newCost, fee, reserved, input, output].every(n => Number.isFinite(n) && n >= -1e-12))
        throw new Error("Inconsistent cumulative spot settlement values");
    if (input > reserved + 1e-12) throw new Error("Spot execution exceeds this order's recorded reservation");
    if (fee > output + 1e-12) throw new Error("Spot fee exceeds unsettled proceeds");
    return { filled, remaining: Math.max(amount-filled,0), cost, input: Math.max(input,0), output: Math.max(output-fee,0), fee: Math.max(fee,0), chargedFee, reserved, release: Math.max(reserved-input,0), newFill };
};
