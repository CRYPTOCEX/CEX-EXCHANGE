"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReversalContractError = void 0;
exports.isLedgerCreditRow = isLedgerCreditRow;
exports.depositGross = depositGross;
exports.reversalAmount = reversalAmount;
exports.alreadyReversed = alreadyReversed;
exports.partialReversalAmount = partialReversalAmount;
exports.feeToWriteBack = feeToWriteBack;
exports.planReversal = planReversal;
exports.reversalIdempotencyKey = reversalIdempotencyKey;
exports.reversalReferenceId = reversalReferenceId;
exports.shortfallReferenceId = shortfallReferenceId;
exports.isReversible = isReversible;
exports.isFullReversal = isFullReversal;
class ReversalContractError extends Error {
    constructor(message) {
        super(message);
        this.name = "ReversalContractError";
    }
}
exports.ReversalContractError = ReversalContractError;
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
function isLedgerCreditRow(row) {
    var _a;
    const key = row === null || row === void 0 ? void 0 : row.idempotencyKey;
    if (typeof key === "string" && key.trim())
        return true;
    const original = Number((_a = readMetadata(row === null || row === void 0 ? void 0 : row.metadata)) === null || _a === void 0 ? void 0 : _a.originalAmount);
    return Number.isFinite(original) && original > 0;
}
function depositGross(row) {
    var _a;
    const amount = Number(row === null || row === void 0 ? void 0 : row.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new ReversalContractError(`Cannot reverse a deposit whose amount is ${String(row === null || row === void 0 ? void 0 : row.amount)}.`);
    }
    if (isLedgerCreditRow(row)) {
        return amount + feeToWriteBack(row);
    }
    const recorded = Number((_a = readMetadata(row === null || row === void 0 ? void 0 : row.metadata)) === null || _a === void 0 ? void 0 : _a.totalAmount);
    if (Number.isFinite(recorded) && recorded > 0)
        return recorded;
    return amount;
}
function reversalAmount(row) {
    const gross = depositGross(row);
    const withheld = feeToWriteBack(row);
    if (withheld > gross) {
        throw new ReversalContractError(`Deposit fee (${withheld}) exceeds its amount (${gross}); refusing to reverse.`);
    }
    return gross - withheld;
}
function alreadyReversed(row) {
    var _a;
    const n = Number((_a = readMetadata(row === null || row === void 0 ? void 0 : row.metadata)) === null || _a === void 0 ? void 0 : _a.reversedAmount);
    return Number.isFinite(n) && n > 0 ? n : 0;
}
function partialReversalAmount(input) {
    const credited = Number(input === null || input === void 0 ? void 0 : input.credited);
    const reported = Number(input === null || input === void 0 ? void 0 : input.reported);
    const done = Number(input === null || input === void 0 ? void 0 : input.alreadyReversed) || 0;
    if (!Number.isFinite(credited) || credited <= 0) {
        throw new ReversalContractError(`Cannot partially reverse a deposit that credited ${String(input === null || input === void 0 ? void 0 : input.credited)}.`);
    }
    if (!Number.isFinite(reported) || reported <= 0) {
        throw new ReversalContractError(`A partial reversal needs the reversed portion; got ${String(input === null || input === void 0 ? void 0 : input.reported)}.`);
    }
    const remaining = credited - done;
    if (remaining <= 1e-9) {
        throw new ReversalContractError(`Nothing left to reverse: ${done} of ${credited} already taken back.`);
    }
    return Math.min(reported, remaining);
}
function feeToWriteBack(row) {
    const fee = Number(row === null || row === void 0 ? void 0 : row.fee);
    return Number.isFinite(fee) && fee > 0 ? fee : 0;
}
function planReversal(input) {
    const amount = Number(input === null || input === void 0 ? void 0 : input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new ReversalContractError(`Cannot plan a reversal of ${String(input === null || input === void 0 ? void 0 : input.amount)}.`);
    }
    const raw = Number(input === null || input === void 0 ? void 0 : input.availableBalance);
    const available = Number.isFinite(raw) && raw > 0 ? raw : 0;
    const debit = Math.min(amount, available);
    const shortfall = amount - debit;
    return {
        debit,
        shortfall,
        short: shortfall > 1e-9,
    };
}
function reversalIdempotencyKey(provider, reference, kind) {
    const cleanProvider = String(provider || "").trim().toLowerCase();
    const cleanReference = String(reference || "").trim();
    if (!cleanProvider || !cleanReference) {
        throw new ReversalContractError("A reversal idempotency key needs both a provider and a payment reference.");
    }
    return `${cleanProvider}_${kind}_${cleanReference}`;
}
function reversalReferenceId(provider, reference, kind) {
    return reversalIdempotencyKey(provider, reference, kind);
}
function shortfallReferenceId(provider, reference, kind) {
    return `${reversalIdempotencyKey(provider, reference, kind)}_shortfall`;
}
function isReversible(status) {
    return String(status || "").toUpperCase() === "COMPLETED";
}
function isFullReversal(input) {
    const raw = input === null || input === void 0 ? void 0 : input.reportedAmount;
    if (raw === null || raw === undefined || raw === "")
        return true;
    const reported = Number(raw);
    if (!Number.isFinite(reported))
        return true;
    const gross = Number(input === null || input === void 0 ? void 0 : input.depositAmount);
    if (!Number.isFinite(gross) || gross <= 0)
        return false;
    return Math.abs(reported - gross) <= 0.01 + 1e-9;
}
