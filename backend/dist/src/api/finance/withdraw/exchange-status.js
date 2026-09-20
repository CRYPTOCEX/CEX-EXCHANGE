"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeExchangeWithdrawStatus = normalizeExchangeWithdrawStatus;
exports.isTerminalFailure = isTerminalFailure;
exports.splitChainFee = splitChainFee;
exports.requestedWithdrawAmount = requestedWithdrawAmount;
exports.refundableDebit = refundableDebit;
exports.isIndeterminateExchangeError = isIndeterminateExchangeError;
function normalizeExchangeWithdrawStatus(ccxtStatus) {
    const status = typeof ccxtStatus === "string" ? ccxtStatus.trim().toLowerCase() : "";
    switch (status) {
        case "ok":
        case "completed":
        case "success":
            return "COMPLETED";
        case "canceled":
        case "cancelled":
        case "cancel":
            return "CANCELLED";
        case "failed":
        case "fail":
        case "rejected":
            return "FAILED";
        default:
            return "PROCESSING";
    }
}
function isTerminalFailure(status) {
    return status === "FAILED" || status === "CANCELLED";
}
function roundTo(value, precision) {
    const digits = Number.isFinite(precision)
        ? Math.min(Math.max(Math.trunc(precision), 0), 18)
        : 8;
    return parseFloat(value.toFixed(digits));
}
function finiteOrZero(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
}
function splitChainFee(input) {
    var _a;
    const amount = finiteOrZero(input.amount);
    const chainFee = finiteOrZero(input.chainFee);
    const precision = (_a = input.precision) !== null && _a !== void 0 ? _a : 8;
    if (input.platformAbsorbsChainFee) {
        return {
            submitToExchange: roundTo(amount + chainFee, precision),
            destinationReceives: roundTo(amount, precision),
            platformAbsorbedFee: roundTo(chainFee, precision),
        };
    }
    return {
        submitToExchange: roundTo(amount, precision),
        destinationReceives: roundTo(Math.max(amount - chainFee, 0), precision),
        platformAbsorbedFee: 0,
    };
}
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
function requestedWithdrawAmount(row) {
    const meta = readMetadata(row === null || row === void 0 ? void 0 : row.metadata);
    const recorded = Number(meta.totalAmount);
    if (Number.isFinite(recorded) && recorded > 0)
        return recorded;
    const debit = Number(row === null || row === void 0 ? void 0 : row.amount);
    if (!Number.isFinite(debit) || debit <= 0)
        return 0;
    const metaFee = Number(meta.fee);
    const columnFee = Number(row === null || row === void 0 ? void 0 : row.fee);
    const fee = Number.isFinite(metaFee) && metaFee > 0
        ? metaFee
        : Number.isFinite(columnFee) && columnFee > 0
            ? columnFee
            : 0;
    const requested = debit - fee;
    return requested > 0 ? requested : 0;
}
function refundableDebit(row) {
    var _a;
    const meta = readMetadata(row === null || row === void 0 ? void 0 : row.metadata);
    const totalDebit = Number(meta.totalDebit);
    if (Number.isFinite(totalDebit) && totalDebit > 0)
        return totalDebit;
    const amount = Number(row === null || row === void 0 ? void 0 : row.amount);
    const fee = Number((_a = row === null || row === void 0 ? void 0 : row.fee) !== null && _a !== void 0 ? _a : 0);
    const sum = (Number.isFinite(amount) ? amount : 0) + (Number.isFinite(fee) ? fee : 0);
    return sum > 0 ? sum : 0;
}
function isIndeterminateExchangeError(error) {
    var _a, _b;
    if (!error || typeof error !== "object")
        return false;
    const name = String((_a = error.name) !== null && _a !== void 0 ? _a : "");
    if (["RequestTimeout", "NetworkError", "ExchangeNotAvailable", "OnMaintenance", "BadResponse", "SyntaxError", "TypeError", "ExchangeError", "OperationFailed"].includes(name))
        return true;
    if (name === "RateLimitExceeded" || name === "DDoSProtection")
        return false;
    const message = String((_b = error.message) !== null && _b !== void 0 ? _b : "");
    return /\b(timeout|timed out|ECONNRESET|ETIMEDOUT|EPIPE|socket hang up)\b/i.test(message);
}
