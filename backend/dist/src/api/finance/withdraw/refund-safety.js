"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wasDispatched = wasDispatched;
exports.isSafeToRefund = isSafeToRefund;
exports.resolveSettlementFee = resolveSettlementFee;
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
function wasDispatched(row) {
    if ((row === null || row === void 0 ? void 0 : row.status) === "PROCESSING")
        return true;
    if ((row === null || row === void 0 ? void 0 : row.status) === "TIMEOUT")
        return true;
    if (row === null || row === void 0 ? void 0 : row.referenceId)
        return true;
    if (row === null || row === void 0 ? void 0 : row.trxId)
        return true;
    if (row === null || row === void 0 ? void 0 : row.txHashPending)
        return true;
    const meta = readMetadata(row === null || row === void 0 ? void 0 : row.metadata);
    if (meta.dispatchedButUnconfirmed === true)
        return true;
    if (meta.providerWithdrawId)
        return true;
    if (meta.trxId || meta.withdrawalId)
        return true;
    return false;
}
function isSafeToRefund(row) {
    return !wasDispatched(row);
}
function resolveSettlementFee(row) {
    if (!row)
        return 0;
    const meta = readMetadata(row.metadata);
    for (const candidate of [meta.fee, row.fee]) {
        const value = Number(candidate);
        if (Number.isFinite(value) && value > 0)
            return value;
    }
    return 0;
}
