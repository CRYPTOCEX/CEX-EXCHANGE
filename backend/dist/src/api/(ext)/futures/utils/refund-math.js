"use strict";
const SCALE = 10n ** 18n;
exports.refundForOrder = function (order) {
    const amount = BigInt(String(order.amount));
    const remaining = BigInt(String(order.remaining));
    const filled = BigInt(String(order.filled));
    const cost = BigInt(String(order.cost));
    const fee = BigInt(String(order.fee));
    if (amount <= 0n || remaining < 0n || filled < 0n || remaining + filled !== amount || cost < 0n || fee < 0n) throw new Error("Inconsistent futures order accounting");
    // amount is leveraged; cost is the original unleveraged quote collateral.
    // Both sides were funded in the quote wallet. Only the unfilled proportion
    // is releasable; multiply before dividing and round down in native units.
    const raw = (cost + fee) * remaining / amount;
    const parts = String(order.symbol).split("/");
    if (parts.length !== 2 || !parts[1] || (order.feeCurrency && order.feeCurrency !== parts[1])) throw new Error("Unverified futures collateral currency");
    return { raw, amount: `${raw / SCALE}.${String(raw % SCALE).padStart(18, "0")}`, currency: parts[1] };
};
