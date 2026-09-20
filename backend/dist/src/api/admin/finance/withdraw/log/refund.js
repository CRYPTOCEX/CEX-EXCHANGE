"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeWithdrawalRefund = computeWithdrawalRefund;
function readMetadata(raw) {
    if (!raw)
        return {};
    if (typeof raw === "object")
        return raw;
    if (typeof raw !== "string")
        return {};
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
    }
    catch (_a) {
        return {};
    }
}
function computeWithdrawalRefund(row) {
    var _a, _b;
    const amount = Number(row === null || row === void 0 ? void 0 : row.amount);
    if (!Number.isFinite(amount) || amount < 0) {
        return {
            ok: false,
            reason: `Cannot refund: transaction amount is invalid (${String(row === null || row === void 0 ? void 0 : row.amount)}). ` +
                `Enter a valid amount before rejecting.`,
        };
    }
    const rawFee = (_a = row === null || row === void 0 ? void 0 : row.fee) !== null && _a !== void 0 ? _a : 0;
    const fee = Number(rawFee);
    if (!Number.isFinite(fee) || fee < 0) {
        return {
            ok: false,
            reason: `Cannot refund: transaction fee is invalid (${String(row === null || row === void 0 ? void 0 : row.fee)}). ` +
                `Enter a valid fee before rejecting.`,
        };
    }
    let refund = amount + fee;
    const metadata = readMetadata(row === null || row === void 0 ? void 0 : row.metadata);
    const debit = Number((_b = metadata === null || metadata === void 0 ? void 0 : metadata.totalDebit) !== null && _b !== void 0 ? _b : metadata === null || metadata === void 0 ? void 0 : metadata.totalAmount);
    const originalDebit = Number.isFinite(debit) && debit > 0 ? debit : null;
    let capped = false;
    if (originalDebit !== null && refund > originalDebit) {
        refund = originalDebit;
        capped = true;
    }
    return { ok: true, refund, originalDebit, capped };
}
