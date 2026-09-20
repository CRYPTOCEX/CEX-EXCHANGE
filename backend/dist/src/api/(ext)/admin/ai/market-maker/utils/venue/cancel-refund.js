"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelRefund = cancelRefund;
function amountOf(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
}
function cancelRefund(facts) {
    const none = { share: 0, refund: 0, feeRefund: 0, originalFee: 0 };
    const amount = amountOf(facts.amount);
    const remaining = amountOf(facts.remaining);
    const cost = amountOf(facts.cost);
    const fee = amountOf(facts.fee);
    if (remaining <= 0)
        return none;
    if (amount <= 0)
        return none;
    const share = Math.min(1, remaining / amount);
    const feeRefund = fee * share;
    const refund = cost * share + feeRefund;
    if (!(refund > 0))
        return none;
    return { share, refund, feeRefund, originalFee: fee };
}
