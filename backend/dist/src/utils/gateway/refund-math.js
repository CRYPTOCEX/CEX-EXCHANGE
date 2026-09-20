"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REFUND_TOLERANCE = void 0;
exports.sumCompletedRefunds = sumCompletedRefunds;
exports.planRefund = planRefund;
exports.REFUND_TOLERANCE = 0.00000001;
function normalize(value) {
    return Math.round(value * 100000000) / 100000000;
}
function toNumber(value) {
    if (typeof value === "number")
        return value;
    const parsed = parseFloat(String(value !== null && value !== void 0 ? value : ""));
    return Number.isFinite(parsed) ? parsed : NaN;
}
function sumCompletedRefunds(refunds) {
    let total = 0;
    for (const refund of refunds !== null && refunds !== void 0 ? refunds : []) {
        const amount = toNumber(refund === null || refund === void 0 ? void 0 : refund.amount);
        if (Number.isFinite(amount))
            total += amount;
    }
    return normalize(total);
}
function planRefund(input) {
    const paymentAmount = toNumber(input.paymentAmount);
    const feeAmount = toNumber(input.paymentFeeAmount);
    const alreadyRefunded = toNumber(input.alreadyRefunded);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
        return { ok: false, message: "Payment amount is not a refundable figure" };
    }
    if (!Number.isFinite(alreadyRefunded) || alreadyRefunded < 0) {
        return { ok: false, message: "Refunded total for this payment is unreadable" };
    }
    const remainingRefundable = normalize(paymentAmount - alreadyRefunded);
    if (remainingRefundable <= exports.REFUND_TOLERANCE) {
        return {
            ok: false,
            message: "Payment has already been refunded in full",
        };
    }
    const requested = input.requestedAmount === undefined || input.requestedAmount === null
        ? remainingRefundable
        : toNumber(input.requestedAmount);
    if (!Number.isFinite(requested) || requested <= 0) {
        return { ok: false, message: "Refund amount must be a positive number" };
    }
    if (requested > remainingRefundable + exports.REFUND_TOLERANCE) {
        return {
            ok: false,
            message: `Refund amount ${requested} exceeds remaining refundable amount ${remainingRefundable}`,
        };
    }
    const refundAmount = normalize(Math.min(requested, remainingRefundable));
    const proportionalFee = normalize(refundAmount * (feeAmount / paymentAmount));
    const newTotalRefunded = alreadyRefunded + refundAmount;
    return {
        ok: true,
        refundAmount,
        remainingRefundable,
        proportionalFee,
        newStatus: newTotalRefunded >= paymentAmount - exports.REFUND_TOLERANCE
            ? "REFUNDED"
            : "PARTIALLY_REFUNDED",
    };
}
